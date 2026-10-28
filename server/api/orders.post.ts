import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? "Invalid order" });

  const { customerName, note, items } = parsed.data;
  const ids = items.map((i) => i.itemId);

  // Re-price server-side: never trust client prices
  const rows = await db
    .select()
    .from(schema.items)
    .where(inArray(schema.items.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));
  let total = 0;
  const lines = items.map((i) => {
    const item = byId.get(i.itemId);
    if (!item || !item.available)
      throw createError({ statusCode: 400, statusMessage: `Item unavailable: ${i.itemId}` });
    total += item.priceCents * i.qty;
    return { itemId: item.id, nameSnapshot: item.name, priceCents: item.priceCents, qty: i.qty };
  });

  // Sequential order number: YYYYMMDD-NN (count today's orders)
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const [todayAgg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(sql`date_trunc('day', ${schema.orders.createdAt}) = date_trunc('day', now())`);
  const orderNo = `${ymd}-${String((todayAgg?.count ?? 0) + 1).padStart(3, "0")}`;

  const [order] = await db
    .insert(schema.orders)
    .values({ orderNo, customerName, note, totalCents: total, trackToken: randomBytes(24).toString("base64url") })
    .returning();
  if (!order) throw createError({ statusCode: 500, statusMessage: "Order creation failed" });

  await db.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));

  return { orderNo: order.orderNo, totalCents: total, trackToken: order.trackToken };
});
