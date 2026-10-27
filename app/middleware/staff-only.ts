export default defineNuxtRouteMiddleware(async (to) => {
  const { user, loggedIn } = useUserSession();
  if (!loggedIn.value) return navigateTo("/staff");
  const u = user.value as { role?: string } | undefined;
  if (to.path === "/admin" && u?.role !== "admin") return navigateTo("/manager");
});
