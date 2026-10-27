<script setup lang="ts">
definePageMeta({ middleware: "staff-only" });

interface OrderLine { nameSnapshot: string; qty: number; priceCents: number }
interface Order {
  id: number; orderNo: string; customerName: string; note: string;
  totalCents: number; status: string; lines: OrderLine[];
}

const orders = ref<Order[]>([]);
const summary = ref<{ today: { orders: number; revenue: number }; pendingCount: number; items: { id: number; name: string; priceCents: number; available: boolean; categoryName: string | null }[] } | undefined>(undefined);
const rm = (c: number) => `RM${(c / 100).toFixed(2)}`;

async function refresh() {
  const [o, s] = await Promise.all([
    $fetch<Order[]>("/api/manager/orders?status=pending"),
    $fetch<NonNullable<typeof summary.value>>("/api/manager/summary"),
  ]);
  orders.value = o;
  summary.value = s;
}
onMounted(() => {
  refresh();
  const t = setInterval(refresh, 10000);
  onUnmounted(() => clearInterval(t));
});

async function setStatus(order: Order, status: string) {
  await $fetch(`/api/manager/orders/${order.id}/status`, { method: "POST", body: { status } });
  await refresh();
}
async function toggleAvailable(item: { id: number; available: boolean }) {
  await $fetch(`/api/manager/items/${item.id}`, { method: "PATCH", body: { available: !item.available } });
  await refresh();
}
async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/");
}
useHead({ title: "YH Coffee — Manager" });
</script>

<template>
  <div class="container">
    <header style="display:flex; justify-content:space-between; align-items:center; padding:12px 0;">
      <h1 style="margin:0; font-size:22px;">☕ Manager</h1>
      <div>
        <NuxtLink v-if="summary" to="/admin" class="btn secondary" style="font-size:14px;">Admin</NuxtLink>
        <button class="btn secondary" style="font-size:14px;" @click="logout">Logout</button>
      </div>
    </header>

    <div v-if="summary" style="display:flex; gap:10px; margin-bottom:16px;">
      <div class="card" style="flex:1; flex-direction:column; align-items:center;">
        <div class="muted">Paid today</div>
        <b style="font-size:22px;">{{ rm(summary.today.revenue) }}</b>
        <div class="muted">{{ summary.today.orders }} orders</div>
      </div>
      <div class="card" style="flex:1; flex-direction:column; align-items:center;">
        <div class="muted">Pending</div>
        <b style="font-size:22px;">{{ summary.pendingCount }}</b>
        <div class="muted">orders</div>
      </div>
    </div>

    <h2>Pending Orders</h2>
    <p v-if="!orders.length" class="muted">No pending orders.</p>
    <div v-for="o in orders" :key="o.id" class="card" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between;">
        <b>{{ o.orderNo }}</b>
        <span class="badge pending">{{ o.status }}</span>
      </div>
      <div v-if="o.customerName" class="muted">Nama: {{ o.customerName }}</div>
      <table>
        <tr v-for="(l, i) in o.lines" :key="i">
          <td>{{ l.qty }}× {{ l.nameSnapshot }}</td>
          <td style="text-align:right;">{{ rm(l.priceCents * l.qty) }}</td>
        </tr>
      </table>
      <div style="display:flex; justify-content:space-between; font-weight:700; margin:6px 0;">
        <span>Total</span><span>{{ rm(o.totalCents) }}</span>
      </div>
      <div v-if="o.note" class="muted" style="margin-bottom:6px;">Nota: {{ o.note }}</div>
      <div style="display:flex; gap:8px;">
        <button class="btn" style="flex:1;" @click="setStatus(o, 'paid')">✓ Paid</button>
        <NuxtLink :to="`/receipt/${o.orderNo}`" class="btn secondary" style="text-align:center;">🖨</NuxtLink>
        <button class="btn secondary" @click="setStatus(o, 'cancelled')">✗ Cancel</button>
      </div>
    </div>

    <h2>Menu Availability</h2>
    <div v-for="item in summary?.items ?? []" :key="item.id" class="card">
      <div>
        <b>{{ item.name }}</b>
        <div class="muted">{{ item.categoryName ?? "Uncategorised" }} · {{ rm(item.priceCents) }}</div>
      </div>
      <button class="btn" :class="{ secondary: !item.available }" style="font-size:13px; padding:6px 12px;" @click="toggleAvailable(item)">
        {{ item.available ? "Available" : "Sold out" }}
      </button>
    </div>
  </div>
</template>
