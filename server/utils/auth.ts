import { createError } from "h3";
import type { H3Event } from "h3";
import { eq } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

interface SessionUser {
  id: number;
}

export async function requireAuth(event: H3Event, roles: string[]) {
  const session = await getUserSession(event);
  const sessionUser = session?.user as SessionUser | undefined;
  if (!sessionUser?.id) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).limit(1);
  if (!user?.active || !roles.includes(user.role)) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, statusMessage: "Your staff access has ended. Please log in again." });
  }
  return { id: user.id, username: user.username, role: user.role };
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(hash: string, password: string) {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(key, "hex"), derived);
}
