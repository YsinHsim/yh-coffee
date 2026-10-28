import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(), // sen, e.g. RM4.50 = 450
  available: boolean("available").notNull().default(true),
  imageUrl: text("image_url"),
  sort: integer("sort").notNull().default(0),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNo: text("order_no").notNull().unique(), // e.g. 20261027-001
    customerName: text("customer_name").notNull().default(""),
    note: text("note").notNull().default(""),
    totalCents: integer("total_cents").notNull().default(0),
    status: text("status").notNull().default("pending"), // pending | preparing | ready | completed | cancelled
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid
    paymentMethod: text("payment_method"), // cash | qr | card | other
    paidAt: timestamp("paid_at", { withTimezone: true }),
    trackToken: text("track_token").notNull().unique(), // private customer tracking link
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => items.id),
  nameSnapshot: text("name_snapshot").notNull(), // survives item rename/delete
  priceCents: integer("price_cents").notNull(),
  qty: integer("qty").notNull().default(1),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("manager"), // manager | admin
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderCounters = pgTable("order_counters", {
  day: text("day").primaryKey(), // YYYY-MM-DD in Asia/Kuala_Lumpur
  nextNumber: integer("next_number").notNull().default(1),
});

export const shop = pgTable("shop", {
  id: integer("id").primaryKey().default(1),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shopEvents = pgTable("shop_events", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  fromAcceptingOrders: boolean("from_accepting_orders").notNull(),
  toAcceptingOrders: boolean("to_accepting_orders").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
