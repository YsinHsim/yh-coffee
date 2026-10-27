import { asc, eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);

  const [todayAgg] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${schema.orders.totalCents}),0)::int`,
    })
    .from(schema.orders)
    .where(sql`date_trunc('day', ${schema.orders.createdAt}) = date_trunc('day', now()) and ${schema.orders.status} = 'paid'`);

  const [pendingAgg] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(eq(schema.orders.status, "pending"));

  const items = await db
    .select({
      id: schema.items.id,
      name: schema.items.name,
      priceCents: schema.items.priceCents,
      available: schema.items.available,
      categoryName: schema.categories.name,
    })
    .from(schema.items)
    .leftJoin(schema.categories, eq(schema.items.categoryId, schema.categories.id))
    .orderBy(asc(schema.items.sort), asc(schema.items.id));

  return { today: todayAgg, pendingCount: pendingAgg?.count ?? 0, items };
});
