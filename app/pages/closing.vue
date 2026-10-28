<script setup lang="ts">
import { NButton } from "naive-ui";

definePageMeta({ middleware: "staff-only" });

interface Report {
  day: string;
  paidOrders: number;
  cancelledOrders: number;
  collectedCents: number;
  payments: { method: string; orders: number; totalCents: number }[];
  unresolved: { id: number; orderNo: string; customerName: string; status: string; paymentStatus: string; totalCents: number }[];
  shopActivity: { actorName: string; acceptingOrders: boolean; createdAt: string }[];
  canClose: boolean;
}
const day = ref(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date()));
const report = ref<Report>();
const error = ref("");
const loading = ref(false);
const doPrint = () => window.print();
async function load() {
  loading.value = true;
  error.value = "";
  try {
    report.value = await $fetch<Report>("/api/manager/reports/daily", { query: { date: day.value } });
  } catch {
    error.value = "Could not load the daily report. Please try again.";
  } finally {
    loading.value = false;
  }
}
onMounted(load);
const rm = (cents: number) => `RM${(cents / 100).toFixed(2)}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-MY", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit" });
useHead({ title: "YH Coffee — Daily closing" });
</script>

<template>
  <div class="container staff-page" style="max-width:760px;">
    <header class="staff-header no-print">
      <div><span class="staff-kicker">YH COFFEE / SALES</span><h1>Daily closing</h1></div>
      <NuxtLink to="/manager?tab=sales" class="btn secondary small">← Sales</NuxtLink>
    </header>

    <div class="inline-form no-print">
      <input v-model="day" type="date" aria-label="Business date" @change="load">
      <NButton :loading="loading" @click="load">Refresh</NButton>
      <NButton type="primary" :disabled="!report" @click="doPrint">Print report</NButton>
    </div>
    <p v-if="error" class="staff-error">{{ error }}</p>

    <main v-if="report" class="closing-report">
      <h2>YH Coffee · {{ report.day }}</h2>
      <p class="muted">Business day: Asia/Kuala_Lumpur</p>
      <div class="statgrid">
        <div class="card"><div class="muted">Collected</div><b>{{ rm(report.collectedCents) }}</b></div>
        <div class="card"><div class="muted">Paid orders</div><b>{{ report.paidOrders }}</b></div>
        <div class="card"><div class="muted">Cancelled</div><b>{{ report.cancelledOrders }}</b></div>
      </div>

      <h2>Payments</h2>
      <p v-if="!report.payments.length" class="muted">No payments recorded for this date.</p>
      <div v-for="payment in report.payments" :key="payment.method" class="card">
        <b style="text-transform:capitalize;">{{ payment.method }}</b>
        <span>{{ payment.orders }} orders · <b>{{ rm(payment.totalCents) }}</b></span>
      </div>

      <h2>Store activity</h2>
      <p v-if="!report.shopActivity.length" class="muted">No opening or closing recorded for this date.</p>
      <div v-for="(activity, index) in report.shopActivity" :key="index" class="card">
        <div><b>Store {{ activity.acceptingOrders ? 'opened' : 'closed' }}</b><div class="muted">By {{ activity.actorName }}</div></div>
        <span>{{ time(activity.createdAt) }}</span>
      </div>

      <h2>Close-day checklist</h2>
      <div v-if="report.canClose" class="card"><b>Ready to close ✓</b><span class="muted">No unfinished orders remain.</span></div>
      <template v-else>
        <p class="staff-error">Resolve these orders before closing.</p>
        <div v-for="order in report.unresolved" :key="order.id" class="card">
          <div><b>{{ order.orderNo }}</b><div class="muted">{{ order.customerName || "Counter customer" }} · {{ order.status }} · {{ order.paymentStatus }}</div></div>
          <b>{{ rm(order.totalCents) }}</b>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.closing-report h2 { margin-top: 24px; }
.payment-choice { display: none; }
@media print {
  .no-print { display: none !important; }
  .staff-page { padding-top: 0; max-width: none; }
  .closing-report .card { box-shadow: none; break-inside: avoid; }
}
</style>
