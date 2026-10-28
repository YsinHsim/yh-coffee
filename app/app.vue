<script setup lang="ts">
import { darkTheme, NConfigProvider } from "naive-ui";

const theme = useState<"light" | "dark">("theme", () => "dark");
const naiveTheme = computed(() => theme.value === "dark" ? darkTheme : null);
const themeOverrides = {
  common: {
    primaryColor: "#f5a524",
    primaryColorHover: "#ffb63e",
    primaryColorPressed: "#db8e15",
    primaryColorSuppl: "#f5a524",
    borderRadius: "8px",
  },
};

function applyTheme(value: "light" | "dark") {
  theme.value = value;
  if (!import.meta.client) return;
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", value === "dark" ? "#0e0c0a" : "#fff8ef");
  localStorage.setItem("yh-theme", value);
}
function toggleTheme() {
  applyTheme(theme.value === "dark" ? "light" : "dark");
}
onMounted(() => {
  const saved = localStorage.getItem("yh-theme");
  applyTheme(saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
});
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <button class="theme-toggle" :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`" :title="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`" @click="toggleTheme">
      <span v-if="theme === 'dark'">☀</span><span v-else>☾</span>
      <span class="theme-label">{{ theme === 'dark' ? 'Light' : 'Dark' }}</span>
    </button>
    <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides">
      <NuxtPage />
    </NConfigProvider>
  </div>
</template>
