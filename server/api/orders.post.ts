import { randomBytes } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success)
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? "Invalid order" });

  const { customerName, note, items } = parsed.data;
  const ids = items.map((i) => i.itemId);

  try {
    return await db.transaction(async (tx) => {
      await tx.insert(schema.shop).values({ id: 1 }).onConflictDoNothing();
      const [state] = await tx.select().from(schema.shop).for("update").where(eq(schema.shop.id, 1));
      if (state && !state.acceptingOrders)
        throw createError({ statusCode: 409, statusMessage: "The store is closed and is not accepting new orders." });

      // Re-price from locked item rows; never trust client prices or stale availability.
      const rows = await tx.select().from(schema.items).where(inArray(schema.items.id, ids)).for("update");
      const byId = new Map(rows.map((r) => [r.id, r]));
      let total = 0;
      const lines = items.map((i) => {
        const item = byId.get(i.itemId);
        if (!item || !item.available)
          throw createError({ statusCode: 409, statusMessage: `${item?.name ?? "An item"} is no longer available. Please refresh the menu.` });
        total += item.priceCents * i.qty;
        return { itemId: item.id, nameSnapshot: item.name, priceCents: item.priceCents, qty: i.qty };
      });

      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
      // Counter rows are backfilled by the schema migration, not on each order.
      const [counter] = await tx
        .insert(schema.orderCounters)
        .values({ day, nextNumber: 2 })
        .onConflictDoUpdate({
          target: schema.orderCounters.day,
          set: { nextNumber: sql`${schema.orderCounters.nextNumber} + 1` },
        })
        .returning();
      const sequence = (counter?.nextNumber ?? 2) - 1;
      const orderNo = `${day.replaceAll("-", "")}-${String(sequence).padStart(3, "0")}`;

      const [order] = await tx
        .insert(schema.orders)
        .values({ orderNo, customerName, note, totalCents: total, trackToken: randomBytes(24).toString("base64url") })
        .returning();
      if (!order) throw createError({ statusCode: 500, statusMessage: "Order creation failed" });
      await tx.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));
      return { orderNo: order.orderNo, totalCents: total, trackToken: order.trackToken };
    });
  } catch (error: any) {
    if (error?.statusCode) throw error;
    console.error("Order transaction failed", error);
    throw createError({ statusCode: 500, statusMessage: "Could not create the order. Please try again." });
  }
});
