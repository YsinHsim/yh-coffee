# YH Coffee ☕

Menu + order system for a single coffee shop. Customers order from a QR-scannable page; staff manage orders from a back office. Built with Nuxt 4, Neon Postgres, deployed on Vercel.

## Pages

| Route | Who | What |
|---|---|---|
| `/` | Public | Customer menu + cart + order (no login) |
| `/track/:token` | Public | Private customer order-progress page, refreshed automatically |
| `/staff` | Staff | Login; all staff land on the current-orders page |
| `/manager` | Manager/Admin | Staff home: Orders, Menu, and Sales tabs |
| `/closing` | Manager/Admin | Printable daily report, payment totals, and close-day checklist |
| `/admin` | Admin | CRUD items, categories, users |
| `/receipt/:orderNo` | Staff | Printable receipt |

## Local setup

1. **Neon**: create a project at neon.tech, copy the connection string.
2. **Env**: create `.env` (never commit it):
   ```
   DATABASE_URL="postgresql://..."
   NUXT_SESSION_PASSWORD="<openssl rand -base64 32>"
   ```
3. **Install & migrate & seed**:
   ```bash
   npm install
   npx drizzle-kit push
   SEED_ADMIN_PASS=yourpassword npx tsx scripts/seed.ts
   ```
   Seed creates the `admin` user + a sample menu.
4. **Run**: `npm run dev` → http://localhost:3000

When upgrading an existing deployment, run `npx tsx scripts/backfill-payments.ts` and `npx tsx scripts/migrate-payment-status.ts` once after the schema push. They preserve legacy counter payments and convert the old combined `paid` status into `completed` fulfilment plus `paid` payment.

With the dev server running, `npm run test:phase1` and `npm run test:phase2` smoke-test operational safety and daily payment reports against a local database. It creates and removes temporary staff/orders; never run it against production data. To use an isolated Neon development branch, explicitly set `ALLOW_REMOTE_PHASE1_TEST=true`.

## Deploy (Vercel)

1. Push to GitHub, import the repo in Vercel (Neon integration already linked — it injects `DATABASE_URL`).
2. Add env var in Vercel: `NUXT_SESSION_PASSWORD` (same way as local).
3. On first deploy, run migrations once from your machine: `npx drizzle-kit push` (uses local `.env`).

## Config

| Env var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled) |
| `NUXT_SESSION_PASSWORD` | Session cookie signing secret, 32+ chars |

## Ordering and payment plan

The core use case is QR ordering for a single coffee shop: customers order on their phones, staff prepare orders, and customers collect them at the counter.

Three payment channels are planned, but **only counter payment is implemented now**:

| Channel | Methods | Handled by | Payment confirmation |
|---|---|---|---|
| Smartphone | Card, e-wallet, online QR (provider-dependent) | Customer | Verified provider webhook; future integration |
| Physical terminal | All supported methods except cash | Customer | Terminal/provider integration; future integration |
| Counter | Cash and all other supported methods | Cashier | Cashier taps **Paid**; currently implemented |

The app must never collect raw card details itself. Smartphone and terminal orders should enter staff preparation only after automatic payment confirmation. Counter orders can be accepted before payment.

### Current implementation

- Fulfilment flow: `pending → preparing → ready → completed`; `cancelled` is also supported. Payment state is independent: `unpaid → paid`.
- Staff explicitly confirm that cash, QR, card, or other counter payment was received. The server records `paidAt` and the staff actor, rejects duplicate payments, and allows paid orders to continue through fulfilment. Paid orders cannot be cancelled without a refund workflow.
- The manager page lists active and recently completed orders, with controls to advance fulfilment and record payment.
- Each new order gets an unguessable 192-bit tracking token. Its `/track/:token` link shows only that order and refreshes every 10 seconds. Predictable order numbers are never accepted as public tracking credentials.
- The customer tracking page is optional for the shop. A future collection display can show order numbers without customer details.
- Staff can open or close the store. Closing is blocked until all orders are completed and paid, or unpaid orders are cancelled; the public API also rejects new orders while closed.
- Order creation runs in a database transaction with an atomic Malaysia-time daily counter, preventing duplicate order numbers and partial orders.
- Staff status changes record the actor, previous status, new status, and timestamp. Only valid forward transitions are accepted.
- The printable daily report uses `Asia/Kuala_Lumpur`, breaks down collections by payment method, counts paid/cancelled orders, and lists unfinished orders that block closing.
- Admins can deactivate employees without deleting their history. Deactivation invalidates every existing session, and every staff API checks the live user account rather than trusting only the cookie.

### Future payment integration

Before enabling smartphone or terminal checkout, extend payment state with `pending` and `failed`. Choose a provider, model its supported methods and fees, then verify webhook signatures and process callbacks idempotently. The physical terminal requires an API capable of linking its transaction to an order. Selecting QR or card currently records an externally received payment; it does not charge or verify a transaction.

## Menu images

Phase 1.5 includes local stock photos in `public/images`. Items without an `imageUrl` get a default based on their category/name. Admins can select a default or paste a full image URL when adding an item. No bucket is needed now; Cloudflare R2 can supply those URLs later.

## Appearance

The customer and staff interfaces support light and dark themes. The top-right toggle saves the choice in the browser's local storage; without a saved choice, the app follows the device preference. The design uses neutral surfaces, compact spacing, and a single amber accent. Staff controls and loading states use Naive UI; the customer menu remains lightweight custom Vue/CSS.

## Money handling

All prices are integers in **sen** (RM4.50 = `450`). The server re-prices every order from the DB — client-sent prices are ignored.

## Safety notes

- `.env` is gitignored; rotate `NUXT_SESSION_PASSWORD` and the admin password if either leaks.
- Admin removes are guarded: you can't delete the last admin user.
- No payment gateway — orders are pay-at-counter.

## Ideas for later phases

- Item photos (schema already has `imageUrl`), SST/tax, WhatsApp order handoff, order-ready Telegram ping, MyInvois-ready invoice export.
