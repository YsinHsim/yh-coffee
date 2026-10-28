import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  if (!/^[A-Za-z0-9_-]{32}$/.test(token))
    throw createError({ statusCode: 400, statusMessage: "Invalid tracking link" });

  const [order] = await db
    .select({
      orderNo: schema.orders.orderNo,
      customerName: schema.orders.customerName,
      note: schema.orders.note,
      totalCents: schema.orders.totalCents,
      status: schema.orders.status,
      createdAt: schema.orders.createdAt,
      id: schema.orders.id,
    })
    .from(schema.orders)
    .where(eq(schema.orders.trackToken, token))
    .limit(1);
  if (!order) throw createError({ statusCode: 404, statusMessage: "Order not found" });

  const lines = await db
    .select({ nameSnapshot: schema.orderItems.nameSnapshot, qty: schema.orderItems.qty, priceCents: schema.orderItems.priceCents })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));

  const { id: _id, ...publicOrder } = order;
  return { ...publicOrder, lines };
});
