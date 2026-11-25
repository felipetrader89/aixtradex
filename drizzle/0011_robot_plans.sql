CREATE TABLE "robot_plans" (
	"product" text NOT NULL,
	"login" text NOT NULL,
	"mode" text NOT NULL,
	"profile" text DEFAULT 'moderate' NOT NULL,
	"goal_pct" numeric(5, 2) NOT NULL,
	"loss_pct" numeric(5, 2) NOT NULL,
	"pair_goals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"use_ai" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scan_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_apply" boolean DEFAULT false NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_try_at" timestamp with time zone,
	"summary" jsonb,
	"activated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robot_plans_product_login_pk" PRIMARY KEY("product","login")
);
--> statement-breakpoint
ALTER TABLE "account_stats" ADD COLUMN "broker_gmt" integer;