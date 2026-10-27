export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["nuxt-auth-utils"],
  css: ["~/assets/css/main.css"],
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
        { name: "theme-color", content: "#0e0c0a" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" },
      ],
    },
  },
});
