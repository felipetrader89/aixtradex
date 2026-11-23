CREATE TABLE "crypto_deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"coin" text NOT NULL,
	"network" text,
	"amount" numeric(20, 8) NOT NULL,
	"tx_id" text,
	"sender" text,
	"received_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'unmatched' NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crypto_deposits_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pay_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "crypto_deposits" ADD CONSTRAINT "crypto_deposits_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crypto_deposits_status_idx" ON "crypto_deposits" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_pending_pay_amount_uq" ON "orders" USING btree ("pay_amount") WHERE status = 'pending';