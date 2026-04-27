import { sequelize } from "./config/sequelize.js";

async function checkTable() {
  try {
    await sequelize.authenticate();
    const [results] = await sequelize.query(`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders';
    `);
    console.log("Column Nullability in orders:");
    results.forEach(row => {
      console.log(`- ${row.column_name}: Nullable = ${row.is_nullable}`);
    });
    process.exit(0);
  } catch (error) {
    console.error("Error checking table:", error);
    process.exit(1);
  }
}

checkTable();
