import { and, eq, ne, sql } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const actor = await requireAuth(event, ["admin"]);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);
  if (!Number.isInteger(id) || typeof body?.active !== "boolean")
    throw createError({ statusCode: 400, statusMessage: "Invalid request" });
  if (id === actor.id && !body.active)
    throw createError({ statusCode: 400, statusMessage: "You cannot deactivate your own account" });

  return db.transaction(async (tx) => {
    const [target] = await tx.select().from(schema.users).where(eq(schema.users.id, id)).for("update");
    if (!target) throw createError({ statusCode: 404, statusMessage: "User not found" });
    if (target.role === "admin" && !body.active) {
      const [admins] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(and(eq(schema.users.role, "admin"), eq(schema.users.active, true), ne(schema.users.id, id)));
      if (!admins?.count) throw createError({ statusCode: 400, statusMessage: "Cannot deactivate the last active admin" });
    }

    const [updated] = await tx
      .update(schema.users)
      .set({ active: body.active })
      .where(eq(schema.users.id, id))
      .returning();
    return { id: updated!.id, username: updated!.username, role: updated!.role, active: updated!.active };
  });
});
