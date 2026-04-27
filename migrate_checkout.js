import { sequelize } from "./config/sequelize.js";

async function runMigration() {
  try {
    await sequelize.authenticate();
    console.log("Connected to database.");

    console.log("Running migrations for checkout_sessions table...");

    // 1. Allow userId to be NULL in checkout_sessions
    await sequelize.query('ALTER TABLE checkout_sessions ALTER COLUMN user_id DROP NOT NULL;');
    console.log("✅ Updated checkout_sessions.user_id to allow NULL.");

    // 1b. Allow userId to be NULL in orders
    await sequelize.query('ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;');
    console.log("✅ Updated orders.user_id to allow NULL.");


    // 2. Add is_email_verified column
    await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;');
    console.log("✅ Added is_email_verified column.");

    // 3. Add otp column
    await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS otp VARCHAR(10);');
    console.log("✅ Added otp column.");

    // 4. Add otp_expires_at column
    await sequelize.query('ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE;');
    console.log("✅ Added otp_expires_at column.");

    // 5. Update current_step ENUM
    // First, let's add the new values to the existing ENUM type
    // We use try-catch because ADD VALUE cannot be executed inside a transaction and might fail if already exists
    try {
      await sequelize.query("ALTER TYPE \"enum_checkout_sessions_current_step\" ADD VALUE 'email';");
    } catch (e) { console.log("Note: 'email' might already exist in ENUM."); }
    
    try {
      await sequelize.query("ALTER TYPE \"enum_checkout_sessions_current_step\" ADD VALUE 'otp';");
    } catch (e) { console.log("Note: 'otp' might already exist in ENUM."); }
    
    try {
      await sequelize.query("ALTER TYPE \"enum_checkout_sessions_current_step\" ADD VALUE 'details';");
    } catch (e) { console.log("Note: 'details' might already exist in ENUM."); }

    console.log("✅ Updated current_step ENUM values.");

    console.log("🚀 All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
