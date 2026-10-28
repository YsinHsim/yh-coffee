import "dotenv/config";
import { and, eq, like, or } from "drizzle-orm";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../server/db/schema";

if (!process.env.DATABASE_URL?.includes("localhost") && process.env.ALLOW_REMOTE_PHASE1_TEST !== "true")
  throw new Error("Refusing to run destructive smoke tests against a remote database. Use a local development database.");

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });
const base = "http://localhost:3000";
const marker = `phase1-${Date.now()}`;
let adminCookie = "";
let staffCookie = "";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function request(path: string, options: RequestInit = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "content-type": "application/json", cookie, ...options.headers },
  });
  const data = await response.json();
  return { response, data };
}
async function login(username: string, password: string) {
  const { response, data } = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
  assert(response.ok, `Login failed: ${JSON.stringify(data)}`);
  return response.headers.get("set-cookie")!.split(";")[0];
}
const post = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });
const patch = (body: unknown) => ({ method: "PATCH", body: JSON.stringify(body) });

try {
  if (!process.env.SEED_ADMIN_PASS) throw new Error("Set SEED_ADMIN_PASS to the development admin password.");
  adminCookie = await login("admin", process.env.SEED_ADMIN_PASS);
  let result = await request("/api/admin/catalog", post({ type: "user", username: marker, password: "test-only-not-a-real-password", role: "manager" }), adminCookie);
  assert(result.response.ok, `Create temporary staff failed: ${JSON.stringify(result.data)}`);
  const userId = result.data.id;
  staffCookie = await login(marker, "test-only-not-a-real-password");

  result = await request("/api/manager/summary", {}, staffCookie);
  assert(result.response.ok, "Temporary staff could not access manager API");
  await request(`/api/admin/users/${userId}/status`, patch({ active: false }), adminCookie);
  result = await request("/api/manager/summary", {}, staffCookie);
  assert(result.response.status === 401, `Deactivated session returned ${result.response.status}`);
  result = await request("/api/auth/login", post({ username: marker, password: "test-only-not-a-real-password" }));
  assert(result.response.status === 401, "Deactivated staff could log in");
  await request(`/api/admin/users/${userId}/status`, patch({ active: true }), adminCookie);
  staffCookie = await login(marker, "test-only-not-a-real-password");
  console.log("PASS deactivation revokes sessions and blocks login; reactivation works");

  const existing = await request("/api/manager/orders?status=pending", {}, staffCookie);
  assert(existing.data.length === 0, "Test requires no pending orders; refusing to modify real active orders");
  const menu = await request("/api/menu");
  const itemId = menu.data.items[0].id;
  const orderBody = { customerName: marker, note: "automated phase 1 test", items: [{ itemId, qty: 1 }] };
  result = await request("/api/orders", post(orderBody));
  assert(result.response.ok, "Could not create test order");
  result = await request("/api/manager/shop", patch({ acceptingOrders: false }), staffCookie);
  assert(result.response.status === 409, `Close with active orders returned ${result.response.status}`);
  console.log("PASS close is blocked while active orders remain");

  const concurrent = await Promise.all(Array.from({ length: 5 }, () => request("/api/orders", post(orderBody))));
  assert(concurrent.every((r) => r.response.ok), `Concurrent order failure: ${concurrent.map((r) => JSON.stringify(r.data)).join(", ")}`);
  const numbers = concurrent.map((r) => r.data.orderNo);
  assert(new Set(numbers).size === numbers.length, `Duplicate order numbers: ${numbers}`);
  console.log(`PASS six concurrent orders have unique numbers: ${numbers.join(", ")}`);

  const orders = await request("/api/manager/orders", {}, staffCookie);
  const testOrders = orders.data.filter((o: any) => o.customerName === marker);
  result = await request(`/api/manager/orders/${testOrders[0].id}/status`, post({ status: "cancelled" }), staffCookie);
  assert(result.response.ok, `Valid cancellation failed: ${JSON.stringify(result.data)}`);
  result = await request(`/api/manager/orders/${testOrders[0].id}/status`, post({ status: "preparing" }), staffCookie);
  assert(result.response.status === 409, "Terminal order accepted a status reversal");
  for (const order of testOrders.slice(1))
    await request(`/api/manager/orders/${order.id}/status`, post({ status: "cancelled" }), staffCookie);
  const events = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.actorName, marker));
  assert(events.length === 6, `Expected 6 staff audit events, got ${events.length}`);
  console.log("PASS staff transitions are validated and audited with actor identity");

  result = await request("/api/manager/shop", patch({ acceptingOrders: false }), staffCookie);
  assert(result.response.ok, `Close failed: ${JSON.stringify(result.data)}`);
  result = await request("/api/orders", post(orderBody));
  assert(result.response.status === 409, `Closed checkout returned ${result.response.status}`);
  result = await request("/api/menu");
  assert(result.data.acceptingOrders === false, "Public menu did not report closed state");
  result = await request("/api/manager/shop", patch({ acceptingOrders: true }), staffCookie);
  assert(result.response.ok, "Reopen failed");
  console.log("PASS closed store rejects checkout and reports state; reopen works");
} finally {
  const testOrders = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.customerName, marker));
  for (const order of testOrders) await db.delete(schema.orders).where(eq(schema.orders.id, order.id));
  await db.delete(schema.users).where(eq(schema.users.username, marker));
  await db.update(schema.shop).set({ acceptingOrders: true }).where(eq(schema.shop.id, 1));
  await pool.end();
}
