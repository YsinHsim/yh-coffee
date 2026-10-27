<script setup lang="ts">
interface Category { id: number; name: string; sort: number }
interface MenuItem { id: number; categoryId: number | null; name: string; description: string; priceCents: number; imageUrl: string | null }

const cart = useState<Record<number, number>>("cart", () => ({}));

const { data } = await useFetch<{ categories: Category[]; items: MenuItem[] }>("/api/menu");
const categories = computed(() => data.value?.categories ?? []);
const items = computed(() => data.value?.items ?? []);

const total = computed(() =>
  Object.entries(cart.value).reduce((sum, [id, qty]) => {
    const item = items.value.find((i) => i.id === Number(id));
    return sum + (item ? item.priceCents * qty : 0);
  }, 0),
);

const grouped = computed(() =>
  categories.value
    .map((c) => ({ ...c, items: items.value.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length > 0),
);

function add(id: number) {
  cart.value = { ...cart.value, [id]: (cart.value[id] ?? 0) + 1 };
}
function remove(id: number) {
  const next = { ...cart.value };
  if (!next[id]) return;
  next[id]--; if (next[id] === 0) delete next[id];
  cart.value = next;
}

const customerName = ref("");
const note = ref("");
const submitting = ref(false);
const result = ref<{ orderNo: string; totalCents: number } | null>(null);
const error = ref("");

async function submitOrder() {
  submitting.value = true;
  error.value = "";
  try {
    result.value = await $fetch<{ orderNo: string; totalCents: number }>("/api/orders", {
      method: "POST",
      body: {
        customerName: customerName.value,
        note: note.value,
        items: Object.entries(cart.value).map(([id, qty]) => ({ itemId: Number(id), qty })),
      },
    });
    cart.value = {};
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? "Failed to submit order";
  } finally {
    submitting.value = false;
  }
}

const rm = (cents: number) => `RM${(cents / 100).toFixed(2)}`;
useHead({ title: "YH Coffee — Menu" });
</script>

<template>
  <div class="container">
    <header style="text-align:center; padding: 20px 0;">
      <h1 style="margin:0;">☕ YH Coffee</h1>
      <p class="muted">Pesan di sini, ambil di kaunter</p>
    </header>

    <div v-if="result" class="card" style="flex-direction:column; text-align:center; padding:24px;">
      <h2 style="margin:0 0 8px;">Order diterima!</h2>
      <p style="font-size:28px; font-weight:700; margin:8px 0;">{{ result.orderNo }}</p>
      <p>Total: <b>{{ rm(result.totalCents) }}</b> — bayar di kaunter</p>
      <button class="btn" @click="result = null">Order lagi</button>
    </div>

    <template v-else>
      <div v-for="cat in grouped" :key="cat.id" style="margin-bottom:24px;">
        <h2 style="border-bottom:2px solid var(--brown); padding-bottom:4px;">{{ cat.name }}</h2>
        <div v-for="item in cat.items" :key="item.id" class="card">
          <div style="flex:1;">
            <b>{{ item.name }}</b>
            <div v-if="item.description" class="muted">{{ item.description }}</div>
            <div class="price">{{ rm(item.priceCents) }}</div>
          </div>
          <div v-if="cart[item.id]" style="display:flex; align-items:center; gap:10px;">
            <button class="btn secondary" style="padding:4px 12px;" @click="remove(item.id)">−</button>
            <b>{{ cart[item.id] }}</b>
            <button class="btn" style="padding:4px 12px;" @click="add(item.id)">+</button>
          </div>
          <button v-else class="btn" @click="add(item.id)">+ Add</button>
        </div>
      </div>

      <div v-if="Object.keys(cart).length" class="card" style="flex-direction:column; position:sticky; bottom:12px; box-shadow:0 -2px 12px rgba(0,0,0,0.15);">
        <h3 style="margin:0 0 8px;">Order summary</h3>
        <div v-for="(qty, id) in cart" :key="id" style="display:flex; justify-content:space-between; width:100%; font-size:14px;">
          <span>{{ qty }}× {{ items.find(i => i.id === Number(id))?.name }}</span>
          <span>{{ rm((items.find(i => i.id === Number(id))?.priceCents ?? 0) * qty) }}</span>
        </div>
        <hr style="width:100%; border:0; border-top:1px solid #eee;">
        <div style="display:flex; justify-content:space-between; width:100%; font-weight:700;">
          <span>Total</span><span>{{ rm(total) }}</span>
        </div>
        <input v-model="customerName" placeholder="Nama (optional)" style="margin-top:10px;">
        <input v-model="note" placeholder="Nota (kurang manis, dll)">
        <button class="btn" style="width:100%;" :disabled="submitting" @click="submitOrder">
          {{ submitting ? "Menghantar..." : `Order — ${rm(total)}` }}
        </button>
        <p v-if="error" style="color:#a02030; font-size:14px;">{{ error }}</p>
      </div>
    </template>

    <footer style="text-align:center; padding:24px 0;" class="muted">
      <NuxtLink to="/staff" style="color:#aaa;">Staff</NuxtLink>
    </footer>
  </div>
</template>
