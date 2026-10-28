export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  if (!session.user) return null;
  try {
    return await requireAuth(event, ["manager", "admin"]);
  } catch {
    return null;
  }
});
