import { sequelize } from "./config/sequelize.js";

async function checkTable() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'checkout_sessions';
    `);
    console.log("Columns in checkout_sessions:");
    results.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    process.exit(0);
  } catch (error) {
    console.error("Error checking table:", error);
    process.exit(1);
  }
}

checkTable();
