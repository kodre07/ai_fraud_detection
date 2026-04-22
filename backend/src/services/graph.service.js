import { getNeo4jDriver, isNeo4jAvailable } from "../config/neo4j.js";

/* ─────────────────────────────────────────────────────────────────────────────
 * GUARD HELPER
 * All three graph functions call this first.
 * If Neo4j never connected (isNeo4jAvailable() === false), they log once and
 * return silently — no crash, no ripple to the transaction pipeline.
 * ───────────────────────────────────────────────────────────────────────────── */

const _guard = (fnName) => {
  if (!isNeo4jAvailable()) {
    console.warn(`⚠️  [graph.service] ${fnName} skipped — Neo4j is offline`);
    return false;      // tell caller to bail
  }
  return true;         // Neo4j is up, proceed
};

/* ============================= */
/* 1️⃣ CREATE TRANSACTION GRAPH  */
/* ============================= */

const createTransactionGraph = async (transaction) => {
  if (!_guard("createTransactionGraph")) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    /* 🔥 30-DAY FILTER — only recent transactions go into the graph */
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const txTime = new Date(transaction.timestamp ?? new Date()).getTime();

    if (now - txTime > THIRTY_DAYS) {
      console.log("⏳ [graph.service] Skipping old transaction (>30 days)");
      return;
    }

    /* Core account + transaction nodes */
    await session.run(
      `
      MERGE (s:Account {id: $senderId})
      MERGE (r:Account {id: $receiverId})
      MERGE (t:Transaction {id: $transactionId})
      SET t.amount    = $amount,
          t.timestamp = $timestamp

      MERGE (s)-[:SENT]->(t)
      MERGE (t)-[:RECEIVED]->(r)

      MERGE (s)-[:MADE]->(t)
      MERGE (t)-[:TO]->(r)
      `,
      {
        senderId: transaction.senderId,
        receiverId: transaction.receiverId,
        transactionId: transaction._id.toString(),
        amount: transaction.amount,
        timestamp: transaction.timestamp?.toISOString() ?? new Date().toISOString(),
      }
    );

    /* Device node */
    if (transaction.deviceId) {
      await session.run(
        `
        MERGE (s:Account {id: $senderId})
        MERGE (d:Device  {id: $deviceId})
        MERGE (s)-[:USES_DEVICE]->(d)
        `,
        { senderId: transaction.senderId, deviceId: transaction.deviceId }
      );
    }

    /* IP node */
    if (transaction.ipAddress) {
      await session.run(
        `
        MERGE (s:Account {id: $senderId})
        MERGE (ip:IP {address: $ipAddress})
        MERGE (s)-[:USES_IP]->(ip)
        `,
        { senderId: transaction.senderId, ipAddress: transaction.ipAddress }
      );
    }

    /* Golden entity node */
    if (transaction.goldenId) {
      await session.run(
        `
        MERGE (g:GoldenEntity {id: $goldenId})
        MERGE (a:Account      {id: $accountId})
        MERGE (a)-[:BELONGS_TO]->(g)
        `,
        { goldenId: transaction.goldenId, accountId: transaction.senderId }
      );
    }

    console.log("🧠 [graph.service] Transaction graph updated");
  } catch (error) {
    console.error("❌ [graph.service] createTransactionGraph error:", error.message);
    // Non-fatal — transaction pipeline must not break on graph errors
  } finally {
    await session.close();
  }
};

/* ============================= */
/* 2️⃣ UPDATE ACCOUNT RISK PROFILE */
/* ============================= */

/**
 * Called from ml.service.js AFTER computeRiskStats().
 * stats = { avg7, avg30, peak, riskVelocity, last5Scores }
 * These are REAL rolling averages computed from ScoreHistory in MongoDB —
 * not the single current score. This is the only correct writer of Neo4j
 * risk profile fields. Python's worker.py no longer writes to these fields.
 */
const updateAccountRiskProfile = async (accountId, stats) => {
  if (!_guard("updateAccountRiskProfile")) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (a:Account {id: $accountId})
      SET
        a.avg_score_7d  = $avg7,
        a.avg_score_30d = $avg30,
        a.peak_score    = $peak,
        a.risk_velocity = $riskVelocity,
        a.last_5_scores = $last5Scores,
        a.last_updated  = datetime()
      `,
      {
        accountId,
        avg7: stats.avg7,
        avg30: stats.avg30,
        peak: stats.peak,
        riskVelocity: stats.riskVelocity,
        last5Scores: stats.last5Scores,
      }
    );

    console.log(`📊 [graph.service] Risk profile updated for ${accountId}`);
  } catch (error) {
    console.error("❌ [graph.service] updateAccountRiskProfile error:", error.message);
    // Non-fatal — scoring already complete
  } finally {
    await session.close();
  }
};

/* ============================= */
/* 3️⃣ ENTITY RELATIONSHIPS       */
/* ============================= */

const updateEntityRelationships = async (transaction) => {
  if (!_guard("updateEntityRelationships")) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const { senderId, entityResolution } = transaction;

    if (!entityResolution?.links?.length) return;

    for (const { type, linkedAccountId, confidence, linkValue } of entityResolution.links) {
      let query = "";

      if (type === "SHARED_DEVICE") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (d:Device  {id: $linkValue})
          MERGE (a)-[r:SHARED_DEVICE]->(d) SET r.confidence = $confidence
          MERGE (b)-[:USES_DEVICE]->(d)
        `;
      } else if (type === "SHARED_IP") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (ip:IP {address: $linkValue})
          MERGE (a)-[r:SHARED_IP]->(ip) SET r.confidence = $confidence
          MERGE (b)-[:USES_IP]->(ip)
        `;
      } else if (type === "SHARED_EMAIL") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (e:Email {value: $linkValue})
          MERGE (a)-[r:SHARED_EMAIL]->(e) SET r.confidence = $confidence
          MERGE (b)-[:USES_EMAIL]->(e)
        `;
      } else if (type === "SHARED_PHONE") {
        query = `
          MERGE (a:Account {id: $senderId})
          MERGE (b:Account {id: $linkedAccountId})
          MERGE (p:Phone {number: $linkValue})
          MERGE (a)-[r:SHARED_PHONE]->(p) SET r.confidence = $confidence
          MERGE (b)-[:USES_PHONE]->(p)
        `;
      }

      if (query) {
        await session.run(query, { senderId, linkedAccountId, confidence, linkValue });
      }
    }

    console.log("🔗 [graph.service] Entity relationships updated");
  } catch (error) {
    console.error("❌ [graph.service] updateEntityRelationships error:", error.message);
  } finally {
    await session.close();
  }
};

/* ============================= */
/* EXPORTS                       */
/* ============================= */

export default {
  createTransactionGraph,
  updateAccountRiskProfile,
  updateEntityRelationships,
};