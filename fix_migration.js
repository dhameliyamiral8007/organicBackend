import { sequelize } from "./config/sequelize.js";

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    // Force add columns
    try {
        await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;');
        console.log("✅ Added is_email_verified.");
    } catch (e) { console.log("is_email_verified error:", e.message); }

    try {
        await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN otp VARCHAR(10);');
        console.log("✅ Added otp.");
    } catch (e) { console.log("otp error:", e.message); }

    try {
        await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN otp_expires_at TIMESTAMP WITH TIME ZONE;');
        console.log("✅ Added otp_expires_at.");
    } catch (e) { console.log("otp_expires_at error:", e.message); }

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
