<script setup lang="ts">
interface Line { nameSnapshot: string; qty: number; priceCents: number }
interface Order {
  orderNo: string; customerName: string; note: string; totalCents: number;
  status: string; paymentStatus: string; createdAt: string; lines: Line[];
}
const route = useRoute();
const token = String(route.params.token);
const order = ref<Order | null>(null);
const error = ref("");
const steps = [
  { key: "pending", title: "Order received", text: "Bayar kat kaunter. Kami dah terima order anda." },
  { key: "preparing", title: "Preparing your order", text: "Our barista is on it." },
  { key: "ready", title: "Ready to collect!", text: "Show your order number at the counter." },
  { key: "completed", title: "Completed", text: "Thanks for ordering. Enjoy!" },
];
const current = computed(() => Math.max(0, steps.findIndex((s) => s.key === order.value?.status)));
const step = computed(() => steps[current.value]!);
const rm = (c: number) => `RM${(c / 100).toFixed(2)}`;

async function refresh() {
  try {
    order.value = await $fetch<Order>(`/api/orders/track/${token}`);
    error.value = "";
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? "Unable to load this order";
  }
}
onMounted(() => {
  refresh();
  const timer = setInterval(() => {
    if (order.value?.status !== "completed" && order.value?.status !== "cancelled") refresh();
  }, 10000);
  onUnmounted(() => clearInterval(timer));
});
useHead({ title: "YH Coffee — Track Order", meta: [{ name: "robots", content: "noindex" }] });
</script>

<template>
  <div class="container track-page">
    <img class="brand-logo" src="/logo.svg" alt="YH Coffee">
    <template v-if="order">
      <p class="track-label">ORDER {{ order.orderNo }}</p>
      <template v-if="order.status === 'cancelled'">
        <h1>Order cancelled</h1>
        <p class="muted">Please ask our staff at the counter.</p>
      </template>
      <template v-else>
        <h1>{{ step.title }}</h1>
        <p class="track-copy">{{ step.text }}</p>
        <p class="muted">{{ order.paymentStatus === 'paid' ? 'Payment received. Thank you!' : 'Please pay at the counter.' }}</p>
        <div class="progress" aria-label="Order progress">
          <span v-for="(_, i) in 3" :key="i" :class="{ done: i <= Math.min(current, 2) }" />
        </div>
      </template>

      <div class="card stack order-details">
        <h2 class="cat">Your order</h2>
        <div v-for="(line, i) in order.lines" :key="i" class="total-row order-line">
          <span>{{ line.qty }}× {{ line.nameSnapshot }}</span>
          <span>{{ rm(line.priceCents * line.qty) }}</span>
        </div>
        <div class="total-row grand-total"><span>Total</span><span>{{ rm(order.totalCents) }}</span></div>
        <p v-if="order.note" class="muted">Nota: {{ order.note }}</p>
        <span class="badge" :class="order.status">{{ order.status }}</span>
      </div>
      <p class="muted track-note">This page refreshes automatically. Keep your order number for collection.</p>
    </template>
    <p v-else-if="error" class="track-error">{{ error }}</p>
    <p v-else class="muted">Loading your order…</p>
    <NuxtLink to="/" class="btn secondary block">Back to menu</NuxtLink>
  </div>
</template>
