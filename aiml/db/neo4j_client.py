"""
aiml/db/neo4j_client.py — Async Neo4j client.

Used for:
  • get_neighbor_count(account_id)   — tx-volume count; routing decision ONLY (rule/xgb/gnn)
  • get_peer_link_count(account_id)  — shared-identifier peer count; FRAUD SIGNAL
  • get_account_subgraph(account_id) — 2-hop networkx Graph for GNN embedding
  • update_risk_profile(...)         — write rolling stats after scoring

All operations are non-fatal: errors return safe defaults so scoring continues
even when Neo4j is offline or slow (the caller also applies a timeout guard).
"""

import logging
import os

from neo4j import AsyncGraphDatabase
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_driver = None


def _get_driver():
    global _driver
    if _driver is None:
        uri      = os.getenv("NEO4J_URI",      "neo4j://127.0.0.1:7687")
        user     = os.getenv("NEO4J_USER",     "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "")
        _driver  = AsyncGraphDatabase.driver(uri, auth=(user, password))
        logger.info(f"✅ Neo4j driver initialised: {uri}")
    return _driver


async def get_neighbor_count(account_id: str) -> int:
    """
    Return a "graph depth" score based on how many transactions this account
    has PREVIOUSLY sent — excluding the current one (which is already written
    to Neo4j by Node.js BEFORE the job is pushed to Redis).

    WHY NOT SHARED_DEVICE/SHARED_IP edges:
    Entity-resolution SHARED_* edges only exist when two *different* senders
    share the same device, IP, email, or phone.  For accounts with unique
    identifiers (no cross-account overlap), those edges are NEVER written, so
    that query always returns 0 → every transaction scores via rule_based (PATH A).

    Counting prior SENT transactions is reliable and always-growing:
        tx #1  → prior = 0  → PATH A  (rule_based)
        tx #2  → prior = 1  → PATH B  (xgboost)
        tx #3  → prior = 2  → PATH B  (xgboost)
        tx #4+ → prior = 3+ → PATH C  (gnn_hybrid_fallback)

    The SENT edge for the CURRENT transaction is already in Neo4j when Python
    scores it, so we subtract 1 to get the prior-only count.

    Routing table (matches scoring/scorer.py _THRESH_RULE / _THRESH_XGB):
        -1  → Neo4j error / unavailable → rule_based  (PATH A)
         0  → first transaction ever    → rule_based  (PATH A)
        1-2 → sparse history            → xgboost     (PATH B)
        >= 3→ established account       → gnn_hybrid  (PATH C)

    Returns:
        >= 0  — number of prior transactions (0 = this is the first)
        -1    — Neo4j error / unavailable (caller routes to rule_based)
    """
    driver = _get_driver()
    query = """
    MATCH (a:Account {id: $account_id})-[:SENT]->(t:Transaction)
    WITH count(t) AS total
    RETURN CASE WHEN total > 0 THEN total - 1 ELSE 0 END AS neighbor_count
    """
    try:
        async with driver.session() as session:
            result = await session.run(query, account_id=account_id)
            record = await result.single()
            count = int(record["neighbor_count"]) if record else 0
            logger.info(f"📊 Neo4j neighbor count for '{account_id}': {count}")
            return count
    except Exception as exc:
        logger.warning(f"⚠️ Neo4j get_neighbor_count({account_id}): {exc}")
        return -1  # sentinel → caller routes to rule_based


async def update_risk_profile(account_id: str, stats: dict) -> None:
    """
    Merge/update Account risk-profile properties.
    Non-fatal — a failed write does not retry or raise.

    Expected stats keys:
        avg_score_7d, avg_score_30d, peak_score, risk_velocity
    """
    driver = _get_driver()
    query = """
    MERGE (a:Account {id: $account_id})
    SET
      a.avg_score_7d  = $avg_score_7d,
      a.avg_score_30d = $avg_score_30d,
      a.peak_score    = $peak_score,
      a.risk_velocity = $risk_velocity,
      a.last_updated  = datetime()
    """
    try:
        async with driver.session() as session:
            await session.run(
                query,
                account_id    = account_id,
                avg_score_7d  = stats.get("avg_score_7d",  0.0),
                avg_score_30d = stats.get("avg_score_30d", 0.0),
                peak_score    = stats.get("peak_score",    0.0),
                risk_velocity = stats.get("risk_velocity", 0.0),
            )
        logger.debug(f"📊 Neo4j risk profile updated for {account_id}")
    except Exception as exc:
        logger.warning(f"⚠️ Neo4j update_risk_profile({account_id}): {exc}")
        # Non-fatal — scoring already complete


async def ping() -> bool:
    try:
        driver = _get_driver()
        async with driver.session() as session:
            await session.run("RETURN 1")
        return True
    except Exception:
        return False


async def get_peer_link_count(
    account_id: str,
    min_confidence: float = 0.3,
) -> int:
    """
    Count *other* accounts that share a device, IP, email, or phone with
    this account, filtered to edges whose confidence >= min_confidence.

    This is a FRAUD SIGNAL — unusual cross-account sharing suggests a
    synthetic-identity or mule-account syndicate.

    It is intentionally separate from get_neighbor_count(), which counts
    transaction volume and is used only for routing-path selection.

    Returns:
        >= 0  — number of peer-linked accounts (0 on error; safe default)
    """
    driver = _get_driver()
    query = """
    MATCH (a:Account {id: $account_id})
          -[r:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-
          (b:Account)
    WHERE r.confidence >= $min_conf
    RETURN count(DISTINCT b) AS peer_count
    """
    try:
        async with driver.session() as session:
            result = await session.run(
                query, account_id=account_id, min_conf=min_confidence
            )
            record = await result.single()
            count = int(record["peer_count"]) if record else 0
            logger.info(
                f"📊 Neo4j peer_link_count for '{account_id}': {count} (min_confidence=0.3)"
            )
            return count
    except Exception as exc:
        logger.warning(f"\u26a0\ufe0f Neo4j get_peer_link_count({account_id}): {exc}")
        return 0  # safe default — no spurious peer penalty on Neo4j error


async def verify_shared_edges() -> None:
    """
    Diagnostic helper — run three Cypher queries and log results at INFO level.

    Query 1: Count all SHARED_* edges by type.
    Query 2: Sample linked account pairs with confidence (top 20).
    Query 3: Count accounts with at least one peer link above the 0.3 threshold.

    Called automatically every 10 completed jobs by worker.py for ongoing
    visibility without flooding logs on every transaction.
    """
    driver = _get_driver()

    q1 = """
    MATCH ()-[r:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-()
    RETURN type(r) AS type, count(r) AS count
    ORDER BY count DESC
    """
    q2 = """
    MATCH (a:Account)-[r:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-(b:Account)
    RETURN a.id AS account_a, b.id AS account_b, type(r) AS link_type,
           r.confidence AS confidence
    ORDER BY r.confidence DESC
    LIMIT 20
    """
    q3 = """
    MATCH (a:Account)-[r:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-(b:Account)
    WHERE r.confidence >= 0.3
    RETURN count(DISTINCT a.id) AS linked_accounts
    """

    try:
        async with driver.session() as session:
            # Query 1
            res1 = await session.run(q1)
            q1_result = [{"type": r["type"], "count": r["count"]} async for r in res1]
            logger.info(f"[neo4j] SHARED edge counts: {q1_result}")

            # Query 2
            res2 = await session.run(q2)
            q2_result = [
                {
                    "account_a":  r["account_a"],
                    "account_b":  r["account_b"],
                    "link_type":  r["link_type"],
                    "confidence": r["confidence"],
                }
                async for r in res2
            ]
            logger.info(f"[neo4j] Sample linked pairs: {q2_result}")

            # Query 3
            res3 = await session.run(q3)
            rec3 = await res3.single()
            q3_result = int(rec3["linked_accounts"]) if rec3 else 0
            logger.info(
                f"[neo4j] Accounts with peer links (conf>=0.3): {q3_result}"
            )
    except Exception as exc:
        logger.warning(f"⚠️ Neo4j verify_shared_edges: {exc}")


async def get_account_subgraph(account_id: str):
    """
    Build and return a 2-hop networkx.Graph centred on account_id for GNN
    embedding in PATH C (graph/extractor.py generate_embedding_real).

    Node naming conventions match graph/extractor.py graph_to_pyg():
        Account node    : A_{account_id}
        Transaction node: T_{tx_id}

    On any Neo4j error a minimal single-node graph is returned so the GNN
    path degrades gracefully (generate_embedding_real returns zeros).
    """
    import networkx as nx

    G = nx.Graph()
    account_node = f"A_{account_id}"
    G.add_node(account_node, type="account")

    driver = _get_driver()

    # 1-hop: this account's own sent transactions
    q_own = """
    MATCH (a:Account {id: $account_id})-[:SENT]->(t:Transaction)
    RETURN t.id AS tx_id
    LIMIT 50
    """
    # 2-hop: peer accounts (shared identifiers) + their transactions
    q_peers = """
    MATCH (a:Account {id: $account_id})
          -[:SHARED_DEVICE|SHARED_IP|SHARED_EMAIL|SHARED_PHONE]-
          (b:Account)
    OPTIONAL MATCH (b)-[:SENT]->(t2:Transaction)
    RETURN b.id AS peer_id, collect(t2.id) AS peer_tx_ids
    LIMIT 20
    """
    try:
        async with driver.session() as session:
            # Own transactions
            result = await session.run(q_own, account_id=account_id)
            async for record in result:
                tx_id = record["tx_id"]
                if tx_id:
                    tx_node = f"T_{tx_id}"
                    G.add_node(tx_node, type="transaction")
                    G.add_edge(account_node, tx_node)

            # Peer accounts and their transactions
            result2 = await session.run(q_peers, account_id=account_id)
            async for record in result2:
                peer_id = record["peer_id"]
                if peer_id:
                    peer_node = f"A_{peer_id}"
                    G.add_node(peer_node, type="account")
                    G.add_edge(account_node, peer_node)
                    for ptx_id in record["peer_tx_ids"] or []:
                        if ptx_id:
                            ptx_node = f"T_{ptx_id}"
                            G.add_node(ptx_node, type="transaction")
                            G.add_edge(peer_node, ptx_node)
    except Exception as exc:
        logger.warning(
            f"\u26a0\ufe0f Neo4j get_account_subgraph({account_id}): {exc} — "
            "returning minimal graph (GNN will use zero embedding)"
        )

    logger.debug(
        f"\U0001f578\ufe0f  Subgraph for '{account_id}': "
        f"{G.number_of_nodes()} nodes, {G.number_of_edges()} edges"
    )
    return G
