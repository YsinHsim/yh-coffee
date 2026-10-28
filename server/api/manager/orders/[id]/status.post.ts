import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  const status = body?.status;
  if (!["pending", "preparing", "ready", "paid", "cancelled"].includes(status))
    throw createError({ statusCode: 400, statusMessage: "Invalid status" });

  const [updated] = await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, id))
    .returning();
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Order not found" });
  return updated;
});
