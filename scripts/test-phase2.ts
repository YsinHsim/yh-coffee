import "dotenv/config";
import { eq } from "drizzle-orm";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../server/db/schema";

if (!process.env.DATABASE_URL?.includes("localhost") && process.env.ALLOW_REMOTE_PHASE1_TEST !== "true")
  throw new Error("Use a local database or explicitly set ALLOW_REMOTE_PHASE1_TEST=true for an isolated development branch.");
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });
const base = "http://localhost:3000";
const marker = `phase2-${Date.now()}`;
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
async function request(path: string, body?: unknown, cookie = "") {
  const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
  return { response, data: await response.json() };
}
if (!process.env.SEED_ADMIN_PASS) throw new Error("Set SEED_ADMIN_PASS to the development admin password.");
const login = await request("/api/auth/login", { username: "admin", password: process.env.SEED_ADMIN_PASS });
assert(login.response.ok, "Admin login failed");
const cookie = login.response.headers.get("set-cookie")!.split(";")[0];
try {
  const menu = await request("/api/menu");
  const created = await request("/api/orders", { customerName: marker, items: [{ itemId: menu.data.items[0].id, qty: 2 }] });
  assert(created.response.ok, "Could not create test order");
  const orders = await request("/api/manager/orders", undefined, cookie);
  const order = orders.data.find((o: any) => o.orderNo === created.data.orderNo);
  let result = await request(`/api/manager/orders/${order.id}/payment`, {}, cookie);
  assert(result.response.status === 400, "Payment was accepted without a method");
  result = await request(`/api/manager/orders/${order.id}/payment`, { paymentMethod: "qr" }, cookie);
  assert(result.response.ok && result.data.paymentStatus === "paid" && result.data.paymentMethod === "qr" && result.data.paidAt, "Payment details were not saved");
  result = await request(`/api/manager/orders/${order.id}/payment`, { paymentMethod: "cash" }, cookie);
  assert(result.response.status === 409, "Duplicate payment was recorded");
  result = await request(`/api/manager/orders/${order.id}/status`, { status: "cancelled" }, cookie);
  assert(result.response.status === 409, "Paid order was cancelled without a refund workflow");
  for (const status of ["preparing", "ready", "completed"]) {
    result = await request(`/api/manager/orders/${order.id}/status`, { status }, cookie);
    assert(result.response.ok, `Paid order could not advance to ${status}`);
  }
  console.log("PASS payment is confirmed once and paid orders continue through fulfilment");

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
  const report = await request(`/api/manager/reports/daily?date=${day}`, undefined, cookie);
  const payment = report.data.payments.find((p: any) => p.method === "qr");
  assert(payment && payment.totalCents >= order.totalCents, "QR payment missing from daily report");
  assert(report.data.canClose, "Paid test order appears unresolved");
  console.log(`PASS daily report includes QR payment: ${payment.orders} orders, ${payment.totalCents} sen`);

  const legacy = await db.update(schema.orders).set({ paidAt: null }).where(eq(schema.orders.id, order.id)).returning();
  const after = await request(`/api/manager/reports/daily?date=${day}`, undefined, cookie);
  const afterPayment = after.data.payments.find((p: any) => p.method === "qr");
  assert((afterPayment?.totalCents ?? 0) === payment.totalCents - order.totalCents, "Report did not use paidAt business day");
  console.log("PASS daily payment totals follow paidAt, not order creation date");
  void legacy;
} finally {
  await db.delete(schema.orders).where(eq(schema.orders.customerName, marker));
  await pool.end();
}
