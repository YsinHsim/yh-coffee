import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { scryptSync, randomBytes } from "node:crypto";
import * as schema from "../server/db/schema";
import "dotenv/config";

const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};


const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  const admin = process.env.SEED_ADMIN_USER || "admin";
  const pass = process.env.SEED_ADMIN_PASS;
  if (!pass) throw new Error("Set SEED_ADMIN_PASS env var");

  await db.insert(schema.users).values({
    username: admin,
    passwordHash: await hashPassword(pass),
    role: "admin",
  }).onConflictDoNothing();

  const cats = await db
    .insert(schema.categories)
    .values([
      { name: "Kopi", sort: 0 },
      { name: "Teh", sort: 1 },
      { name: "Makanan", sort: 2 },
    ])
    .returning();

  await db.insert(schema.items).values([
    { categoryId: cats[0].id, name: "Kopi O", priceCents: 250, description: "Kopi hitam classic", sort: 0 },
    { categoryId: cats[0].id, name: "Kopi C", priceCents: 300, description: "Kopi + susu pekat", sort: 1 },
    { categoryId: cats[1].id, name: "Teh Tarik", priceCents: 300, description: "", sort: 0 },
    { categoryId: cats[2].id, name: "Nasi Lemak", priceCents: 500, description: "Sambal sedap", sort: 0 },
    { categoryId: cats[2].id, name: "Roti Bakar", priceCents: 350, description: "Kaya + butter", sort: 1 },
  ]);

  console.log("Seeded: admin user + sample menu");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
