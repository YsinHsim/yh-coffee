export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["nuxt-auth-utils"],
  nitro: {
    esbuild: {
      // keep node built-ins working in server routes
      options: { target: "esnext" },
    },
  },
  app: {
    head: {
      title: "YH Coffee",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
    },
  },
});
