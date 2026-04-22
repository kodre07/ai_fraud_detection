"""
aiml/db/neo4j_client.py — Async Neo4j client.

Used for:
  • get_neighbor_count(account_id)  — routing decision (rule/xgb/gnn)
  • update_risk_profile(...)        — write rolling stats after scoring

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
    Count transactions connected to this account in the last 30 days.

    Returns:
        ≥ 0  — number of neighbour transactions
        -1   — Neo4j error / unavailable (caller should route to rule_based)
    """
    driver = _get_driver()
    query = """
    MATCH (a:Account {id: $account_id})-[:SENT|RECEIVED]-(t:Transaction)
    WHERE t.timestamp >= datetime() - duration({days: 30})
    RETURN count(t) AS neighbor_count
    """
    try:
        async with driver.session() as session:
            result = await session.run(query, account_id=account_id)
            record = await result.single()
            return int(record["neighbor_count"]) if record else 0
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
