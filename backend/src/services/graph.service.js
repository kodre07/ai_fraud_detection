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
          t.timestamp = $timestamp,
          t.senderId  = $senderId,
          t.receiverId = $receiverId

      MERGE (s)-[:SENT]->(t)
      MERGE (t)-[:RECEIVED]->(r)
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

/* ═══════════════════════════════════════════════════════════════════════════════
 * 3️⃣  UPDATE ENTITY RELATIONSHIPS  (Account ↔ Account direct edges)
 *
 * Strategy
 * --------
 * For each entityResolution link we MERGE a DIRECT relationship between the
 * two Account nodes (senderId ↔ linkedAccountId).  This is what makes the
 * neighbor-count query work for hybrid fraud scoring.
 *
 * We intentionally do NOT route through Device/IP/Email/Phone intermediary
 * nodes here — those are written by createTransactionGraph separately.
 *
 * Idempotency guarantees
 * ----------------------
 *  ON CREATE  → write firstSeen, confidence, linkValue, weight, updatedAt
 *  ON MATCH   → update confidence to MAX(old, new), updatedAt; never touch firstSeen
 *
 * Safety
 * ------
 *  • Self-link guard  (senderId === linkedAccountId → skip)
 *  • Per-link type validation (only the four known types)
 *  • Per-link data validation (linkedAccountId present, confidence is finite ≥ 0)
 *  • Neo4j offline → silent return via _guard
 *  • Any Cypher error per link is caught and logged; the loop continues
 * ═══════════════════════════════════════════════════════════════════════════════ */

/** Allowed relationship types that map directly to Cypher rel-type names. */
const ALLOWED_REL_TYPES = new Set([
  "SHARED_DEVICE",
  "SHARED_IP",
  "SHARED_EMAIL",
  "SHARED_PHONE",
]);

const updateEntityRelationships = async (transaction) => {
  if (!_guard("updateEntityRelationships")) return;

  const { senderId, entityResolution } = transaction;

  /* Nothing to do */
  if (!senderId || !entityResolution?.links?.length) return;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    for (const link of entityResolution.links) {
      const { type, linkedAccountId, confidence, linkValue } = link ?? {};

      /* ── Per-link validation ──────────────────────────────────────────── */
      if (!ALLOWED_REL_TYPES.has(type)) {
        console.warn(`⚠️  [graph.service] Unknown link type "${type}" — skipped`);
        continue;
      }

      if (!linkedAccountId) {
        console.warn(`⚠️  [graph.service] Missing linkedAccountId for type ${type} — skipped`);
        continue;
      }

      if (typeof confidence !== "number" || !isFinite(confidence)) {
        console.warn(
          `⚠️  [graph.service] Invalid confidence "${confidence}" for ${type} — skipped`
        );
        continue;
      }

      /* ── Self-link guard ─────────────────────────────────────────────── */
      if (senderId === linkedAccountId) {
        console.warn(`⚠️  [graph.service] Self-link detected for account "${senderId}" — skipped`);
        continue;
      }

      /* ── Build Cypher query with dynamic rel-type ─────────────────────
       * Neo4j does not allow parameterising relationship type names, so
       * we inject the (allowlisted) type as a string literal.
       * MERGE uses an undirected pattern (a)-[r:TYPE]-(b) so the edge is
       * traversable from either direction — required for neighbor queries.
       * ─────────────────────────────────────────────────────────────────── */
      const cypher = `
        MERGE (a:Account {id: $senderId})
        MERGE (b:Account {id: $linkedAccountId})

        MERGE (a)-[r:${type}]-(b)

        ON CREATE SET
          r.confidence = $confidence,
          r.linkValue  = $linkValue,
          r.weight     = $weight,
          r.firstSeen  = datetime(),
          r.updatedAt  = datetime()

        ON MATCH SET
          r.confidence = CASE
                           WHEN r.confidence < $confidence THEN $confidence
                           ELSE r.confidence
                         END,
          r.weight     = CASE
                           WHEN r.confidence < $confidence THEN $weight
                           ELSE r.weight
                         END,
          r.updatedAt  = datetime()
      `;

      try {
        await session.run(cypher, {
          senderId,
          linkedAccountId,
          confidence,
          linkValue: linkValue ?? null,
          weight: Math.round(confidence * 100),
        });

        console.log(
          `  🔗 [graph.service] ${type}: "${senderId}" ↔ "${linkedAccountId}" (confidence: ${confidence})`
        );
      } catch (linkErr) {
        /* Non-fatal — log and continue the loop */
        console.error(
          `  ❌ [graph.service] Failed to MERGE ${type} link: ${linkErr.message}`
        );
      }
    }

    console.log("✅ [graph.service] Entity relationships pass complete");
  } catch (error) {
    console.error("❌ [graph.service] updateEntityRelationships outer error:", error.message);
  } finally {
    await session.close();
  }
};

/* ═══════════════════════════════════════════════════════════════════════════════
 * 4️⃣  GET NEIGHBOR COUNT
 *
 * Returns the number of DISTINCT Account nodes connected to $accountId via any
 * entity-resolution relationship that carries confidence ≥ 0.5.
 *
 * Used by the Python hybrid scorer to decide whether to apply GNN weighting.
 * Returns -1 when Neo4j is unavailable (scorer falls back to tabular-only).
 * ═══════════════════════════════════════════════════════════════════════════════ */

const getNeighborCount = async (accountId) => {
  if (!_guard("getNeighborCount")) return -1;

  if (!accountId) return -1;

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (a:Account {id: $id})-[r:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-(n:Account)
      WHERE r.confidence >= 0.5
      RETURN count(DISTINCT n) AS neighbors
      `,
      { id: accountId }
    );

    const record = result.records[0];
    if (!record) return 0;

    /* Neo4j integers come back as a Neo4j Integer object — convert safely */
    const raw = record.get("neighbors");
    const count = typeof raw?.toNumber === "function" ? raw.toNumber() : Number(raw ?? 0);

    console.log(`📊 [graph.service] Neighbor count for "${accountId}": ${count}`);
    return count;
  } catch (error) {
    console.error("❌ [graph.service] getNeighborCount error:", error.message);
    return -1;  // sentinel: Python scorer treats -1 as "graph unavailable"
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
  getNeighborCount,
};