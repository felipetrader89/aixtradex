CREATE TABLE "activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"email" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_files" ADD COLUMN "lang" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_files" ADD COLUMN "size" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "product_files" f SET "size" = v."size" FROM "product_versions" v WHERE v."id" = f."version_id";--> statement-breakpoint
ALTER TABLE "product_files" DROP CONSTRAINT "product_files_pkey";--> statement-breakpoint
ALTER TABLE "product_files" ADD CONSTRAINT "product_files_version_id_lang_pk" PRIMARY KEY("version_id","lang");--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "activity_seen_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "activity" USING btree ("created_at");