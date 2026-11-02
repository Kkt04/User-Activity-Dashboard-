const mongoose = require("mongoose");

/**
 * Global cache for Mongoose connection in serverless environments (Vercel).
 * Prevents multiple connections per function invocation.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error(
      "MONGO_URI environment variable is not defined. Please add it in Vercel Project Settings -> Environment Variables."
    );
  }

  // Detect if someone mistakenly used localhost on Vercel
  if (process.env.VERCEL && (uri.includes("localhost") || uri.includes("127.0.0.1"))) {
    throw new Error(
      "MONGO_URI points to localhost/127.0.0.1. Vercel cloud serverless functions cannot reach your local machine. Please use a cloud MongoDB Atlas connection string (mongodb+srv://...)."
    );
  }

  // If already connected, reuse connection
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        console.log(`[DB] MongoDB connected -> ${mongooseInstance.connection.name}`);
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        let hint = err.message;
        if (err.message.includes("bad auth") || err.message.includes("Authentication failed")) {
          hint += " (Authentication failed: verify your MongoDB Atlas username and password. If your password has special characters like @, #, $, URL-encode them).";
        } else if (err.message.includes("ETIMEDOUT") || err.message.includes("querySrv ENOTFOUND") || err.message.includes("Server selection timed out")) {
          hint += " (Network timeout: ensure MongoDB Atlas -> Network Access has IP Access List set to 0.0.0.0/0 to allow connections from Vercel).";
        }
        throw new Error(hint);
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
