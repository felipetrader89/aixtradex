import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Clientes (e você, como admin — o papel de admin vem da env ADMIN_EMAILS).
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  country: text("country"),
  createdAt: createdAt(),
});

// Código de 6 dígitos enviado por email pro login (guardado só o hash).
export const loginCodes = pgTable(
  "login_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("login_codes_email_idx").on(t.email)]
);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// Pedido feito no checkout. "pending" até o pagamento ser confirmado (manual no admin ou automático pela Binance).
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    product: text("product").notNull(),
    plan: text("plan", { enum: ["monthly", "lifetime"] }).notNull(),
    amountUsd: numeric("amount_usd", { precision: 12, scale: 2 }).notNull(),
    // Valor exato a pagar em USDT/USDC: preço + centavos únicos (ex.: 99.37), pra Binance achar o pedido pelo depósito.
    payAmount: numeric("pay_amount", { precision: 12, scale: 2 }),
    // Idioma do site na hora da compra (emails de confirmação saem nele).
    locale: text("locale"),
    broker: text("broker"),
    mt4Logins: text("mt4_logins").array().notNull().default([]),
    // Renovação de uma licença mensal já existente.
    licenseId: uuid("license_id"),
    status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull().default("pending"),
    paymentMethod: text("payment_method"),
    paymentRef: text("payment_ref"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    // Dois pedidos pendentes nunca têm o mesmo valor exato.
    uniqueIndex("orders_pending_pay_amount_uq").on(t.payAmount).where(sql`status = 'pending'`),
  ]
);

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    product: text("product").notNull(),
    plan: text("plan", { enum: ["monthly", "lifetime"] }).notNull(),
    status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
    maxAccounts: integer("max_accounts").notNull(),
    // Corretora parceira (IB) — mantém o desconto recorrente nas renovações da mensal.
    broker: text("broker"),
    // null = vitalícia.
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    // Quantas vezes o CLIENTE já trocou uma conta MT4 cadastrada por outra (limite em FREE_ACCOUNT_SWAPS).
    // Preencher vaga vazia não conta. Troca feita pelo admin não conta e o admin pode zerar.
    accountSwapsUsed: integer("account_swaps_used").notNull().default(0),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("licenses_user_idx").on(t.userId)]
);

// Contas MT4 liberadas em cada licença. O robô consulta por aqui.
export const licenseAccounts = pgTable(
  "license_accounts",
  {
    id: serial("id").primaryKey(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    product: text("product").notNull(),
    login: text("login").notNull(),
    lastCheckAt: timestamp("last_check_at", { withTimezone: true }),
    lastIp: text("last_ip"),
    lastEaVersion: text("last_ea_version"),
    lastServer: text("last_server"),
    createdAt: createdAt(),
  },
  // Uma conta MT4 só pode estar em uma licença por produto.
  (t) => [uniqueIndex("license_accounts_product_login_uq").on(t.product, t.login)]
);

// Versões do robô pra download. O arquivo fica no próprio banco (base64), já que .ex4/.zip são pequenos.
export const productVersions = pgTable("product_versions", {
  id: serial("id").primaryKey(),
  product: text("product").notNull(),
  version: text("version").notNull(),
  notes: text("notes"),
  fileName: text("file_name").notNull(),
  size: integer("size").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: createdAt(),
});

export const productFiles = pgTable("product_files", {
  versionId: integer("version_id")
    .primaryKey()
    .references(() => productVersions.id, { onDelete: "cascade" }),
  dataBase64: text("data_base64").notNull(),
});

// Depósitos lidos da Binance (rede: USDT/USDC; Binance Pay). "matched" = pagou um pedido sozinho;
// "unmatched" = valor não bateu com nenhum pedido (admin decide); "ignored" = admin marcou como não sendo de cliente.
export const cryptoDeposits = pgTable(
  "crypto_deposits",
  {
    id: serial("id").primaryKey(),
    source: text("source", { enum: ["deposit", "pay"] }).notNull(),
    externalId: text("external_id").notNull().unique(),
    coin: text("coin").notNull(),
    network: text("network"),
    amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
    txId: text("tx_id"),
    sender: text("sender"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    status: text("status", { enum: ["matched", "unmatched", "ignored"] }).notNull().default("unmatched"),
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: createdAt(),
  },
  (t) => [index("crypto_deposits_status_idx").on(t.status)]
);

// Configurações e estado simples (ex.: última leitura da Binance).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Histórico do admin: quem mudou o quê (configurações, aprovações, licenças). Só leitura na aba Sistema.
export const adminEvents = pgTable(
  "admin_events",
  {
    id: serial("id").primaryKey(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("admin_events_created_idx").on(t.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type LicenseAccount = typeof licenseAccounts.$inferSelect;
export type ProductVersion = typeof productVersions.$inferSelect;
export type CryptoDeposit = typeof cryptoDeposits.$inferSelect;
