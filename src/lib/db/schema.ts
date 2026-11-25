import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
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
  // Última vez que o cliente abriu o portal (atualizado no máximo 1x por minuto) - mostra quem está online no admin.
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  // Admin: até qual item do feed de atividade ele já viu (o sininho conta o que vier depois).
  activitySeenId: integer("activity_seen_id").notNull().default(0),
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
  // Observações por idioma ({ pt, en, es }); o cliente vê a do idioma dele (cai em `notes` se faltar).
  notesI18n: jsonb("notes_i18n").$type<Partial<Record<"pt" | "en" | "es", string>>>(),
  fileName: text("file_name").notNull(),
  size: integer("size").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: createdAt(),
});

// Arquivo do robô por idioma (pt/en/es). lang "" = arquivo único, sem idioma (versões antigas).
export const productFiles = pgTable(
  "product_files",
  {
    versionId: integer("version_id")
      .notNull()
      .references(() => productVersions.id, { onDelete: "cascade" }),
    lang: text("lang").notNull().default(""),
    size: integer("size").notNull().default(0),
    dataBase64: text("data_base64").notNull(),
  },
  (t) => [primaryKey({ columns: [t.versionId, t.lang] })]
);

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

// Últimos dados de cada conta MT4, enviados pelo robô junto com a consulta de licença (a cada 5 min).
// Dias pelo horário da corretora. Resultado = trades fechados; saldo no início do período já desconta depósitos/saques.
export const accountStats = pgTable(
  "account_stats",
  {
    id: serial("id").primaryKey(),
    product: text("product").notNull(),
    login: text("login").notNull(),
    company: text("company"),
    server: text("server"),
    currency: text("currency"),
    leverage: integer("leverage"),
    balance: numeric("balance", { precision: 18, scale: 2 }).notNull(),
    equity: numeric("equity", { precision: 18, scale: 2 }).notNull(),
    floating: numeric("floating", { precision: 18, scale: 2 }).notNull(),
    openOrders: integer("open_orders").notNull(),
    pendingOrders: integer("pending_orders").notNull(),
    resultToday: numeric("result_today", { precision: 18, scale: 2 }).notNull(),
    resultYesterday: numeric("result_yesterday", { precision: 18, scale: 2 }).notNull(),
    resultWeek: numeric("result_week", { precision: 18, scale: 2 }).notNull(),
    resultMonth: numeric("result_month", { precision: 18, scale: 2 }).notNull(),
    balanceDayStart: numeric("balance_day_start", { precision: 18, scale: 2 }).notNull(),
    balanceWeekStart: numeric("balance_week_start", { precision: 18, scale: 2 }).notNull(),
    balanceMonthStart: numeric("balance_month_start", { precision: 18, scale: 2 }).notNull(),
    tradeAllowed: boolean("trade_allowed").notNull(),
    licenseStatus: text("license_status"),
    eaVersion: text("ea_version"),
    reportedAt: timestamp("reported_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("account_stats_product_login_uq").on(t.product, t.login)]
);

// Cliente antigo (importado do robô, sem email) pedindo acesso ao portal: informa email + conta MT4,
// o admin confere e aprova; aí as licenças do cadastro provisório passam pro email dele.
export const licenseClaims = pgTable(
  "license_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    login: text("login").notNull(),
    licenseId: uuid("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    locale: text("locale"),
    ip: text("ip"),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("license_claims_status_idx").on(t.status, t.createdAt)]
);

// Configuração do robô por conta MT4 (o cliente escolhe na Área do cliente; o robô v6.7+ lê a cada 5 min).
export const robotSettings = pgTable(
  "robot_settings",
  {
    id: serial("id").primaryKey(),
    product: text("product").notNull(),
    login: text("login").notNull(),
    // Pares que o robô opera (nome base, sem sufixo da corretora: XAUUSD, EURUSD...).
    symbols: text("symbols").array().notNull().default(sql`ARRAY['XAUUSD']::text[]`),
    riskProfile: text("risk_profile", { enum: ["conservative", "moderate", "aggressive", "custom"] }).notNull().default("moderate"),
    // Só no perfil "custom" (testes do admin): % do saldo arriscado por entrada.
    riskPct: numeric("risk_pct", { precision: 5, scale: 2 }),
    dailyGoalPct: numeric("daily_goal_pct", { precision: 5, scale: 2 }).notNull().default("10.5"),
    dailyLossPct: numeric("daily_loss_pct", { precision: 5, scale: 2 }).notNull().default("5.5"),
    recovery: boolean("recovery").notNull().default(true),
    recoveryLevels: integer("recovery_levels").notNull().default(10),
    newsFilter: boolean("news_filter").notNull().default(true),
    maxPositions: integer("max_positions").notNull().default(10),
    startHour: integer("start_hour").notNull().default(0),
    endHour: integer("end_hour").notNull().default(22),
    // v6.8+: configuração completa (geral + cada par). Sem isso (salvo na v6.7) vale o que está nas colunas acima.
    params: jsonb("params"),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("robot_settings_product_login_idx").on(t.product, t.login)]
);

// v7 (Ai X Intelligence): toda configuração salva fica guardada, pra saber com quais parâmetros cada operação abriu.
export const robotConfigHistory = pgTable(
  "robot_config_history",
  {
    id: serial("id").primaryKey(),
    product: text("product").notNull(),
    login: text("login").notNull(),
    params: jsonb("params").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("robot_config_history_login_idx").on(t.product, t.login, t.createdAt)]
);

// v7: operações fechadas que o robô manda (só as dele, pelo Magic) + os ajustes do par quando a operação abriu.
export const robotTrades = pgTable(
  "robot_trades",
  {
    id: serial("id").primaryKey(),
    product: text("product").notNull(),
    login: text("login").notNull(),
    ticket: bigint("ticket", { mode: "number" }).notNull(),
    symbol: text("symbol").notNull(), // nome base (XAUUSD, EURUSD...)
    brokerSymbol: text("broker_symbol").notNull(),
    side: integer("side").notNull(), // 0 = compra, 1 = venda
    lots: numeric("lots", { precision: 12, scale: 2 }).notNull(),
    openAt: timestamp("open_at", { withTimezone: true }).notNull(),
    closeAt: timestamp("close_at", { withTimezone: true }).notNull(),
    openPrice: numeric("open_price", { precision: 18, scale: 6 }).notNull(),
    closePrice: numeric("close_price", { precision: 18, scale: 6 }).notNull(),
    profit: numeric("profit", { precision: 18, scale: 2 }).notNull(),
    swap: numeric("swap", { precision: 18, scale: 2 }).notNull(),
    commission: numeric("commission", { precision: 18, scale: 2 }).notNull(),
    net: numeric("net", { precision: 18, scale: 2 }).notNull(),
    comment: text("comment"),
    eaVersion: text("ea_version"),
    params: jsonb("params"), // PairParams do par quando abriu (null = desconhecido)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("robot_trades_ticket_uq").on(t.product, t.login, t.ticket),
    index("robot_trades_symbol_idx").on(t.product, t.symbol, t.closeAt),
  ]
);

// v7: estudo de velas pedido no portal e feito no terminal do cliente (o robô busca na consulta de 30 s).
export const robotScans = pgTable(
  "robot_scans",
  {
    id: serial("id").primaryKey(),
    product: text("product").notNull(),
    login: text("login").notNull(),
    symbol: text("symbol").notNull(),
    spec: jsonb("spec").notNull(), // { bars?, days?, tf, tfs[], per[] }
    status: text("status", { enum: ["pending", "running", "done", "error", "expired"] }).notNull().default("pending"),
    requestedBy: text("requested_by"),
    error: text("error"),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("robot_scans_login_idx").on(t.product, t.login, t.createdAt)]
);

// O que os clientes fazem no portal, pro sininho do admin: cadastro, entrou no portal, pedido, pagamento, pedido de acesso.
export const activity = pgTable(
  "activity",
  {
    id: serial("id").primaryKey(),
    kind: text("kind", { enum: ["signup", "online", "order", "paid", "claim"] }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)]
);

export type User = typeof users.$inferSelect;
export type Activity = typeof activity.$inferSelect;
export type RobotSettings = typeof robotSettings.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type LicenseAccount = typeof licenseAccounts.$inferSelect;
export type ProductVersion = typeof productVersions.$inferSelect;
export type CryptoDeposit = typeof cryptoDeposits.$inferSelect;
export type AccountStats = typeof accountStats.$inferSelect;
export type RobotTrade = typeof robotTrades.$inferSelect;
export type RobotScan = typeof robotScans.$inferSelect;
export type LicenseClaim = typeof licenseClaims.$inferSelect;
