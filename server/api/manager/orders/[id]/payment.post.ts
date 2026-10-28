import { eq } from "drizzle-orm";

const paymentMethods = ["cash", "qr", "card", "other"];

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event, ["manager", "admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  if (!Number.isInteger(id) || !paymentMethods.includes(body?.paymentMethod))
    throw createError({ statusCode: 400, statusMessage: "Choose cash, QR, card, or other payment method." });

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
    if (!order) throw createError({ statusCode: 404, statusMessage: "Order not found" });
    if (order.status === "cancelled")
      throw createError({ statusCode: 409, statusMessage: "Cancelled orders cannot be paid." });
    if (order.paymentStatus === "paid")
      throw createError({ statusCode: 409, statusMessage: "Payment has already been recorded." });

    const [updated] = await tx.update(schema.orders).set({
      paymentStatus: "paid", paymentMethod: body.paymentMethod, paidAt: new Date(),
    }).where(eq(schema.orders.id, id)).returning();
    await tx.insert(schema.orderEvents).values({
      orderId: id, actorId: actor.id, actorName: actor.username,
      fromStatus: "unpaid", toStatus: "paid",
    });
    return updated;
  });
});
