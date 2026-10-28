export async function getShopState() {
  await db.insert(schema.shop).values({ id: 1 }).onConflictDoNothing();
  const [state] = await db.select().from(schema.shop).limit(1);
  return state!;
}
