<script setup lang="ts">
definePageMeta({ middleware: "staff-only" });

interface OrderLine { nameSnapshot: string; qty: number; priceCents: number }
interface Order {
  id: number; orderNo: string; customerName: string; note: string;
  totalCents: number; status: string; lines: OrderLine[];
}
interface Summary {
  today: { orders: number; revenue: number };
  pendingCount: number;
  items: { id: number; name: string; priceCents: number; available: boolean; categoryName: string | null }[];
}

const { user } = useUserSession();
const isAdmin = computed(() => (user.value as { role?: string } | null)?.role === "admin");
const route = useRoute();
const tab = computed(() => route.query.tab === "menu" ? "menu" : route.query.tab === "sales" ? "sales" : "orders");
const orders = ref<Order[]>([]);
const summary = ref<Summary>();
const loading = ref(true);
const refreshing = ref(false);
const updating = ref<number | null>(null);
const updatingItem = ref<number | null>(null);
const actionError = ref("");
const rm = (c: number) => `RM${(c / 100).toFixed(2)}`;
const activeOrders = computed(() => orders.value.filter((o) => o.status !== "paid" && o.status !== "cancelled"));
const paidOrders = computed(() => orders.value.filter((o) => o.status === "paid"));

async function refresh() {
  refreshing.value = true;
  try {
    const [o, s] = await Promise.all([
      $fetch<Order[]>("/api/manager/orders"),
      $fetch<Summary>("/api/manager/summary"),
    ]);
    orders.value = o;
    summary.value = s;
  } catch {
    if (loading.value) actionError.value = "Could not load staff data. Check your connection and try again.";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}
onMounted(() => {
  refresh();
  const t = setInterval(refresh, 10000);
  onUnmounted(() => clearInterval(t));
});

async function setStatus(order: Order, status: string) {
  updating.value = order.id;
  actionError.value = "";
  try {
    await $fetch(`/api/manager/orders/${order.id}/status`, { method: "POST", body: { status } });
    await refresh();
  } catch {
    actionError.value = "Could not update order. Please try again.";
  } finally {
    updating.value = null;
  }
}
async function toggleAvailable(item: { id: number; available: boolean }) {
  updatingItem.value = item.id;
  actionError.value = "";
  try {
    await $fetch(`/api/manager/items/${item.id}`, { method: "PATCH", body: { available: !item.available } });
    await refresh();
  } catch {
    actionError.value = "Could not update this item. Please try again.";
  } finally {
    updatingItem.value = null;
  }
}
async function logout() {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/staff");
}
useHead({ title: "YH Coffee — Staff" });
</script>

<template>
  <div class="container staff-page">
    <header class="staff-header">
      <div>
        <span class="staff-kicker">YH COFFEE / STAFF</span>
        <h1>{{ tab === "orders" ? "Current orders" : tab === "menu" ? "Menu availability" : "Today's sales" }}</h1>
      </div>
      <button class="btn secondary small" @click="logout">Log out</button>
    </header>

    <nav class="staff-tabs" aria-label="Staff navigation">
      <NuxtLink to="/manager" :class="{ active: tab === 'orders' }">Orders <span v-if="activeOrders.length" class="tab-count">{{ activeOrders.length }}</span></NuxtLink>
      <NuxtLink to="/manager?tab=menu" :class="{ active: tab === 'menu' }">Menu</NuxtLink>
      <NuxtLink to="/manager?tab=sales" :class="{ active: tab === 'sales' }">Sales</NuxtLink>
      <NuxtLink v-if="isAdmin" to="/admin">Admin ↗</NuxtLink>
    </nav>

    <p v-if="actionError" class="staff-error">{{ actionError }} <button @click="refresh">Retry</button></p>
    <div v-if="loading" class="loading-state" role="status">
      <span class="spinner" />
      <b>Loading staff workspace…</b>
      <p class="muted">Getting the latest orders and menu.</p>
    </div>

    <main v-else-if="tab === 'orders'">
      <div class="section-title">
        <h2>Active orders</h2>
        <span class="muted"><span v-if="refreshing" class="mini-spinner" /> Updates every 10 seconds</span>
      </div>
      <div v-if="!activeOrders.length" class="empty-state">
        <b>All caught up ✓</b>
        <p class="muted">New customer orders will appear here.</p>
      </div>
      <article v-for="o in activeOrders" :key="o.id" class="card order-card">
        <div class="order-card-head">
          <div>
            <span class="muted">ORDER</span>
            <h3>{{ o.orderNo }}</h3>
            <span v-if="o.customerName" class="customer-name">{{ o.customerName }}</span>
          </div>
          <span class="badge" :class="o.status">{{ o.status }}</span>
        </div>
        <table>
          <tr v-for="(l, i) in o.lines" :key="i">
            <td><b class="qty">{{ l.qty }}×</b> {{ l.nameSnapshot }}</td>
            <td style="text-align:right;">{{ rm(l.priceCents * l.qty) }}</td>
          </tr>
        </table>
        <p v-if="o.note" class="order-note"><b>Note:</b> {{ o.note }}</p>
        <div class="order-total"><span>Total</span><b>{{ rm(o.totalCents) }}</b></div>
        <div class="order-actions">
          <button v-if="o.status === 'pending'" class="btn" :disabled="updating === o.id" @click="setStatus(o, 'preparing')"><span v-if="updating === o.id" class="mini-spinner" />{{ updating === o.id ? "Updating…" : "Start preparing →" }}</button>
          <button v-else-if="o.status === 'preparing'" class="btn" :disabled="updating === o.id" @click="setStatus(o, 'ready')"><span v-if="updating === o.id" class="mini-spinner" />{{ updating === o.id ? "Updating…" : "Ready for pickup ✓" }}</button>
          <button v-else class="btn" :disabled="updating === o.id" @click="setStatus(o, 'paid')"><span v-if="updating === o.id" class="mini-spinner" />{{ updating === o.id ? "Updating…" : "Complete & mark paid ✓" }}</button>
          <div class="secondary-actions">
            <button v-if="o.status !== 'ready'" class="btn secondary small" @click="setStatus(o, 'paid')">Mark paid</button>
            <NuxtLink :to="`/receipt/${o.orderNo}`" class="btn secondary small">Receipt</NuxtLink>
            <button class="btn secondary small danger" @click="setStatus(o, 'cancelled')">Cancel</button>
          </div>
        </div>
      </article>
    </main>

    <main v-else-if="tab === 'menu'">
      <p class="staff-help">Turn off an item when it runs out. It disappears from the customer menu immediately.</p>
      <div v-for="item in summary?.items ?? []" :key="item.id" class="card">
        <div>
          <b>{{ item.name }}</b>
          <div class="muted">{{ item.categoryName ?? "Uncategorised" }} · {{ rm(item.priceCents) }}</div>
        </div>
        <button class="btn small" :class="{ secondary: !item.available }" :disabled="updatingItem === item.id" @click="toggleAvailable(item)">
          <span v-if="updatingItem === item.id" class="mini-spinner" />{{ updatingItem === item.id ? "Saving…" : item.available ? "Available" : "Sold out" }}
        </button>
      </div>
    </main>

    <main v-else>
      <div v-if="summary" class="statgrid">
        <div class="card"><div class="muted">Revenue today</div><b>{{ rm(summary.today.revenue) }}</b><div class="muted">counter payments</div></div>
        <div class="card"><div class="muted">Paid orders</div><b>{{ summary.today.orders }}</b><div class="muted">today</div></div>
      </div>
      <div class="section-title"><h2>Completed orders</h2><span class="muted">Latest first</span></div>
      <p v-if="!paidOrders.length" class="muted">No completed orders yet.</p>
      <div v-for="o in paidOrders" :key="o.id" class="card">
        <div><b>{{ o.orderNo }}</b><div class="muted">{{ o.customerName || "Counter customer" }}</div></div>
        <div class="sale-amount"><b>{{ rm(o.totalCents) }}</b><NuxtLink :to="`/receipt/${o.orderNo}`" class="muted">Receipt</NuxtLink></div>
      </div>
    </main>
  </div>
</template>
