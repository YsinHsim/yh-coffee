import { createError } from "h3";
import type { H3Event } from "h3";
import type { UserSession } from "#auth-utils";

export async function requireAuth(event: H3Event, roles: string[]) {
  const session = await getUserSession(event);
  const user = session?.user as UserSession["user"] & { id?: number; role?: string } | undefined;
  const u = user as { id: number; role: string } | undefined;
  if (!u?.id) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  if (!roles.includes(u.role)) throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  return u;
}

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

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
