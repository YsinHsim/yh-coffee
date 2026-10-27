import { asc } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  await requireAuth(event, ["admin"]);

  if (getMethod(event) === "GET") {
    const [cats, items, users] = await Promise.all([
      db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
      db.select().from(schema.items).orderBy(asc(schema.items.sort), asc(schema.items.id)),
      db.select({ id: schema.users.id, username: schema.users.username, role: schema.users.role }).from(schema.users),
    ]);
    return { categories: cats, items, users };
  }

  // POST: create item or category
  const body = await readBody(event);
  if (body.type === "category") {
    const [cat] = await db
      .insert(schema.categories)
      .values({ name: String(body.name).slice(0, 60), sort: Number(body.sort) || 0 })
      .returning();
    return cat;
  }
  if (body.type === "user") {
    if (!body.username || !body.password)
      throw createError({ statusCode: 400, statusMessage: "Username and password required" });
    const [user] = await db
      .insert(schema.users)
      .values({
        username: String(body.username).slice(0, 40),
        passwordHash: await hashPassword(String(body.password)),
        role: ["manager", "admin"].includes(body.role) ? body.role : "manager",
      })
      .returning();
    if (!user) throw createError({ statusCode: 500, statusMessage: "User creation failed" });
    return { id: user.id, username: user.username, role: user.role };
  }
  const [item] = await db
    .insert(schema.items)
    .values({
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      name: String(body.name).slice(0, 120),
      description: String(body.description ?? "").slice(0, 300),
      priceCents: Math.round(Number(body.priceCents) || 0),
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      sort: Number(body.sort) || 0,
    })
    .returning();
  return item;
});
