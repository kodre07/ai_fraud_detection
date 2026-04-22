import { createClient } from "redis";
import logger from "./logger.js";

// Build Redis URL from REDIS_URL (preferred) or REDIS_HOST + REDIS_PORT pair.
// .env sets REDIS_HOST=localhost and REDIS_PORT=6379; Docker/prod can override with REDIS_URL.
const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

const redisClient = createClient({
  url: redisUrl,
});

redisClient.on("error", (err) => {
  logger.error("Redis Error: " + err.message);
});

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info("Redis connected");
};

export default redisClient;