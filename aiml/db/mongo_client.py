"""
aiml/db/mongo_client.py — Async MongoDB client using Motor.

Collections used:
  transactions  — raw transactions written by Node.js
  alerts        — fraud alerts (upsert by transactionId — idempotent)
"""

import logging
import os

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def _get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(uri)
        logger.info("✅ MongoDB Motor client initialised")
    return _client


def _get_db():
    """
    Return the default database from the connection URI.
    Atlas URIs don't embed a db name, so we use 'fraud_detection' as default.
    """
    client = _get_client()
    # If URI has a db path component Motor uses it; otherwise fall back.
    uri = os.getenv("MONGO_URI", "")
    # Extract db name from URI path (e.g. mongodb+srv://.../<dbname>?...)
    path_part = uri.split("/")[-1].split("?")[0]
    db_name = path_part if path_part and path_part != "" else "test"
    return client[db_name]


async def get_transaction(tx_id: str) -> dict | None:
    """
    Fetch a raw transaction document by its MongoDB _id string.
    Returns None if not found or on error.
    """
    db = _get_db()
    try:
        doc = await db["transactions"].find_one({"_id": ObjectId(tx_id)})
        if doc:
            doc["_id"] = str(doc["_id"])   # serialise ObjectId for downstream use
        return doc
    except Exception as exc:
        logger.error(f"❌ get_transaction({tx_id}): {exc}")
        return None


async def save_alert(alert_data: dict) -> dict | None:
    """
    Upsert an alert document keyed on transactionId — idempotent.
    Uses $setOnInsert so a second call for the same transaction is a no-op.
    The unique index on alerts.transactionId (set in Node.js Alert.js) is the
    DB-level guard; this upsert is the application-level guard.
    """
    db = _get_db()
    tx_id = alert_data.get("transactionId")
    try:
        result = await db["alerts"].find_one_and_update(
            {"transactionId": tx_id},
            {"$setOnInsert": alert_data},
            upsert=True,
            return_document=True,
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    except Exception as exc:
        logger.error(f"❌ save_alert(tx={tx_id}): {exc}")
        raise


async def ping() -> bool:
    try:
        db = _get_db()
        await db.command("ping")
        return True
    except Exception:
        return False
