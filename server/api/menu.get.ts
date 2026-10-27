import { asc, eq } from "drizzle-orm";

// Public menu: only available items, grouped client-side by category
export default defineEventHandler(async () => {
  const [cats, menuItems] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort), asc(schema.categories.id)),
    db
      .select({
        id: schema.items.id,
        categoryId: schema.items.categoryId,
        name: schema.items.name,
        description: schema.items.description,
        priceCents: schema.items.priceCents,
        imageUrl: schema.items.imageUrl,
      })
      .from(schema.items)
      .where(eq(schema.items.available, true))
      .orderBy(asc(schema.items.sort), asc(schema.items.id)),
  ]);
  return { categories: cats, items: menuItems };
});
