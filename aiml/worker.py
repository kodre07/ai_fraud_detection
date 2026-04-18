import asyncio
import json
import logging
import traceback

logger = logging.getLogger(__name__)

async def process_job(job_data):
    """
    Process a single scoring job from the Redis queue.
    """
    try:
        transaction = json.loads(job_data)
        # TODO: Import router.py and process transaction
        # result = process_transaction(transaction)
        # TODO: Save result to MongoDB
        logger.info(f"Processed TransactionID: {transaction.get('TransactionID')}")
    except Exception as e:
        logger.error(f"Error processing job: {e}")
        # TODO: Push to retry queue or DLQ
        traceback.print_exc()

async def worker_loop():
    logger.info("Worker started, listening to queue...")
    while True:
        # TODO: Pop from redis 'fraud:jobs'
        await asyncio.sleep(1)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(worker_loop())
