import pkg from "pg";
const { Client } = pkg;
import dotenv from "dotenv";
dotenv.config();

const useSSL = String(process.env.DB_SSL || "true").toLowerCase() === "true";
const rejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

const ssl = useSSL ? { rejectUnauthorized } : false;

const client = process.env.DATABASE_URL
  ? new Client({
      connectionString: process.env.DATABASE_URL,
      ssl,
    })
  : new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl,
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
