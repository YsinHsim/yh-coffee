import { asc, eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const [todayAgg] = await db
    .select({ orders: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${schema.orders.totalCents}),0)::int` })
    .from(schema.orders)
    .where(sql`${schema.orders.status} = 'paid' and (${schema.orders.paidAt} at time zone 'Asia/Kuala_Lumpur')::date = ${businessDay()}::date`);
  const items = await db
    .select({ id: schema.items.id, name: schema.items.name, priceCents: schema.items.priceCents, available: schema.items.available, categoryName: schema.categories.name })
    .from(schema.items)
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .orderBy(asc(schema.items.sort), asc(schema.items.id));
  const state = await getShopState();
  return { today: todayAgg, items, acceptingOrders: state.acceptingOrders };
});
