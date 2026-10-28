export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loggedIn, fetch: fetchSession } = useUserSession();
  await fetchSession(); // ensure cookie-derived state is loaded before judging
  if (!loggedIn.value) return navigateTo("/staff");
  const u = user.value as { role?: string } | undefined;
  if (to.path === "/admin" && u?.role !== "admin") return navigateTo("/manager");
});
