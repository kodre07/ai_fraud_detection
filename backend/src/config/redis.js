import { createClient } from "redis";
import logger from "./logger.js";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  logger.error("Redis Error: " + err.message);
});

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info("Redis connected");
};

export default redisClient;