import mongoose from "mongoose";
import logger from "./logger.js";

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("✅ MongoDB connected");
  } catch (error) {
    logger.error("❌ MongoDB connection failed: " + error.message); // ✅ FIX
    process.exit(1);
  }
};

export default connectMongo;