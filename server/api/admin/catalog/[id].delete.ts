import { and, eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event, ["admin"]);
  const id = Number(getRouterParam(event, "id"));
  const kind = getQuery(event).kind ?? "item";
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 400, statusMessage: "Invalid ID" });

  if (kind === "category") {
    // Item snapshots preserve names and prices on existing orders.
    await db.update(schema.items).set({ categoryId: null }).where(eq(schema.items.categoryId, id));
    const [deleted] = await db.delete(schema.categories).where(eq(schema.categories.id, id)).returning();
    if (!deleted) throw createError({ statusCode: 404, statusMessage: "Category not found" });
    return { ok: true };
  }

  if (kind === "user") {
    if (id === actor.id) throw createError({ statusCode: 400, statusMessage: "You cannot remove your own account" });
    const [target] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!target) throw createError({ statusCode: 404, statusMessage: "User not found" });
    if (target.role === "admin") {
      const [admins] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users).where(and(eq(schema.users.role, "admin"), eq(schema.users.active, true)));
      if ((admins?.count ?? 0) <= 1)
        throw createError({ statusCode: 400, statusMessage: "Cannot remove the last admin" });
    }
    await db.delete(schema.users).where(eq(schema.users.id, id));
    return { ok: true };
  }

  const [deleted] = await db.delete(schema.items).where(eq(schema.items.id, id)).returning();
  if (!deleted) throw createError({ statusCode: 404, statusMessage: "Item not found" });
  return { ok: true };
});
