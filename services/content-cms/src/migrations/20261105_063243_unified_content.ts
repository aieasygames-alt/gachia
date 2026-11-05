import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content_records" ADD COLUMN "structured_value" jsonb;
  ALTER TABLE "_content_records_v" ADD COLUMN "version_structured_value" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     IF EXISTS (SELECT 1 FROM "content_records" WHERE "structured_value" IS NOT NULL)
       OR EXISTS (SELECT 1 FROM "_content_records_v" WHERE "version_structured_value" IS NOT NULL) THEN
       RAISE EXCEPTION 'Cannot drop structured content or its history; preserve the additive schema when rolling back the application';
     END IF;
   END $$;
  ALTER TABLE "content_records" DROP COLUMN "structured_value";
  ALTER TABLE "_content_records_v" DROP COLUMN "version_structured_value";`)
}
