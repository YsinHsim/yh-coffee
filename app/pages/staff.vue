<script setup lang="ts">
interface SessionUser { id: number; username: string; role: string }
const { user } = useUserSession();
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
    await navigateTo(sessionUser.value?.role === "admin" ? "/admin" : "/manager");
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
    <header class="hero" style="padding:12px 0 20px;">
      <h1>YH Coffee</h1>
      <p class="tagline">staff login</p>
    </header>
    <div class="card" style="flex-direction:column; align-items:stretch; padding:24px;">
      <form @submit.prevent="login">
        <input v-model="username" placeholder="Username" autocomplete="username">
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password">
        <button class="btn" style="width:100%;" :disabled="loading">Masuk →</button>
      </form>
      <p v-if="error" style="color:var(--red); font-size:14px; margin:4px 0 0;">{{ error }}</p>
    </div>
  </div>
</template>
