import { eq } from "drizzle-orm";

const transitions: Record<string, string[]> = {
  pending: ["preparing", "paid", "cancelled"],
  preparing: ["ready", "paid", "cancelled"],
  ready: ["paid", "cancelled"],
};
const paymentMethods = ["cash", "qr", "card", "other"];

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event, ["manager", "admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  const status = body?.status;
  if (!Number.isInteger(id) || !Object.values(transitions).flat().includes(status))
    throw createError({ statusCode: 400, statusMessage: "Invalid status" });
  if (status === "paid" && !paymentMethods.includes(body?.paymentMethod))
    throw createError({ statusCode: 400, statusMessage: "Choose cash, QR, card, or other payment method." });

  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, id)).for("update");
    if (!order) throw createError({ statusCode: 404, statusMessage: "Order not found" });
    if (!transitions[order.status]?.includes(status))
      throw createError({ statusCode: 409, statusMessage: `Cannot change a ${order.status} order to ${status}. Refresh and try again.` });

    const [updated] = await tx.update(schema.orders).set({
      status,
      paymentMethod: status === "paid" ? body.paymentMethod : null,
      paidAt: status === "paid" ? new Date() : null,
    }).where(eq(schema.orders.id, id)).returning();
    await tx.insert(schema.orderEvents).values({
      orderId: id,
      actorId: actor.id,
      actorName: actor.username,
      fromStatus: order.status,
      toStatus: status,
    });
    return updated;
  });
});
