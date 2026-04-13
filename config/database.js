import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const useSSL = String(process.env.DB_SSL || "").toLowerCase() === "true";
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: useSSL
    ? { rejectUnauthorized }
    : false,
});

// Connect to database
client.connect()
  .then(() => {
    console.log("✅ Connected to PostgreSQL database");
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err);
    process.exit(1);
  });

export default client;
