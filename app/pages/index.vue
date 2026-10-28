<script setup lang="ts">
interface Category { id: number; name: string; sort: number }
interface MenuItem { id: number; categoryId: number | null; name: string; description: string; priceCents: number; imageUrl: string | null }

const cart = useState<Record<number, number>>("cart", () => ({}));

const { data, refresh } = await useFetch<{ categories: Category[]; items: MenuItem[]; acceptingOrders: boolean }>("/api/menu");
const acceptingOrders = computed(() => data.value?.acceptingOrders ?? true);
const categories = computed(() => data.value?.categories ?? []);
const items = computed(() => data.value?.items ?? []);
const itemById = (id: number | string) => items.value.find((i) => i.id === Number(id));

const total = computed(() =>
  Object.entries(cart.value).reduce((sum, [id, qty]) => sum + (itemById(id)?.priceCents ?? 0) * qty, 0),
);
const count = computed(() => Object.values(cart.value).reduce((a, b) => a + b, 0));

const grouped = computed(() =>
  categories.value
    .map((c) => ({ ...c, items: items.value.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length > 0),
);

function imageFor(item: MenuItem) {
  if (item.imageUrl) return item.imageUrl;
  const n = `${categories.value.find((c) => c.id === item.categoryId)?.name ?? ""} ${item.name}`.toLowerCase();
  if (n.includes("teh") || n.includes("tea")) return "/images/tea.jpg";
  if (n.includes("roti") || n.includes("toast")) return "/images/toast.jpg";
  if (n.includes("nasi") || n.includes("makan") || n.includes("mee")) return "/images/food.jpg";
  return "/images/coffee.jpg";
}

function add(id: number) {
  if (!acceptingOrders.value) return;
  cart.value = { ...cart.value, [id]: (cart.value[id] ?? 0) + 1 };
}
function remove(id: number) {
  const next = { ...cart.value };
  if (!next[id]) return;
  next[id]--; if (next[id] === 0) delete next[id];
  cart.value = next;
}

// Cart lives in a bottom sheet with its own scroll area, so the page
// underneath never gets covered by a growing sticky panel.
const sheetOpen = ref(false);
watch(sheetOpen, (open) => {
  if (import.meta.client) document.body.classList.toggle("locked", open);
});
watch(count, (n) => { if (n === 0) sheetOpen.value = false; });
function onKey(e: KeyboardEvent) { if (e.key === "Escape") sheetOpen.value = false; }

// Highlight the category chip for the section in view.
const activeCat = ref<number | null>(null);
let observer: IntersectionObserver | undefined;
onMounted(() => {
  window.addEventListener("keydown", onKey);
  observer = new IntersectionObserver(
    (entries) => {
      const hit = entries.find((e) => e.isIntersecting);
      if (hit) activeCat.value = Number((hit.target as HTMLElement).dataset.cat);
    },
    { rootMargin: "-80px 0px -70% 0px" },
  );
  document.querySelectorAll<HTMLElement>(".menu-section").forEach((el) => observer!.observe(el));
  activeCat.value = grouped.value[0]?.id ?? null;
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  observer?.disconnect();
  document.body.classList.remove("locked");
});

const customerName = ref("");
const note = ref("");
const submitting = ref(false);
const result = ref<{ orderNo: string; totalCents: number; trackToken: string } | null>(null);
const error = ref("");

async function submitOrder() {
  submitting.value = true;
  error.value = "";
  try {
    result.value = await $fetch<{ orderNo: string; totalCents: number; trackToken: string }>("/api/orders", {
      method: "POST",
      body: {
        customerName: customerName.value,
        note: note.value,
        items: Object.entries(cart.value).map(([id, qty]) => ({ itemId: Number(id), qty })),
      },
    });
    cart.value = {};
    sheetOpen.value = false;
    window.scrollTo({ top: 0 });
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? "Failed to submit order";
    await refresh();
  } finally {
    submitting.value = false;
  }
}

const rm = (cents: number) => `RM${(cents / 100).toFixed(2)}`;
useHead({ title: "YH Coffee — Menu" });
</script>

<template>
  <div class="container" style="padding-top:0;">
    <header class="hero menu-hero">
      <img class="brand-logo" src="/logo.svg" alt="YH Coffee logo">
      <div>
        <h1>YH Coffee</h1>
        <p class="tagline">your daily brew, done right ✨</p>
      </div>
    </header>

    <div v-if="result" class="card stack success">
      <div style="font-size:44px;">🎉</div>
      <h2 style="margin:6px 0 0;">Order masuk!</h2>
      <p class="muted" style="margin:6px 0 0;">Nombor order anda</p>
      <p class="order-no">{{ result.orderNo }}</p>
      <p class="muted" style="margin:0 0 18px;">Total <b style="color:var(--text)">{{ rm(result.totalCents) }}</b> — bayar kat kaunter ya</p>
      <NuxtLink :to="`/track/${result.trackToken}`" class="btn">Track my order →</NuxtLink>
      <button class="btn secondary" @click="result = null">Order lagi</button>
    </div>

    <template v-else>
      <div v-if="!acceptingOrders" class="card store-closed" role="status">
        <b>Store closed</b>
        <p class="muted">We are not accepting new orders right now. You can still browse the menu.</p>
      </div>
      <nav class="topbar">
        <div class="chips">
          <a
            v-for="cat in grouped" :key="cat.id"
            :href="`#cat-${cat.id}`" class="chip" :class="{ active: activeCat === cat.id }"
            @click="activeCat = cat.id"
          >{{ cat.name }}</a>
        </div>
      </nav>

      <section v-for="cat in grouped" :id="`cat-${cat.id}`" :key="cat.id" :data-cat="cat.id" class="menu-section">
        <h2 class="cat">{{ cat.name }}</h2>
        <div class="item-grid">
          <div v-for="(item, index) in cat.items" :key="item.id" class="item" :class="{ 'in-cart': cart[item.id] }" :style="{ '--delay': `${index * 55}ms` }">
            <div class="thumb">
              <img :src="imageFor(item)" :alt="item.name" loading="lazy">
            </div>
            <div class="item-body">
              <b>{{ item.name }}</b>
              <span v-if="item.description" class="muted">{{ item.description }}</span>
              <div class="item-foot">
                <span class="price">{{ rm(item.priceCents) }}</span>
                <div v-if="cart[item.id]" class="stepper">
                  <button class="icon-btn ghost" :aria-label="`Kurang ${item.name}`" @click="remove(item.id)">−</button>
                  <b>{{ cart[item.id] }}</b>
                  <button class="icon-btn" :aria-label="`Tambah ${item.name}`" @click="add(item.id)">+</button>
                </div>
                <button v-else class="icon-btn" :aria-label="`Tambah ${item.name}`" @click="add(item.id)">+</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="count" class="fab-space" />
      <button v-if="count && acceptingOrders && !sheetOpen" class="cart-fab" @click="sheetOpen = true">
        <span><span class="count">{{ count }}</span>{{ rm(total) }}</span>
        <span class="go">Lihat order →</span>
      </button>
    </template>

    <footer class="muted">
      <NuxtLink to="/staff" style="color:var(--faint); font-size:12px;">staff login</NuxtLink>
    </footer>

    <Teleport to="body">
      <div v-if="sheetOpen" class="overlay" @click.self="sheetOpen = false">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="Your order">
          <div class="handle" />
          <div class="sheet-head">
            <h3>Order anda</h3>
            <button class="icon-btn ghost" aria-label="Tutup" @click="sheetOpen = false">×</button>
          </div>
          <div class="sheet-body">
            <div v-for="(qty, id) in cart" :key="id" class="line">
              <div class="name">
                <b>{{ itemById(id)?.name }}</b>
                <div class="muted">{{ rm((itemById(id)?.priceCents ?? 0) * qty) }}</div>
              </div>
              <div class="stepper">
                <button class="icon-btn ghost" aria-label="Kurang" @click="remove(Number(id))">−</button>
                <b>{{ qty }}</b>
                <button class="icon-btn" aria-label="Tambah" @click="add(Number(id))">+</button>
              </div>
            </div>
            <input v-model="customerName" placeholder="Nama (optional)" autocomplete="given-name" style="margin-top:14px;">
            <input v-model="note" placeholder="Nota (kurang manis, dll)">
          </div>
          <div class="sheet-foot">
            <div class="total-row"><span>Total</span><span>{{ rm(total) }}</span></div>
            <button class="btn block" :disabled="submitting || !acceptingOrders" @click="submitOrder">
              {{ acceptingOrders ? (submitting ? "hantar..." : "Order sekarang") : "Store closed" }}
            </button>
            <p v-if="error" style="color:var(--red); font-size:14px; margin:10px 0 0;">{{ error }}</p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
