class RedisClient:
    def __init__(self):
        # TODO: Initialize async redis connection
        pass

    async def pop_job(self):
        # TODO: return job from 'fraud:jobs'
        pass

    async def push_dlq(self, job):
        # TODO: push to 'fraud:dlq'
        pass
