CREATE TABLE "market_bias" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"bias" text NOT NULL,
	"confidence" integer NOT NULL,
	"analysis" jsonb NOT NULL,
	"snapshot" text,
	"source_login" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "robot_trades" ADD COLUMN "mesa" bigint;--> statement-breakpoint
CREATE INDEX "market_bias_symbol_idx" ON "market_bias" USING btree ("symbol","created_at");