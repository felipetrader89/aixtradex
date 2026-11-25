ALTER TABLE "orders" ADD COLUMN "pass_days" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "credit_usd" numeric(12, 2) DEFAULT '0' NOT NULL;