import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_genshin_review_decisions_action" AS ENUM('accept-export', 'reject');
  CREATE TABLE "genshin_review_decisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"run_key" varchar NOT NULL,
  	"review_item_id" integer NOT NULL,
  	"action" "enum_genshin_review_decisions_action" NOT NULL,
  	"note" varchar NOT NULL,
  	"decision_key" varchar NOT NULL,
  	"revision_key" varchar NOT NULL,
  	"cms_key" varchar NOT NULL,
  	"actor_i_d" varchar NOT NULL,
  	"actor_email" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "genshin_review_decisions" ADD CONSTRAINT "genshin_review_decisions_review_item_id_migration_records_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."migration_records"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "genshin_review_decisions_run_key_idx" ON "genshin_review_decisions" USING btree ("run_key");
  CREATE INDEX "genshin_review_decisions_review_item_idx" ON "genshin_review_decisions" USING btree ("review_item_id");
  CREATE UNIQUE INDEX "genshin_review_decisions_decision_key_idx" ON "genshin_review_decisions" USING btree ("decision_key");
  CREATE INDEX "genshin_review_decisions_updated_at_idx" ON "genshin_review_decisions" USING btree ("updated_at");
  CREATE INDEX "genshin_review_decisions_created_at_idx" ON "genshin_review_decisions" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM "genshin_review_decisions") THEN
       RAISE EXCEPTION 'Preserve collection reviews when rolling back the application';
     END IF;
   END $$;
   DROP TABLE "genshin_review_decisions" CASCADE;
  DROP TYPE "public"."enum_genshin_review_decisions_action";`)
}
