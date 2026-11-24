CREATE TABLE "account_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"company" text,
	"server" text,
	"currency" text,
	"leverage" integer,
	"balance" numeric(18, 2) NOT NULL,
	"equity" numeric(18, 2) NOT NULL,
	"floating" numeric(18, 2) NOT NULL,
	"open_orders" integer NOT NULL,
	"pending_orders" integer NOT NULL,
	"result_today" numeric(18, 2) NOT NULL,
	"result_yesterday" numeric(18, 2) NOT NULL,
	"result_week" numeric(18, 2) NOT NULL,
	"result_month" numeric(18, 2) NOT NULL,
	"balance_day_start" numeric(18, 2) NOT NULL,
	"balance_week_start" numeric(18, 2) NOT NULL,
	"balance_month_start" numeric(18, 2) NOT NULL,
	"trade_allowed" boolean NOT NULL,
	"license_status" text,
	"ea_version" text,
	"reported_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"login" text NOT NULL,
	"license_id" uuid NOT NULL,
	"locale" text,
	"ip" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_versions" ADD COLUMN "notes_i18n" jsonb;--> statement-breakpoint
ALTER TABLE "license_claims" ADD CONSTRAINT "license_claims_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_stats_product_login_uq" ON "account_stats" USING btree ("product","login");--> statement-breakpoint
CREATE INDEX "license_claims_status_idx" ON "license_claims" USING btree ("status","created_at");