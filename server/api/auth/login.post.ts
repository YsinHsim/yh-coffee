import { and, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { username, password } = body ?? {};
  if (!username || !password)
    throw createError({ statusCode: 400, statusMessage: "Username and password required" });

  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.username, String(username)), eq(schema.users.active, true)))
    .limit(1);

  if (!user || !(await verifyPassword(user.passwordHash, password)))
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });

  await setUserSession(event, { user: { id: user.id, username: user.username, role: user.role } });
  return { id: user.id, username: user.username, role: user.role };
});
