import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["admin"]);
  const id = Number(getRouterParam(event, "id"));
  const kind = getQuery(event).kind ?? "item";

  if (kind === "category") {
    // detach items first
    await db.update(schema.items).set({ categoryId: null }).where(eq(schema.items.categoryId, id));
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    return { ok: true };
  }
  await db.delete(schema.items).where(eq(schema.items.id, id));
  return { ok: true };
});
