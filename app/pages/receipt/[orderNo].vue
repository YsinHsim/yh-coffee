<script setup lang="ts">
const route = useRoute();
const orderNo = computed(() => String(route.params.orderNo));

interface Line { nameSnapshot: string; qty: number; priceCents: number }
interface Order {
  id: number; orderNo: string; customerName: string; note: string;
  totalCents: number; status: string; paymentMethod: string | null; paidAt: string | null; createdAt: string; lines: Line[];
}
const order = ref<Order | null>(null);
const error = ref("");

onMounted(async () => {
  try {
    const all = await $fetch<Order[]>("/api/manager/orders");
    order.value = all.find((o) => o.orderNo === orderNo.value) ?? null;
    if (!order.value) error.value = "Order not found";
  } catch {
    error.value = "Please log in at /staff first";
  }
});

const rm = (c: number) => `RM${(c / 100).toFixed(2)}`;
const dt = (iso: string) => new Date(iso).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
const doPrint = () => window.print();
useHead({ title: "YH Coffee — Receipt" });
</script>

<template>
  <div class="container" style="max-width:400px;">
    <p v-if="error" class="muted" style="text-align:center; margin-top:20vh;">{{ error }}</p>
    <div v-else-if="order" class="receipt">
      <div style="text-align:center; margin-bottom:16px;">
        <h1 style="margin:0; font-size:22px;">☕ YH Coffee</h1>
        <div class="muted">{{ dt(order.createdAt) }}</div>
        <div><b>{{ order.orderNo }}</b></div>
      </div>
      <table>
        <tr v-for="(l, i) in order.lines" :key="i">
          <td>{{ l.qty }}× {{ l.nameSnapshot }}</td>
          <td style="text-align:right;">{{ rm(l.priceCents * l.qty) }}</td>
        </tr>
      </table>
      <hr>
      <div style="display:flex; justify-content:space-between; font-weight:700; font-size:18px;">
        <span>TOTAL</span><span>{{ rm(order.totalCents) }}</span>
      </div>
      <div v-if="order.paymentMethod" style="margin-top:8px;">Payment: <b style="text-transform:uppercase;">{{ order.paymentMethod }}</b><span v-if="order.paidAt"> · {{ dt(order.paidAt) }}</span></div>
      <div v-if="order.customerName" style="margin-top:8px;">Nama: {{ order.customerName }}</div>
      <div v-if="order.note" class="muted">Nota: {{ order.note }}</div>
      <div style="text-align:center; margin-top:24px;" class="muted">Terima kasih! 🙏</div>
    </div>
    <div class="no-print" style="display:flex; gap:8px; justify-content:center; margin-top:16px;">
      <button class="btn" @click="doPrint">🖨 Print</button>
      <NuxtLink to="/manager" class="btn secondary">Back to orders</NuxtLink>
    </div>
  </div>
</template>

