CREATE TABLE "robot_config_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"params" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robot_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"symbol" text NOT NULL,
	"spec" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by" text,
	"error" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "robot_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"ticket" bigint NOT NULL,
	"symbol" text NOT NULL,
	"broker_symbol" text NOT NULL,
	"side" integer NOT NULL,
	"lots" numeric(12, 2) NOT NULL,
	"open_at" timestamp with time zone NOT NULL,
	"close_at" timestamp with time zone NOT NULL,
	"open_price" numeric(18, 6) NOT NULL,
	"close_price" numeric(18, 6) NOT NULL,
	"profit" numeric(18, 2) NOT NULL,
	"swap" numeric(18, 2) NOT NULL,
	"commission" numeric(18, 2) NOT NULL,
	"net" numeric(18, 2) NOT NULL,
	"comment" text,
	"ea_version" text,
	"params" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robot_config_history_login_idx" ON "robot_config_history" USING btree ("product","login","created_at");--> statement-breakpoint
CREATE INDEX "robot_scans_login_idx" ON "robot_scans" USING btree ("product","login","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "robot_trades_ticket_uq" ON "robot_trades" USING btree ("product","login","ticket");--> statement-breakpoint
CREATE INDEX "robot_trades_symbol_idx" ON "robot_trades" USING btree ("product","symbol","close_at");--> statement-breakpoint
INSERT INTO "robot_config_history" ("product", "login", "params", "created_at") SELECT "product", "login", "params", "updated_at" FROM "robot_settings" WHERE "params" IS NOT NULL;
