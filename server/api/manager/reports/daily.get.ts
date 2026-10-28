import { and, desc, eq, or, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const day = validBusinessDay(getQuery(event).date);

  const [totals] = await db.select({
    paidOrders: sql<number>`count(*) filter (where ${schema.orders.paymentStatus} = 'paid')::int`,
    cancelledOrders: sql<number>`count(*) filter (where ${schema.orders.status} = 'cancelled')::int`,
    collectedCents: sql<number>`coalesce(sum(${schema.orders.totalCents}) filter (where ${schema.orders.paymentStatus} = 'paid'), 0)::int`,
  }).from(schema.orders).where(sql`(${schema.orders.createdAt} at time zone 'Asia/Kuala_Lumpur')::date = ${day}::date`);

  const payments = await db.select({
    method: schema.orders.paymentMethod,
    orders: sql<number>`count(*)::int`,
    totalCents: sql<number>`sum(${schema.orders.totalCents})::int`,
  }).from(schema.orders).where(and(
    eq(schema.orders.paymentStatus, "paid"),
    sql`(${schema.orders.paidAt} at time zone 'Asia/Kuala_Lumpur')::date = ${day}::date`,
  )).groupBy(schema.orders.paymentMethod).orderBy(schema.orders.paymentMethod);

  const unresolved = await db.select({
    id: schema.orders.id,
    orderNo: schema.orders.orderNo,
    customerName: schema.orders.customerName,
    status: schema.orders.status,
    paymentStatus: schema.orders.paymentStatus,
    totalCents: schema.orders.totalCents,
  }).from(schema.orders).where(and(
    or(
      sql`${schema.orders.status} in ('pending', 'preparing', 'ready')`,
      and(eq(schema.orders.paymentStatus, "unpaid"), sql`${schema.orders.status} <> 'cancelled'`),
    ),
    sql`(${schema.orders.createdAt} at time zone 'Asia/Kuala_Lumpur')::date <= ${day}::date`,
  )).orderBy(desc(schema.orders.id));

  const shopActivity = await db.select({
    actorName: schema.shopEvents.actorName,
    acceptingOrders: schema.shopEvents.toAcceptingOrders,
    createdAt: schema.shopEvents.createdAt,
  }).from(schema.shopEvents)
    .where(sql`(${schema.shopEvents.createdAt} at time zone 'Asia/Kuala_Lumpur')::date = ${day}::date`)
    .orderBy(desc(schema.shopEvents.createdAt));

  return { day, ...totals, payments, unresolved, shopActivity, canClose: unresolved.length === 0 };
});
