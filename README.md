# YH Coffee ☕

Menu + order system for a single coffee shop. Customers order from a QR-scannable page; staff manage orders from a back office. Built with Nuxt 4, Neon Postgres, deployed on Vercel.

## Pages

| Route | Who | What |
|---|---|---|
| `/` | Public | Customer menu + cart + order (no login) |
| `/staff` | Staff | Login |
| `/manager` | Manager/Admin | Live pending orders, mark paid/cancelled, daily revenue, sold-out toggle |
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

## Deploy (Vercel)

1. Push to GitHub, import the repo in Vercel (Neon integration already linked — it injects `DATABASE_URL`).
2. Add env var in Vercel: `NUXT_SESSION_PASSWORD` (same way as local).
3. On first deploy, run migrations once from your machine: `npx drizzle-kit push` (uses local `.env`).

## Config

| Env var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled) |
| `NUXT_SESSION_PASSWORD` | Session cookie signing secret, 32+ chars |

## Money handling

All prices are integers in **sen** (RM4.50 = `450`). The server re-prices every order from the DB — client-sent prices are ignored.

## Safety notes

- `.env` is gitignored; rotate `NUXT_SESSION_PASSWORD` and the admin password if either leaks.
- Admin removes are guarded: you can't delete the last admin user.
- No payment gateway — orders are pay-at-counter.

## Ideas for later phases

- Item photos (schema already has `imageUrl`), SST/tax, WhatsApp order handoff, order-ready Telegram ping, MyInvois-ready invoice export.
