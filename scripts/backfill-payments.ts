import "dotenv/config";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
try {
  const result = await pool.query("update orders set payment_method = coalesce(payment_method, 'cash'), paid_at = coalesce(paid_at, created_at) where status = 'paid' and (payment_method is null or paid_at is null)");
  console.log(`Backfilled ${result.rowCount} legacy paid orders.`);
} finally {
  await pool.end();
}
