import { desc, eq, inArray, ne } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event, ["manager", "admin"]);
  const status = getQuery(event).status as string | undefined;

  const orders = await db
    .select()
    .from(schema.orders)
    .where(status ? eq(schema.orders.status, status) : ne(schema.orders.status, "cancelled"))
    .orderBy(desc(schema.orders.id))
    .limit(100);

  // attach lines
  const ids = orders.map((o) => o.id);
  const lines = ids.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids))
    : [];
  const byOrder = new Map<number, typeof lines>();
  for (const l of lines) {
    if (!byOrder.has(l.orderId)) byOrder.set(l.orderId, []);
    byOrder.get(l.orderId)!.push(l);
  }

  return orders.map((o) => ({ ...o, lines: byOrder.get(o.id) ?? [] }));
});
