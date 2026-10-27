import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  const kind = body?.kind ?? "item";

  if (kind === "category") {
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = String(body.name).slice(0, 60);
    if (body.sort !== undefined) patch.sort = Number(body.sort) || 0;
    const [updated] = await db.update(schema.categories).set(patch).where(eq(schema.categories.id, id)).returning();
    return updated ?? null;
  }

  if (kind === "user") {
    const patch: Record<string, unknown> = {};
    if (body.role && ["manager", "admin"].includes(body.role)) patch.role = body.role;
    if (body.password) patch.passwordHash = await hashPassword(String(body.password));
    const [updated] = await db.update(schema.users).set(patch).where(eq(schema.users.id, id)).returning();
    return updated ? { id: updated.id, username: updated.username, role: updated.role } : null;
  }

  // item
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = String(body.name).slice(0, 120);
  if (body.description !== undefined) patch.description = String(body.description).slice(0, 300);
  if (body.priceCents !== undefined) patch.priceCents = Math.max(0, Math.round(Number(body.priceCents) || 0));
  if (body.categoryId !== undefined) patch.categoryId = body.categoryId ? Number(body.categoryId) : null;
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl || null;
  if (body.available !== undefined) patch.available = Boolean(body.available);
  if (body.sort !== undefined) patch.sort = Number(body.sort) || 0;

  const [updated] = await db.update(schema.items).set(patch).where(eq(schema.items.id, id)).returning();
  return updated ?? null;
});
