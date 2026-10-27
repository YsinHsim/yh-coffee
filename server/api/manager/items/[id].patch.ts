import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["manager", "admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);

  const patch: Record<string, unknown> = {};
  if (typeof body.available === "boolean") patch.available = body.available;
  if (typeof body.priceCents === "number" && body.priceCents >= 0) patch.priceCents = body.priceCents;
  if (Object.keys(patch).length === 0)
    throw createError({ statusCode: 400, statusMessage: "Nothing to update" });

  const [updated] = await db
    .update(schema.items)
    .set(patch)
    .where(eq(schema.items.id, id))
    .returning();
  if (!updated) throw createError({ statusCode: 404, statusMessage: "Item not found" });
  return updated;
});
