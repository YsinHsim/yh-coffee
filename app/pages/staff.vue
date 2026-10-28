<script setup lang="ts">
import { NButton } from "naive-ui";

interface SessionUser { id: number; username: string; role: string }
const { user, fetch: fetchSession } = useUserSession();
const sessionUser = computed(() => (user.value ?? null) as SessionUser | null);
const username = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function login() {
  loading.value = true;
  error.value = "";
  try {
    await $fetch("/api/auth/login", { method: "POST", body: { username: username.value, password: password.value } });
    await fetchSession(); // refresh client session state from the new cookie
    await navigateTo("/manager");
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? "Login failed";
  } finally {
    loading.value = false;
  }
}
useHead({ title: "YH Coffee — Staff Login" });
</script>

<template>
    <div class="container" style="max-width:380px; margin-top:12vh;">
    <header class="menu-hero" style="padding:30px 0 24px; display:flex; justify-content:center; align-items:center; gap:14px;">
      <img class="brand-logo" src="/logo.svg" alt="YH Coffee logo">
      <div>
        <h1 style="font-size:2.2rem;">YH Coffee</h1>
        <p class="tagline">staff login</p>
      </div>
    </header>
    <div class="card" style="flex-direction:column; align-items:stretch; padding:24px;">
      <form @submit.prevent="login">
        <input v-model="username" placeholder="Username" autocomplete="username">
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password">
        <NButton type="primary" block :loading="loading" attr-type="submit">{{ loading ? "Signing in…" : "Masuk →" }}</NButton>
      </form>
      <p v-if="error" style="color:var(--red); font-size:14px; margin:4px 0 0;">{{ error }}</p>
    </div>
  </div>
</template>
