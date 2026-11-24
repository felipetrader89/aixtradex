CREATE TABLE "robot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"symbols" text[] DEFAULT ARRAY['XAUUSD']::text[] NOT NULL,
	"risk_profile" text DEFAULT 'moderate' NOT NULL,
	"risk_pct" numeric(5, 2),
	"daily_goal_pct" numeric(5, 2) DEFAULT '10.5' NOT NULL,
	"daily_loss_pct" numeric(5, 2) DEFAULT '5.5' NOT NULL,
	"recovery" boolean DEFAULT true NOT NULL,
	"recovery_levels" integer DEFAULT 10 NOT NULL,
	"news_filter" boolean DEFAULT true NOT NULL,
	"max_positions" integer DEFAULT 10 NOT NULL,
	"start_hour" integer DEFAULT 0 NOT NULL,
	"end_hour" integer DEFAULT 22 NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "robot_settings_product_login_idx" ON "robot_settings" USING btree ("product","login");