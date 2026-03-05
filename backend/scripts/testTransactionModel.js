import mongoose from "mongoose";
import dotenv from "dotenv";
import Transaction from "../src/models/Transaction.js";
import connectMongo from "../src/config/mongo.js";

dotenv.config();

const testTransactionInsert = async () => {
  try {
    await connectMongo();

    const transaction = await Transaction.create({
      senderId: "U1001",
      receiverId: "U2002",
      amount: 1500.75,
      timestamp: new Date(),
    });

    console.log("✅ Transaction inserted successfully:");
    console.log(transaction);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting transaction:");
    console.error(error);
    process.exit(1);
  }
};

testTransactionInsert();