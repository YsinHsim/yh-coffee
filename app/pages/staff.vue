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
  <div class="container" style="max-width:380px; margin-top:10vh;">
    <h1 style="text-align:center;">☕ YH Coffee</h1>
    <div class="card" style="flex-direction:column; align-items:stretch; padding:20px;">
      <h2 style="margin-top:0;">Staff Login</h2>
      <form @submit.prevent="login">
        <input v-model="username" placeholder="Username" autocomplete="username">
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password">
        <button class="btn" style="width:100%;" :disabled="loading">Login</button>
      </form>
      <p v-if="error" style="color:#a02030; font-size:14px;">{{ error }}</p>
    </div>
  </div>
</template>
