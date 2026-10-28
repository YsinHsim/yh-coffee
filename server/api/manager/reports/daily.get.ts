import { and, desc, eq, inArray, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const day = validBusinessDay(getQuery(event).date);

  const [totals] = await db.select({
    paidOrders: sql<number>`count(*) filter (where ${schema.orders.status} = 'paid')::int`,
    cancelledOrders: sql<number>`count(*) filter (where ${schema.orders.status} = 'cancelled')::int`,
    collectedCents: sql<number>`coalesce(sum(${schema.orders.totalCents}) filter (where ${schema.orders.status} = 'paid'), 0)::int`,
  }).from(schema.orders).where(sql`(${schema.orders.createdAt} at time zone 'Asia/Kuala_Lumpur')::date = ${day}::date`);

  const payments = await db.select({
    method: schema.orders.paymentMethod,
    orders: sql<number>`count(*)::int`,
    totalCents: sql<number>`sum(${schema.orders.totalCents})::int`,
  }).from(schema.orders).where(and(
    eq(schema.orders.status, "paid"),
    sql`(${schema.orders.paidAt} at time zone 'Asia/Kuala_Lumpur')::date = ${day}::date`,
  )).groupBy(schema.orders.paymentMethod).orderBy(schema.orders.paymentMethod);

  const unresolved = await db.select({
    id: schema.orders.id,
    orderNo: schema.orders.orderNo,
    customerName: schema.orders.customerName,
    status: schema.orders.status,
    totalCents: schema.orders.totalCents,
  }).from(schema.orders).where(and(
    inArray(schema.orders.status, ["pending", "preparing", "ready"]),
    sql`(${schema.orders.createdAt} at time zone 'Asia/Kuala_Lumpur')::date <= ${day}::date`,
  )).orderBy(desc(schema.orders.id));

  return { day, ...totals, payments, unresolved, canClose: unresolved.length === 0 };
});
