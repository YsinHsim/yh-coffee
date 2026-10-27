<script setup lang="ts">
definePageMeta({ middleware: "staff-only" });

interface Item { id: number; categoryId: number | null; name: string; description: string; priceCents: number; available: boolean; imageUrl: string | null }
interface Category { id: number; name: string; sort: number }
interface User { id: number; username: string; role: string }
interface Data { categories: Category[]; items: Item[]; users: User[] }

const data = ref<Data | undefined>(undefined);
const rm = (c: number) => `RM${(c / 100).toFixed(2)}`;

async function refresh(): Promise<Data> {
  const res = await $fetch<{ categories: Category[]; items: Item[]; users: User[] }>("/api/admin/catalog");
  data.value = res;
  return res;
}
onMounted(refresh);

// item form
const form = ref({ name: "", description: "", price: "", categoryId: "" as string | number, imageUrl: "" });
async function addItem() {
  if (!form.value.name || !form.value.price) return;
  await $fetch("/api/admin/catalog", {
    method: "POST",
    body: {
      name: form.value.name,
      description: form.value.description,
      priceCents: Math.round(parseFloat(form.value.price) * 100),
      categoryId: form.value.categoryId || null,
      imageUrl: form.value.imageUrl,
    },
  });
  form.value = { name: "", description: "", price: "", categoryId: "", imageUrl: "" };
  await refresh();
}
async function patchItem(id: number, body: Record<string, unknown>) {
  await $fetch(`/api/admin/catalog/${id}`, { method: "PATCH", body: { kind: "item", ...body } });
  await refresh();
}
async function deleteItem(id: number) {
  if (!confirm("Delete this item?")) return;
  await $fetch(`/api/admin/catalog/${id}?kind=item`, { method: "DELETE" });
  await refresh();
}

// category form
const catName = ref("");
async function addCategory() {
  if (!catName.value) return;
  await $fetch("/api/admin/catalog", { method: "POST", body: { type: "category", name: catName.value } });
  catName.value = "";
  await refresh();
}
async function deleteCategory(id: number) {
  if (!confirm("Delete category? Items become uncategorised.")) return;
  await $fetch(`/api/admin/catalog/${id}?kind=category`, { method: "DELETE" });
  await refresh();
}

// user form
const newUser = ref({ username: "", password: "", role: "manager" });
async function addUser() {
  if (!newUser.value.username || !newUser.value.password) return;
  await $fetch("/api/admin/catalog", { method: "POST", body: { type: "user", ...newUser.value } });
  newUser.value = { username: "", password: "", role: "manager" };
  await refresh();
}
async function deleteUser(id: number) {
  if (!confirm("Remove this user?")) return;
  await $fetch(`/api/admin/catalog/${id}?kind=user`, { method: "DELETE" });
  await refresh();
}
async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/");
}
useHead({ title: "YH Coffee — Admin" });
</script>

<template>
  <div class="container" style="max-width:760px;">
    <header class="hero" style="padding:24px 0;">
      <h1 style="font-size:2rem;">YH Coffee</h1>
      <p class="tagline">admin mode</p>
    </header>
    <div style="display:flex; gap:8px; margin-bottom:16px;">
      <NuxtLink to="/manager" class="btn secondary small" style="flex:1;">📋 Manager</NuxtLink>
      <button class="btn secondary small" style="flex:1;" @click="logout">Log keluar</button>
    </div>

    <!-- Categories -->
    <h2 class="cat">Categories</h2>
    <div v-for="c in data?.categories ?? []" :key="c.id" class="card">
      <b>{{ c.name }}</b>
      <button class="btn secondary small" @click="deleteCategory(c.id)">Delete</button>
    </div>
    <div class="inline-form" style="margin-bottom:24px;">
      <input v-model="catName" placeholder="New category name">
      <button class="btn" @click="addCategory">Add</button>
    </div>

    <!-- Items -->
    <h2 class="cat">Items</h2>
    <div v-for="item in data?.items ?? []" :key="item.id" class="card">
      <div style="flex:1;">
        <b>{{ item.name }}</b>
        <div class="muted">
          {{ data?.categories.find(c => c.id === item.categoryId)?.name ?? "Uncategorised" }}
          · {{ rm(item.priceCents) }} · {{ item.available ? "available" : "sold out" }}
        </div>
      </div>
      <div class="row-actions">
        <button class="btn secondary small" @click="patchItem(item.id, { available: !item.available })">
          {{ item.available ? "Hide" : "Show" }}
        </button>
        <button class="btn secondary small" @click="deleteItem(item.id)">Del</button>
      </div>
    </div>

    <div class="card" style="flex-direction:column; align-items:stretch; margin-top:12px;">
      <b style="margin-bottom:8px;">Add item</b>
      <input v-model="form.name" placeholder="Name">
      <input v-model="form.description" placeholder="Description (optional)">
      <div class="inline-form">
        <input v-model="form.price" type="number" inputmode="decimal" step="0.05" placeholder="Price RM">
        <select v-model="form.categoryId">
          <option value="">No category</option>
          <option v-for="c in data?.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <button class="btn" style="margin-top:10px;" @click="addItem">Add item</button>
    </div>

    <!-- Users -->
    <h2 class="cat" style="margin-top:32px;">Users</h2>
    <div v-for="u in data?.users ?? []" :key="u.id" class="card">
      <div><b>{{ u.username }}</b> <span class="muted">{{ u.role }}</span></div>
      <button class="btn secondary small" @click="deleteUser(u.id)">Remove</button>
    </div>
    <div class="card" style="flex-direction:column; align-items:stretch; margin-top:12px;">
      <b style="margin-bottom:8px;">Add user</b>
      <input v-model="newUser.username" placeholder="Username">
      <input v-model="newUser.password" type="password" placeholder="Password">
      <select v-model="newUser.role">
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
      <button class="btn" @click="addUser">Add user</button>
    </div>
  </div>
</template>
