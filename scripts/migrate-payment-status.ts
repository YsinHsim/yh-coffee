import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
try {
  const result = await pool.query("update orders set payment_status = 'paid', status = 'completed' where status = 'paid'");
  console.log(`Migrated ${result.rowCount} legacy paid orders to completed + paid.`);
} finally {
  await pool.end();
}
