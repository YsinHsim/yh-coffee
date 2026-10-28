import { eq, inArray } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const body = await readBody(event);
  if (typeof body?.acceptingOrders !== "boolean")
    throw createError({ statusCode: 400, statusMessage: "Invalid shop state" });

  return db.transaction(async (tx) => {
    // Serialize closing with order creation, which locks the same shop row.
    await tx.insert(schema.shop).values({ id: 1 }).onConflictDoNothing();
    const [state] = await tx.select().from(schema.shop).where(eq(schema.shop.id, 1)).for("update");
    if (!body.acceptingOrders && state!.acceptingOrders) {
      const active = await tx
        .select({ id: schema.orders.id })
        .from(schema.orders)
        .where(inArray(schema.orders.status, ["pending", "preparing", "ready"]))
        .limit(1);
      if (active.length)
        throw createError({ statusCode: 409, statusMessage: "Complete or cancel all active orders before closing the store." });
    }

    const [updated] = await tx
      .update(schema.shop)
      .set({ acceptingOrders: body.acceptingOrders, updatedAt: new Date() })
      .where(eq(schema.shop.id, 1))
      .returning();
    return { acceptingOrders: updated!.acceptingOrders };
  });
});
