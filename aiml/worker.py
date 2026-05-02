"""
aiml/worker.py — Redis consumer loop for the Python AI service.

This is the SOLE Redis consumer. Node.js (ml.worker.js) is producer-only.

Job lifecycle per iteration:
  1.  Pop job from Redis (retry queue has priority over main queue)
  2.  Fetch raw transaction document from MongoDB
  3.  Get account neighbour count from Neo4j  (400 ms timeout built into scorer)
  4.  Score via scoring.scorer.route()
  5.  POST result to Node.js  POST /api/ml/result   [x-service-secret header]
  6.  On failure: retry up to MAX_RETRIES times, then push to DLQ

Environment variables used (from .env):
  BACKEND_URL        — Node.js base URL   (default: http://localhost:5000)
  ML_SERVICE_SECRET  — Shared secret for the callback endpoint
"""

import asyncio
import logging
import os
from collections import defaultdict

import httpx
from dotenv import load_dotenv

load_dotenv()

from db.redis_client  import pop_job, push_retry, push_dlq
from db.mongo_client  import get_transaction
from db.neo4j_client  import (
    get_neighbor_count,
    get_peer_link_count,
    get_account_subgraph,
    verify_shared_edges,
)
# update_risk_profile is intentionally NOT called here.
# Node.js ml.service.js computes real rolling averages (avg_7d, avg_30d, peak,
# velocity) from ScoreHistory AFTER the callback and writes them to Neo4j.
# Python writing a single current score to those fields would overwrite the
# correct rolling values.
from scoring.scorer   import route as score_transaction

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
BACKEND_URL       = os.getenv("BACKEND_URL",       "http://localhost:5000")
ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET", "")
MAX_RETRIES       = 3
POLL_INTERVAL_S   = 1.0    # idle sleep when queue is empty
CALLBACK_TIMEOUT  = 10.0   # seconds for HTTP POST to Node.js
VERIFY_INTERVAL   = 10     # call verify_shared_edges() every N completed jobs

# ── Zero-peer fallback ─────────────────────────────────────────────────────────
# When Neo4j is empty or not reachable, get_peer_link_count() returns 0.
# Treating every transaction as peer_count=0 collapses ALL routing to the
# cold-start PATH A (rule_based) and prevents graph adjustments from firing.
# Instead, substitute this configurable default so scoring stays on PATH B/C
# for accounts that have transaction history.  A warning is logged so ops can
# distinguish a genuine isolated account (rare) from a DB connectivity issue.
DEFAULT_PEER_COUNT: int = int(os.getenv("DEFAULT_PEER_COUNT", "3"))

# How many consecutive zero-peer results before we emit the connectivity warning.
# (Avoids spamming the log for the very first transaction on a genuinely new account.)
_ZERO_PEER_WARN_THRESHOLD: int = 3
_zero_peer_streak: int = 0   # module-level counter; reset on any non-zero result


# ── Fix C: In-memory ring-sharing caches (module-level) ───────────────────────
# These rolling dicts track which sender accounts have been seen using each
# IP address / device ID.  They let the scorer detect shared-identifier fraud
# rings independently of Neo4j edge timing (race condition where early-processed
# accounts see peer_count=0 before their peers are scored).
#
# ip_sender_cache[ip]      -> set of senderId strings seen for that IP
# device_sender_cache[dev] -> set of senderId strings seen for that device
#
# Grow monotonically for the lifetime of the process (no expiry in v5).
# For production use a Redis HyperLogLog or TTL-keyed set; sufficient for
# the batch-test scenario where all transactions are scored in one session.
ip_sender_cache: defaultdict     = defaultdict(set)   # ip     -> {senderId, ...}
device_sender_cache: defaultdict = defaultdict(set)   # device -> {senderId, ...}


# ── Callback to Node.js ────────────────────────────────────────────────────────

async def _post_result(result: dict) -> None:
    """
    POST scoring result to Node.js  POST /api/ml/result.

    Maps scorer output keys → Node.js ml.controller expected body:
        score           → score
        risk_level      → risk_level
        method          → method_used
        confidence      → confidence_score
        shap_values     → shapExplanation
        suspicious_paths→ suspiciousPaths
    """
    payload = {
        "transactionId":    result["transaction_id"],
        "score":            result["score"],
        "risk_level":       result["risk_level"],
        "method_used":      result["method"],
        "confidence_score": result["confidence"],
        "shapExplanation":  result["shap_values"],
        "suspiciousPaths":  result["suspicious_paths"],
    }

    url     = f"{BACKEND_URL}/api/ml/result"
    headers = {
        "Content-Type":     "application/json",
        "x-service-secret": ML_SERVICE_SECRET,
    }

    async with httpx.AsyncClient(timeout=CALLBACK_TIMEOUT) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()

    logger.info(
        f"📤 Result posted → tx={result['transaction_id']} "
        f"score={result['score']:.4f} risk={result['risk_level']} "
        f"method={result['method']}"
    )


# ── Single-job processor ───────────────────────────────────────────────────────

async def _process_job(job: dict) -> None:
    """
    End-to-end processing for one job.
    Raises on any failure so the caller can apply retry/DLQ logic.
    """
    tx_id   = job.get("transactionId", "")
    attempt = job.get("attempt", 0)

    logger.info(f"🔄 Job {job.get('id')} | tx={tx_id} | attempt={attempt}")

    # 1. Fetch transaction from MongoDB
    transaction = await get_transaction(tx_id)
    if not transaction:
        raise ValueError(f"Transaction {tx_id} not found in MongoDB")

    # 2. Get routing count from Neo4j (transaction volume — path selection ONLY).
    #    Neo4j errors return -1; scorer routes that to rule_based automatically.
    account_id    = transaction.get("senderId", "")
    routing_count = await get_neighbor_count(account_id)

    # 3. Get peer-link count (shared-identifier fraud signal) and 2-hop subgraph
    #    for GNN embedding.  Both are non-fatal and return safe defaults on error.
    peer_count = await get_peer_link_count(account_id)
    subgraph   = await get_account_subgraph(account_id)

    # ── Change 10: Zero-peer fallback ─────────────────────────────────────────
    # If peer_count is 0, it may indicate Neo4j is empty/not connected rather
    # than a genuinely isolated account.  Track a streak; after
    # _ZERO_PEER_WARN_THRESHOLD consecutive zeros, warn ops and substitute
    # DEFAULT_PEER_COUNT so routing doesn't silently collapse to PATH A.
    global _zero_peer_streak
    if peer_count == 0:
        _zero_peer_streak += 1
        if _zero_peer_streak >= _ZERO_PEER_WARN_THRESHOLD:
            logger.warning(
                f"⚠️  peer_count=0 for {_zero_peer_streak} consecutive transactions "
                f"(latest: account={account_id}, tx={tx_id}). "
                "This may indicate a Neo4j connectivity or data issue rather than "
                "genuine account isolation. "
                f"Substituting DEFAULT_PEER_COUNT={DEFAULT_PEER_COUNT} for scoring."
            )
            peer_count = DEFAULT_PEER_COUNT
    else:
        _zero_peer_streak = 0   # reset on any non-zero result

    # ── Fix B: Inject routing_count as _neighbor_count into tx payload ─────────
    # scorer._collect_fraud_signals() reads tx["_neighbor_count"] to fire the
    # graph_linked / graph_linked_strong signals independently of Neo4j peer-link
    # timing (avoids race condition for early-processed ring accounts).
    transaction["_neighbor_count"] = routing_count

    # ── Fix C: Update IP/device ring caches, inject peer counts into tx ─────────
    ip     = (transaction.get("ipAddress") or "").strip()
    device = (transaction.get("deviceId")  or "").strip().lower()
    sender = account_id

    # Update caches BEFORE reading counts so the current tx's sender is included.
    if ip and ip.lower() not in ("nan", "none", "null", ""):
        ip_sender_cache[ip].add(sender)
        shared_ip_peer_count = len(ip_sender_cache[ip]) - 1   # exclude self
    else:
        shared_ip_peer_count = 0

    if device and device not in ("nan", "none", "null", ""):
        device_sender_cache[device].add(sender)
        shared_device_peer_count = len(device_sender_cache[device]) - 1   # exclude self
    else:
        shared_device_peer_count = 0

    transaction["shared_ip_peer_count"]     = shared_ip_peer_count
    transaction["shared_device_peer_count"] = shared_device_peer_count

    if shared_ip_peer_count > 0:
        logger.info(
            f"🚨 Ring cache — ip={ip!r} shared by {shared_ip_peer_count} other sender(s) "
            f"(account={account_id})"
        )
    if shared_device_peer_count > 0:
        logger.info(
            f"🚨 Ring cache — device={device!r} shared by {shared_device_peer_count} other sender(s) "
            f"(account={account_id})"
        )

    # 4. Score
    result = score_transaction(transaction, routing_count, peer_count, subgraph)

    # 5. POST result to Node.js callback
    await _post_result(result)

    # 6. Neo4j risk profile update is handled by Node.js ml.service.js.
    #    After receiving the callback at POST /api/ml/result, Node.js queries
    #    ScoreHistory to compute real rolling averages and writes them to Neo4j.
    #    Writing avg_score_7d = current_score here would overwrite those values.
    logger.debug(f"⏭️  Neo4j risk profile update delegated to Node.js for {account_id}")


# ── Retry / DLQ wrapper ────────────────────────────────────────────────────────

async def _handle_job(job: dict) -> None:
    attempt = job.get("attempt", 0)
    try:
        await _process_job(job)
    except Exception as exc:
        logger.error(f"❌ Job {job.get('id')} failed (attempt {attempt}): {exc}")

        if attempt < MAX_RETRIES:
            await push_retry(job)
            logger.info(
                f"🔁 Job {job.get('id')} queued for retry as attempt {attempt + 1}"
            )
        else:
            await push_dlq(job)
            logger.error(
                f"🚨 Job {job.get('id')} exhausted {MAX_RETRIES} retries — sent to DLQ"
            )


# ── Main worker loop ───────────────────────────────────────────────────────────

async def worker_loop() -> None:
    """
    Continuously pop and process jobs from Redis.
    Called as a background asyncio task by FastAPI on startup (lifespan).
    Also works when this file is run directly: python worker.py
    """
    logger.info(
        "🧠 Python AI worker started\n"
        f"   → Polling Redis every {POLL_INTERVAL_S}s when idle\n"
        f"   → Callback URL: {BACKEND_URL}/api/ml/result\n"
        f"   → Max retries: {MAX_RETRIES}\n"
        f"   → verify_shared_edges every {VERIFY_INTERVAL} completed jobs"
    )

    jobs_completed = 0  # tracks completed jobs; triggers verify_shared_edges

    while True:
        try:
            job = await pop_job()

            if job is None:
                await asyncio.sleep(POLL_INTERVAL_S)
                continue

            # Fire-and-forget: do not await, keep loop responsive
            jobs_completed += 1
            asyncio.create_task(_handle_job(job))

            # Every VERIFY_INTERVAL completed jobs, run the graph diagnostics
            if jobs_completed % VERIFY_INTERVAL == 0:
                logger.info(
                    f"[worker] {jobs_completed} jobs processed — "
                    "running verify_shared_edges()"
                )
                asyncio.create_task(verify_shared_edges())

        except asyncio.CancelledError:
            logger.info("🛑 Worker loop cancelled — shutting down")
            break
        except Exception as exc:
            logger.error(f"❌ Worker loop error: {exc}")
            await asyncio.sleep(POLL_INTERVAL_S)


# ── Standalone entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import logging as _logging
    _logging.basicConfig(
        level=_logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(worker_loop())
