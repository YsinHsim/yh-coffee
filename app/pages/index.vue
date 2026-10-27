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
    <header class="hero">
      <h1>YH Coffee</h1>
      <p class="tagline">pesan sini, ambil kat kaunter ✨</p>
    </header>

    <div v-if="result" class="card" style="flex-direction:column; text-align:center; padding:32px 20px; border-color: rgba(126,231,135,0.4);">
      <div style="font-size:40px;">🎉</div>
      <h2 style="margin:8px 0 4px;">Order masuk!</h2>
      <p style="font-family:'Space Grotesk'; font-size:32px; font-weight:700; color:var(--accent); margin:10px 0; letter-spacing:0.04em;">{{ result.orderNo }}</p>
      <p class="muted">Total <b style="color:var(--text)">{{ rm(result.totalCents) }}</b> — bayar kat kaunter ya</p>
      <button class="btn secondary" @click="result = null">Order lagi</button>
    </div>

    <template v-else>
      <div v-for="cat in grouped" :key="cat.id">
        <h2 class="cat">{{ cat.name }}</h2>
        <div v-for="item in cat.items" :key="item.id" class="card">
          <div style="flex:1;">
            <b>{{ item.name }}</b>
            <div v-if="item.description" class="muted">{{ item.description }}</div>
            <span class="price">{{ rm(item.priceCents) }}</span>
          </div>
          <div v-if="cart[item.id]" style="display:flex; align-items:center; gap:10px;">
            <button class="btn secondary pill-qty" @click="remove(item.id)">−</button>
            <b style="min-width:18px; text-align:center;">{{ cart[item.id] }}</b>
            <button class="btn pill-qty" @click="add(item.id)">+</button>
          </div>
          <button v-else class="btn small" @click="add(item.id)">+ Add</button>
        </div>
      </div>

      <div v-if="Object.keys(cart).length" class="cartbar">
        <h3 style="margin:0 0 10px;">🛒 Your order</h3>
        <div v-for="(qty, id) in cart" :key="id" style="display:flex; justify-content:space-between; width:100%; font-size:14px; padding:2px 0;">
          <span>{{ qty }}× {{ items.find(i => i.id === Number(id))?.name }}</span>
          <span>{{ rm((items.find(i => i.id === Number(id))?.priceCents ?? 0) * qty) }}</span>
        </div>
        <div style="display:flex; justify-content:space-between; width:100%; margin-top:10px; font-family:'Space Grotesk'; font-weight:700; font-size:18px;">
          <span>Total</span><span style="color:var(--accent)">{{ rm(total) }}</span>
        </div>
        <input v-model="customerName" placeholder="Nama (optional)" style="margin-top:14px;">
        <input v-model="note" placeholder="Nota (kurang manis, dll)">
        <button class="btn" style="width:100%;" :disabled="submitting" @click="submitOrder">
          {{ submitting ? "hantar..." : `Order sekarang — ${rm(total)}` }}
        </button>
        <p v-if="error" style="color:var(--red); font-size:14px;">{{ error }}</p>
      </div>
    </template>

    <footer class="muted">
      <NuxtLink to="/staff" style="color:#5c554c; font-size:12px;">staff login</NuxtLink>
    </footer>
  </div>
</template>
