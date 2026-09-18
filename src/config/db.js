const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in .env");
    }
    await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
