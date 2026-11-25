CREATE TABLE "broker_symbols" (
	"product" text NOT NULL,
	"login" text NOT NULL,
	"company" text,
	"server" text,
	"prefix" text DEFAULT '' NOT NULL,
	"suffix" text DEFAULT '' NOT NULL,
	"symbols" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refresh_requested_at" timestamp with time zone,
	CONSTRAINT "broker_symbols_product_login_pk" PRIMARY KEY("product","login")
);
--> statement-breakpoint
CREATE TABLE "robot_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"login" text NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"requested_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robot_analyses_login_idx" ON "robot_analyses" USING btree ("product","login","created_at");