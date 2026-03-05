import Transaction from "../models/Transaction.js";

/**
 * Detect shared device/IP usage
 * This exposes synthetic identity rings
 */
const resolve = async (transaction) => {
     console.log("🧠 Entity Resolution Triggered");

  try {
    const { senderId, deviceId, ipAddress } = transaction;

    /* ============================= */
    /* 1️⃣ Shared Device Detection   */
    /* ============================= */

    const deviceLinkedAccounts = await Transaction.find({
      deviceId,
      senderId: { $ne: senderId },
    }).distinct("senderId");

    if (deviceLinkedAccounts.length > 0) {
      console.log(
        `⚠️ Shared Device Detected for ${senderId}:`,
        deviceLinkedAccounts
      );
    }

    /* ============================= */
    /* 2️⃣ Shared IP Detection       */
    /* ============================= */

    const ipLinkedAccounts = await Transaction.find({
      ipAddress,
      senderId: { $ne: senderId },
    }).distinct("senderId");

    if (ipLinkedAccounts.length > 0) {
      console.log(
        `⚠️ Shared IP Detected for ${senderId}:`,
        ipLinkedAccounts
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Entity resolution error:", error);
    throw error;
  }
};

export default {
  resolve,
};