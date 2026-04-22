"""
aiml/main.py — FastAPI application entry point.

Responsibilities:
  - Launch worker_loop() as a background asyncio task on startup
  - Expose GET /health  (live dependency check)
  - Expose POST /score  ⚠️ DEBUG ONLY — not called by Node.js in production

Production flow:
  Node.js  → Redis queue  →  This service (worker_loop pops jobs)  →  POST /api/ml/result  → Node.js
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Deferred imports (avoid import errors if DB not available at module load) ──
from db.redis_client  import ping as redis_ping,  queue_lengths
from db.mongo_client  import ping as mongo_ping,  get_transaction
from db.neo4j_client  import ping as neo4j_ping,  get_neighbor_count
from scoring.scorer   import route as score_transaction
from worker           import worker_loop


# ── Lifespan: start/stop worker ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting Redis worker background task…")
    task = asyncio.create_task(worker_loop())
    app.state.worker_task = task

    yield  # ← server runs here

    logger.info("🛑 Shutting down worker task…")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info("✅ Worker task cancelled cleanly")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title       = "Fraulens Analytics Engine",
    version     = "1.0.0",
    description = (
        "Fraud detection AI service.\n\n"
        "**Production flow:** Redis queue → worker_loop → POST /api/ml/result (Node.js)\n\n"
        "The `/score` endpoint is for **debug / manual testing only**."
    ),
    lifespan    = lifespan,
)

ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET", "")


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["ops"], summary="Live dependency check")
async def health_check():
    redis_ok  = await redis_ping()
    mongo_ok  = await mongo_ping()
    neo4j_ok  = await neo4j_ping()
    lengths   = await queue_lengths() if redis_ok else {}

    worker_task: asyncio.Task | None = getattr(app.state, "worker_task", None)
    worker_alive = (
        worker_task is not None
        and not worker_task.done()
    )

    all_ok = redis_ok and mongo_ok

    return {
        "status":          "ok" if all_ok else "degraded",
        "redis_connected": redis_ok,
        "mongo_connected": mongo_ok,
        "neo4j_connected": neo4j_ok,
        "worker_running":  worker_alive,
        "queue_lengths":   lengths,
    }


# ── Debug score endpoint ────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    transactionId: str


@app.post(
    "/score",
    tags=["debug"],
    summary="⚠️ DEBUG ONLY — Score one transaction directly (bypasses Redis)",
)
async def score_single(
    body: ScoreRequest,
    x_service_secret: Optional[str] = Header(None, alias="x-service-secret"),
):
    """
    Manually trigger scoring for a transaction already in MongoDB.
    This endpoint is **not** called by Node.js in production — it exists
    for local testing and debugging only.
    """
    if x_service_secret != ML_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized — wrong x-service-secret")

    transaction = await get_transaction(body.transactionId)
    if not transaction:
        raise HTTPException(
            status_code=404,
            detail=f"Transaction {body.transactionId!r} not found in MongoDB",
        )

    account_id     = transaction.get("senderId", "")
    neighbor_count = await get_neighbor_count(account_id)
    result         = score_transaction(transaction, neighbor_count)

    return {"success": True, "result": result}


# ── Standalone entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host    = "0.0.0.0",
        port    = int(os.getenv("PORT", 8000)),
        reload  = False,   # reload=True breaks lifespan tasks
        workers = 1,       # single worker — we manage concurrency with asyncio
    )
