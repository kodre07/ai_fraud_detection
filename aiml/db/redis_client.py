"""
aiml/db/redis_client.py — Async Redis client for the Python AI service.

Queue names MUST match Node.js redisQueue.service.js exactly:
  MAIN  : fraud_scoring_queue
  RETRY : fraud_scoring_retry_queue
  DLQ   : fraud_scoring_dlq

Node.js is PRODUCER only.  Python is the SOLE CONSUMER.
"""

import asyncio
import json
import logging
import os

import redis.asyncio as aioredis
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Queue constants (mirrored from backend/src/services/redisQueue.service.js) ─
QUEUE_MAIN  = "fraud_scoring_queue"
QUEUE_RETRY = "fraud_scoring_retry_queue"
QUEUE_DLQ   = "fraud_scoring_dlq"

_redis: aioredis.Redis | None = None


def _build_url() -> str:
    """Build Redis URL from env vars (prefer REDIS_URL, fall back to HOST:PORT)."""
    return (
        os.getenv("REDIS_URL")
        or f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}"
    )


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        url = _build_url()
        _redis = aioredis.from_url(url, decode_responses=True)
        logger.info(f"✅ Redis connected: {url}")
    return _redis


async def pop_job() -> dict | None:
    """
    Non-blocking pop: retry queue has priority (mirrors Node.js popJob logic).
    Returns None if both queues are empty.
    """
    r = await get_redis()

    # Retry queue has priority — matches Node.js queueService.popJob()
    data = await r.rpop(QUEUE_RETRY)
    if not data:
        data = await r.rpop(QUEUE_MAIN)

    if not data:
        return None

    try:
        return json.loads(data)
    except json.JSONDecodeError as exc:
        logger.error(f"❌ Failed to parse job JSON: {exc} | raw={data!r}")
        return None


async def push_retry(job: dict) -> None:
    """Increment attempt counter and push to retry queue."""
    r = await get_redis()
    job = {**job, "attempt": job.get("attempt", 0) + 1, "lastRetryAt": _now_ms()}
    await r.lpush(QUEUE_RETRY, json.dumps(job))
    logger.info(f"🔁 Job {job.get('id')} retried (attempt {job['attempt']})")


async def push_dlq(job: dict) -> None:
    """Mark job as permanently failed and push to dead-letter queue."""
    r = await get_redis()
    job = {**job, "failedAt": _now_ms()}
    await r.lpush(QUEUE_DLQ, json.dumps(job))
    logger.warning(f"🚨 Job {job.get('id')} sent to DLQ")


async def queue_lengths() -> dict:
    """Return current length of all three queues (for /health endpoint)."""
    r = await get_redis()
    return {
        "main":  await r.llen(QUEUE_MAIN),
        "retry": await r.llen(QUEUE_RETRY),
        "dlq":   await r.llen(QUEUE_DLQ),
    }


async def ping() -> bool:
    try:
        r = await get_redis()
        return await r.ping()
    except Exception:
        return False


def _now_ms() -> int:
    import time
    return int(time.time() * 1000)
