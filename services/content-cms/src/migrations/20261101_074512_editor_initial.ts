import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_review_decisions_action" AS ENUM('accept-draft', 'reject');
  CREATE TYPE "public"."enum_editorial_drafts_translations_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_editorial_drafts_faqs_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_material_cells_field" AS ENUM('type', 'rarity', 'typeZh', 'stackLimit', 'name', 'source', 'description', 'notes', 'acquisition', 'uses', 'conversions', 'nameEn', 'sourceEn', 'descriptionEn', 'notesEn', 'acquisitionEn', 'usesEn', 'conversionsEn', 'nameJa', 'sourceJa', 'descriptionJa', 'notesJa', 'acquisitionJa', 'usesJa', 'conversionsJa');
  CREATE TYPE "public"."enum_material_cells_state" AS ENUM('absent', 'null', 'value');
  CREATE TYPE "public"."enum_editorial_drafts_kind" AS ENUM('guide', 'character', 'faq-section', 'asset-reference', 'material');
  CREATE TYPE "public"."enum_editorial_drafts_state" AS ENUM('draft');
  CREATE TYPE "public"."enum_editorial_drafts_body_format" AS ENUM('unclassified', 'plain', 'markdown', 'html');
  CREATE TYPE "public"."enum__editorial_drafts_v_version_translations_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum__editorial_drafts_v_version_faqs_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum__material_cells_v_field" AS ENUM('type', 'rarity', 'typeZh', 'stackLimit', 'name', 'source', 'description', 'notes', 'acquisition', 'uses', 'conversions', 'nameEn', 'sourceEn', 'descriptionEn', 'notesEn', 'acquisitionEn', 'usesEn', 'conversionsEn', 'nameJa', 'sourceJa', 'descriptionJa', 'notesJa', 'acquisitionJa', 'usesJa', 'conversionsJa');
  CREATE TYPE "public"."enum__material_cells_v_state" AS ENUM('absent', 'null', 'value');
  CREATE TYPE "public"."enum__editorial_drafts_v_version_kind" AS ENUM('guide', 'character', 'faq-section', 'asset-reference', 'material');
  CREATE TYPE "public"."enum__editorial_drafts_v_version_state" AS ENUM('draft');
  CREATE TYPE "public"."enum__editorial_drafts_v_version_body_format" AS ENUM('unclassified', 'plain', 'markdown', 'html');
  CREATE TYPE "public"."enum_draft_merge_decisions_choices_field" AS ENUM('zh.title', 'zh.body', 'zh.summary', 'en.title', 'en.body', 'en.summary', 'ja.title', 'ja.body', 'ja.summary', 'faqs', 'assetReference', 'material.type', 'material.rarity', 'material.typeZh', 'material.stackLimit', 'material.name', 'material.source', 'material.description', 'material.notes', 'material.acquisition', 'material.uses', 'material.conversions', 'material.nameEn', 'material.sourceEn', 'material.descriptionEn', 'material.notesEn', 'material.acquisitionEn', 'material.usesEn', 'material.conversionsEn', 'material.nameJa', 'material.sourceJa', 'material.descriptionJa', 'material.notesJa', 'material.acquisitionJa', 'material.usesJa', 'material.conversionsJa');
  CREATE TYPE "public"."enum_draft_merge_decisions_choices_choice" AS ENUM('current', 'incoming');
  CREATE TYPE "public"."enum_draft_merge_decisions_action" AS ENUM('apply', 'dismiss');
  CREATE TYPE "public"."enum_merge_workflow_events_action" AS ENUM('close', 'reconsider');
  CREATE TYPE "public"."enum_migration_records_translations_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_migration_records_faqs_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_migration_records_mapping_level" AS ENUM('common-fields', 'identity-only', 'structured-fields');
  CREATE TYPE "public"."enum_migration_sources_source_kind" AS ENUM('registry', 'raw-json', 'review-contract', 'inline-code');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'reviewer');
  CREATE TYPE "public"."enum_content_records_body_format" AS ENUM('markdown', 'html', 'plain');
  CREATE TYPE "public"."enum_content_records_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__content_records_v_version_body_format" AS ENUM('markdown', 'html', 'plain');
  CREATE TYPE "public"."enum__content_records_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__content_records_v_published_locale" AS ENUM('zh', 'en', 'ja');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'verifySource');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'verifySource');
  CREATE TABLE "review_items_field_changes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar NOT NULL,
  	"before_text" varchar,
  	"after_text" varchar
  );
  
  CREATE TABLE "review_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"review_key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"run_key" varchar NOT NULL,
  	"game_key" varchar NOT NULL,
  	"stable_key" varchar NOT NULL,
  	"source_path" varchar NOT NULL,
  	"change" varchar NOT NULL,
  	"draft_kind" varchar NOT NULL,
  	"before_revision" varchar,
  	"after_revision" varchar,
  	"blockers" varchar,
  	"warnings" varchar,
  	"item_text" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "review_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"run_key" varchar NOT NULL,
  	"base_batch" varchar,
  	"target_batch" varchar NOT NULL,
  	"item_count" numeric NOT NULL,
  	"manifest" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "review_decisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"review_item_id" integer NOT NULL,
  	"action" "enum_review_decisions_action" NOT NULL,
  	"note" varchar NOT NULL,
  	"review_key" varchar,
  	"actor_i_d" varchar,
  	"actor_email" varchar,
  	"draft_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "editorial_drafts_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_editorial_drafts_translations_locale" NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"summary" varchar
  );
  
  CREATE TABLE "editorial_drafts_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"entry_key" varchar NOT NULL,
  	"locale" "enum_editorial_drafts_faqs_locale" NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "material_cells_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "material_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" "enum_material_cells_field",
  	"state" "enum_material_cells_state",
  	"text" varchar,
  	"number" numeric
  );
  
  CREATE TABLE "editorial_drafts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stable_key" varchar NOT NULL,
  	"game_key" varchar NOT NULL,
  	"legacy_id" varchar NOT NULL,
  	"kind" "enum_editorial_drafts_kind" NOT NULL,
  	"state" "enum_editorial_drafts_state" NOT NULL,
  	"hold" boolean DEFAULT false NOT NULL,
  	"run_key" varchar NOT NULL,
  	"review_key" varchar NOT NULL,
  	"candidate_revision" varchar NOT NULL,
  	"source_path" varchar NOT NULL,
  	"unmapped_fields" varchar,
  	"source_review_key" varchar,
  	"merge_head" varchar,
  	"body_format" "enum_editorial_drafts_body_format" DEFAULT 'unclassified' NOT NULL,
  	"asset_reference_category" varchar,
  	"asset_reference_legacy_id" varchar,
  	"asset_reference_url" varchar,
  	"editor_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_editorial_drafts_v_version_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"locale" "enum__editorial_drafts_v_version_translations_locale" NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"summary" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_drafts_v_version_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"entry_key" varchar NOT NULL,
  	"locale" "enum__editorial_drafts_v_version_faqs_locale" NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_material_cells_v_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_material_cells_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"field" "enum__material_cells_v_field",
  	"state" "enum__material_cells_v_state",
  	"text" varchar,
  	"number" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_editorial_drafts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_stable_key" varchar NOT NULL,
  	"version_game_key" varchar NOT NULL,
  	"version_legacy_id" varchar NOT NULL,
  	"version_kind" "enum__editorial_drafts_v_version_kind" NOT NULL,
  	"version_state" "enum__editorial_drafts_v_version_state" NOT NULL,
  	"version_hold" boolean DEFAULT false NOT NULL,
  	"version_run_key" varchar NOT NULL,
  	"version_review_key" varchar NOT NULL,
  	"version_candidate_revision" varchar NOT NULL,
  	"version_source_path" varchar NOT NULL,
  	"version_unmapped_fields" varchar,
  	"version_source_review_key" varchar,
  	"version_merge_head" varchar,
  	"version_body_format" "enum__editorial_drafts_v_version_body_format" DEFAULT 'unclassified' NOT NULL,
  	"version_asset_reference_category" varchar,
  	"version_asset_reference_legacy_id" varchar,
  	"version_asset_reference_url" varchar,
  	"version_editor_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "draft_merge_proposals_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" varchar,
  	"status" varchar,
  	"suggested" varchar,
  	"base_text" varchar,
  	"current_text" varchar,
  	"incoming_text" varchar
  );
  
  CREATE TABLE "draft_merge_proposals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"draft_id" integer NOT NULL,
  	"review_item_id" integer NOT NULL,
  	"proposal_key" varchar,
  	"parent_proposal_key" varchar,
  	"source_review_key" varchar,
  	"target_review_key" varchar,
  	"draft_fingerprint" varchar,
  	"actor_i_d" varchar,
  	"actor_email" varchar,
  	"conflict_count" numeric,
  	"plan_text" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "draft_merge_decisions_choices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"field" "enum_draft_merge_decisions_choices_field" NOT NULL,
  	"choice" "enum_draft_merge_decisions_choices_choice" NOT NULL
  );
  
  CREATE TABLE "draft_merge_decisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposal_id" integer NOT NULL,
  	"action" "enum_draft_merge_decisions_action" NOT NULL,
  	"note" varchar NOT NULL,
  	"proposal_key" varchar,
  	"draft_id" integer,
  	"source_review_key" varchar,
  	"target_review_key" varchar,
  	"previous_head" varchar,
  	"actor_i_d" varchar,
  	"actor_email" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "merge_workflow_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"proposal_id" integer NOT NULL,
  	"action" "enum_merge_workflow_events_action" NOT NULL,
  	"note" varchar NOT NULL,
  	"event_key" varchar,
  	"source_proposal_key" varchar,
  	"replacement_key" varchar,
  	"actor_i_d" varchar,
  	"actor_email" varchar,
  	"replacement_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "migration_records_translations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_migration_records_translations_locale" NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"summary" varchar
  );
  
  CREATE TABLE "migration_records_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_migration_records_faqs_locale" NOT NULL,
  	"source_pointer" varchar NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "migration_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stable_key" varchar NOT NULL,
  	"revision_key" varchar NOT NULL,
  	"game_key" varchar NOT NULL,
  	"family" varchar NOT NULL,
  	"legacy_id" varchar NOT NULL,
  	"source_path" varchar NOT NULL,
  	"mapping_level" "enum_migration_records_mapping_level" NOT NULL,
  	"hold" boolean DEFAULT true NOT NULL,
  	"asset_reference_category" varchar,
  	"asset_reference_legacy_id" varchar,
  	"asset_reference_url" varchar,
  	"raw_record" varchar NOT NULL,
  	"review_text" varchar NOT NULL,
  	"candidate_text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "migration_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"batch_key" varchar NOT NULL,
  	"mapper_version" varchar NOT NULL,
  	"policy_digest" varchar NOT NULL,
  	"record_count" numeric NOT NULL,
  	"manifest" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "migration_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"snapshot_key" varchar NOT NULL,
  	"game_key" varchar NOT NULL,
  	"source_path" varchar NOT NULL,
  	"source_digest" varchar NOT NULL,
  	"source_kind" "enum_migration_sources_source_kind" NOT NULL,
  	"raw_text" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "games" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"region" varchar NOT NULL,
  	"legacy_registry" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "games_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "content_records" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stable_key" varchar,
  	"game_id" integer,
  	"kind" varchar,
  	"legacy_id" varchar,
  	"legacy_path" varchar,
  	"body_format" "enum_content_records_body_format" DEFAULT 'markdown',
  	"source_record" jsonb,
  	"review_evidence" jsonb,
  	"hold" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_content_records_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "content_records_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_content_records_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_stable_key" varchar,
  	"version_game_id" integer,
  	"version_kind" varchar,
  	"version_legacy_id" varchar,
  	"version_legacy_path" varchar,
  	"version_body_format" "enum__content_records_v_version_body_format" DEFAULT 'markdown',
  	"version_source_record" jsonb,
  	"version_review_evidence" jsonb,
  	"version_hold" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__content_records_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__content_records_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_content_records_v_locales" (
  	"version_title" varchar,
  	"version_body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"editorial_drafts_id" integer,
  	"users_id" integer,
  	"games_id" integer,
  	"content_records_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "review_items_field_changes" ADD CONSTRAINT "review_items_field_changes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."review_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "review_decisions" ADD CONSTRAINT "review_decisions_draft_id_editorial_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "editorial_drafts_translations" ADD CONSTRAINT "editorial_drafts_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editorial_drafts_faqs" ADD CONSTRAINT "editorial_drafts_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "material_cells_entries" ADD CONSTRAINT "material_cells_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."material_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "material_cells" ADD CONSTRAINT "material_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_drafts_v_version_translations" ADD CONSTRAINT "_editorial_drafts_v_version_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_drafts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_drafts_v_version_faqs" ADD CONSTRAINT "_editorial_drafts_v_version_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_drafts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_material_cells_v_entries" ADD CONSTRAINT "_material_cells_v_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_material_cells_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_material_cells_v" ADD CONSTRAINT "_material_cells_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_editorial_drafts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_editorial_drafts_v" ADD CONSTRAINT "_editorial_drafts_v_parent_id_editorial_drafts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "draft_merge_proposals_comparison" ADD CONSTRAINT "draft_merge_proposals_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."draft_merge_proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "draft_merge_proposals" ADD CONSTRAINT "draft_merge_proposals_draft_id_editorial_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "draft_merge_proposals" ADD CONSTRAINT "draft_merge_proposals_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "draft_merge_decisions_choices" ADD CONSTRAINT "draft_merge_decisions_choices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."draft_merge_decisions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "draft_merge_decisions" ADD CONSTRAINT "draft_merge_decisions_proposal_id_draft_merge_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."draft_merge_proposals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "draft_merge_decisions" ADD CONSTRAINT "draft_merge_decisions_draft_id_editorial_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "merge_workflow_events" ADD CONSTRAINT "merge_workflow_events_proposal_id_draft_merge_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."draft_merge_proposals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "merge_workflow_events" ADD CONSTRAINT "merge_workflow_events_replacement_id_draft_merge_proposals_id_fk" FOREIGN KEY ("replacement_id") REFERENCES "public"."draft_merge_proposals"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "migration_records_translations" ADD CONSTRAINT "migration_records_translations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."migration_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "migration_records_faqs" ADD CONSTRAINT "migration_records_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."migration_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "games_locales" ADD CONSTRAINT "games_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_records" ADD CONSTRAINT "content_records_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_records_locales" ADD CONSTRAINT "content_records_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_content_records_v" ADD CONSTRAINT "_content_records_v_parent_id_content_records_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content_records"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_content_records_v" ADD CONSTRAINT "_content_records_v_version_game_id_games_id_fk" FOREIGN KEY ("version_game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_content_records_v_locales" ADD CONSTRAINT "_content_records_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_content_records_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_editorial_drafts_fk" FOREIGN KEY ("editorial_drafts_id") REFERENCES "public"."editorial_drafts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_games_fk" FOREIGN KEY ("games_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_records_fk" FOREIGN KEY ("content_records_id") REFERENCES "public"."content_records"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "review_items_field_changes_order_idx" ON "review_items_field_changes" USING btree ("_order");
  CREATE INDEX "review_items_field_changes_parent_id_idx" ON "review_items_field_changes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "review_items_review_key_idx" ON "review_items" USING btree ("review_key");
  CREATE INDEX "review_items_updated_at_idx" ON "review_items" USING btree ("updated_at");
  CREATE INDEX "review_items_created_at_idx" ON "review_items" USING btree ("created_at");
  CREATE UNIQUE INDEX "review_runs_run_key_idx" ON "review_runs" USING btree ("run_key");
  CREATE INDEX "review_runs_updated_at_idx" ON "review_runs" USING btree ("updated_at");
  CREATE INDEX "review_runs_created_at_idx" ON "review_runs" USING btree ("created_at");
  CREATE UNIQUE INDEX "review_decisions_review_item_idx" ON "review_decisions" USING btree ("review_item_id");
  CREATE UNIQUE INDEX "review_decisions_review_key_idx" ON "review_decisions" USING btree ("review_key");
  CREATE INDEX "review_decisions_draft_idx" ON "review_decisions" USING btree ("draft_id");
  CREATE INDEX "review_decisions_updated_at_idx" ON "review_decisions" USING btree ("updated_at");
  CREATE INDEX "review_decisions_created_at_idx" ON "review_decisions" USING btree ("created_at");
  CREATE INDEX "editorial_drafts_translations_order_idx" ON "editorial_drafts_translations" USING btree ("_order");
  CREATE INDEX "editorial_drafts_translations_parent_id_idx" ON "editorial_drafts_translations" USING btree ("_parent_id");
  CREATE INDEX "editorial_drafts_faqs_order_idx" ON "editorial_drafts_faqs" USING btree ("_order");
  CREATE INDEX "editorial_drafts_faqs_parent_id_idx" ON "editorial_drafts_faqs" USING btree ("_parent_id");
  CREATE INDEX "material_cells_entries_order_idx" ON "material_cells_entries" USING btree ("_order");
  CREATE INDEX "material_cells_entries_parent_id_idx" ON "material_cells_entries" USING btree ("_parent_id");
  CREATE INDEX "material_cells_order_idx" ON "material_cells" USING btree ("_order");
  CREATE INDEX "material_cells_parent_id_idx" ON "material_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "editorial_drafts_stable_key_idx" ON "editorial_drafts" USING btree ("stable_key");
  CREATE INDEX "editorial_drafts_updated_at_idx" ON "editorial_drafts" USING btree ("updated_at");
  CREATE INDEX "editorial_drafts_created_at_idx" ON "editorial_drafts" USING btree ("created_at");
  CREATE INDEX "_editorial_drafts_v_version_translations_order_idx" ON "_editorial_drafts_v_version_translations" USING btree ("_order");
  CREATE INDEX "_editorial_drafts_v_version_translations_parent_id_idx" ON "_editorial_drafts_v_version_translations" USING btree ("_parent_id");
  CREATE INDEX "_editorial_drafts_v_version_faqs_order_idx" ON "_editorial_drafts_v_version_faqs" USING btree ("_order");
  CREATE INDEX "_editorial_drafts_v_version_faqs_parent_id_idx" ON "_editorial_drafts_v_version_faqs" USING btree ("_parent_id");
  CREATE INDEX "_material_cells_v_entries_order_idx" ON "_material_cells_v_entries" USING btree ("_order");
  CREATE INDEX "_material_cells_v_entries_parent_id_idx" ON "_material_cells_v_entries" USING btree ("_parent_id");
  CREATE INDEX "_material_cells_v_order_idx" ON "_material_cells_v" USING btree ("_order");
  CREATE INDEX "_material_cells_v_parent_id_idx" ON "_material_cells_v" USING btree ("_parent_id");
  CREATE INDEX "_editorial_drafts_v_parent_idx" ON "_editorial_drafts_v" USING btree ("parent_id");
  CREATE INDEX "_editorial_drafts_v_version_version_stable_key_idx" ON "_editorial_drafts_v" USING btree ("version_stable_key");
  CREATE INDEX "_editorial_drafts_v_version_version_updated_at_idx" ON "_editorial_drafts_v" USING btree ("version_updated_at");
  CREATE INDEX "_editorial_drafts_v_version_version_created_at_idx" ON "_editorial_drafts_v" USING btree ("version_created_at");
  CREATE INDEX "_editorial_drafts_v_created_at_idx" ON "_editorial_drafts_v" USING btree ("created_at");
  CREATE INDEX "_editorial_drafts_v_updated_at_idx" ON "_editorial_drafts_v" USING btree ("updated_at");
  CREATE INDEX "draft_merge_proposals_comparison_order_idx" ON "draft_merge_proposals_comparison" USING btree ("_order");
  CREATE INDEX "draft_merge_proposals_comparison_parent_id_idx" ON "draft_merge_proposals_comparison" USING btree ("_parent_id");
  CREATE INDEX "draft_merge_proposals_draft_idx" ON "draft_merge_proposals" USING btree ("draft_id");
  CREATE INDEX "draft_merge_proposals_review_item_idx" ON "draft_merge_proposals" USING btree ("review_item_id");
  CREATE UNIQUE INDEX "draft_merge_proposals_proposal_key_idx" ON "draft_merge_proposals" USING btree ("proposal_key");
  CREATE INDEX "draft_merge_proposals_updated_at_idx" ON "draft_merge_proposals" USING btree ("updated_at");
  CREATE INDEX "draft_merge_proposals_created_at_idx" ON "draft_merge_proposals" USING btree ("created_at");
  CREATE INDEX "draft_merge_decisions_choices_order_idx" ON "draft_merge_decisions_choices" USING btree ("_order");
  CREATE INDEX "draft_merge_decisions_choices_parent_id_idx" ON "draft_merge_decisions_choices" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "draft_merge_decisions_proposal_idx" ON "draft_merge_decisions" USING btree ("proposal_id");
  CREATE UNIQUE INDEX "draft_merge_decisions_proposal_key_idx" ON "draft_merge_decisions" USING btree ("proposal_key");
  CREATE INDEX "draft_merge_decisions_draft_idx" ON "draft_merge_decisions" USING btree ("draft_id");
  CREATE INDEX "draft_merge_decisions_updated_at_idx" ON "draft_merge_decisions" USING btree ("updated_at");
  CREATE INDEX "draft_merge_decisions_created_at_idx" ON "draft_merge_decisions" USING btree ("created_at");
  CREATE INDEX "merge_workflow_events_proposal_idx" ON "merge_workflow_events" USING btree ("proposal_id");
  CREATE UNIQUE INDEX "merge_workflow_events_event_key_idx" ON "merge_workflow_events" USING btree ("event_key");
  CREATE INDEX "merge_workflow_events_replacement_idx" ON "merge_workflow_events" USING btree ("replacement_id");
  CREATE INDEX "merge_workflow_events_updated_at_idx" ON "merge_workflow_events" USING btree ("updated_at");
  CREATE INDEX "merge_workflow_events_created_at_idx" ON "merge_workflow_events" USING btree ("created_at");
  CREATE INDEX "migration_records_translations_order_idx" ON "migration_records_translations" USING btree ("_order");
  CREATE INDEX "migration_records_translations_parent_id_idx" ON "migration_records_translations" USING btree ("_parent_id");
  CREATE INDEX "migration_records_faqs_order_idx" ON "migration_records_faqs" USING btree ("_order");
  CREATE INDEX "migration_records_faqs_parent_id_idx" ON "migration_records_faqs" USING btree ("_parent_id");
  CREATE INDEX "migration_records_stable_key_idx" ON "migration_records" USING btree ("stable_key");
  CREATE UNIQUE INDEX "migration_records_revision_key_idx" ON "migration_records" USING btree ("revision_key");
  CREATE INDEX "migration_records_game_key_idx" ON "migration_records" USING btree ("game_key");
  CREATE INDEX "migration_records_family_idx" ON "migration_records" USING btree ("family");
  CREATE INDEX "migration_records_updated_at_idx" ON "migration_records" USING btree ("updated_at");
  CREATE INDEX "migration_records_created_at_idx" ON "migration_records" USING btree ("created_at");
  CREATE UNIQUE INDEX "migration_batches_batch_key_idx" ON "migration_batches" USING btree ("batch_key");
  CREATE INDEX "migration_batches_updated_at_idx" ON "migration_batches" USING btree ("updated_at");
  CREATE INDEX "migration_batches_created_at_idx" ON "migration_batches" USING btree ("created_at");
  CREATE UNIQUE INDEX "migration_sources_snapshot_key_idx" ON "migration_sources" USING btree ("snapshot_key");
  CREATE INDEX "migration_sources_game_key_idx" ON "migration_sources" USING btree ("game_key");
  CREATE INDEX "migration_sources_updated_at_idx" ON "migration_sources" USING btree ("updated_at");
  CREATE INDEX "migration_sources_created_at_idx" ON "migration_sources" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "games_key_idx" ON "games" USING btree ("key");
  CREATE INDEX "games_updated_at_idx" ON "games" USING btree ("updated_at");
  CREATE INDEX "games_created_at_idx" ON "games" USING btree ("created_at");
  CREATE UNIQUE INDEX "games_locales_locale_parent_id_unique" ON "games_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "games_locales_parent_id_idx" ON "games_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "content_records_stable_key_idx" ON "content_records" USING btree ("stable_key");
  CREATE INDEX "content_records_game_idx" ON "content_records" USING btree ("game_id");
  CREATE INDEX "content_records_updated_at_idx" ON "content_records" USING btree ("updated_at");
  CREATE INDEX "content_records_created_at_idx" ON "content_records" USING btree ("created_at");
  CREATE INDEX "content_records__status_idx" ON "content_records" USING btree ("_status");
  CREATE UNIQUE INDEX "content_records_locales_locale_parent_id_unique" ON "content_records_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "content_records_locales_parent_id_idx" ON "content_records_locales" USING btree ("_parent_id");
  CREATE INDEX "_content_records_v_parent_idx" ON "_content_records_v" USING btree ("parent_id");
  CREATE INDEX "_content_records_v_version_version_stable_key_idx" ON "_content_records_v" USING btree ("version_stable_key");
  CREATE INDEX "_content_records_v_version_version_game_idx" ON "_content_records_v" USING btree ("version_game_id");
  CREATE INDEX "_content_records_v_version_version_updated_at_idx" ON "_content_records_v" USING btree ("version_updated_at");
  CREATE INDEX "_content_records_v_version_version_created_at_idx" ON "_content_records_v" USING btree ("version_created_at");
  CREATE INDEX "_content_records_v_version_version__status_idx" ON "_content_records_v" USING btree ("version__status");
  CREATE INDEX "_content_records_v_created_at_idx" ON "_content_records_v" USING btree ("created_at");
  CREATE INDEX "_content_records_v_updated_at_idx" ON "_content_records_v" USING btree ("updated_at");
  CREATE INDEX "_content_records_v_snapshot_idx" ON "_content_records_v" USING btree ("snapshot");
  CREATE INDEX "_content_records_v_published_locale_idx" ON "_content_records_v" USING btree ("published_locale");
  CREATE INDEX "_content_records_v_latest_idx" ON "_content_records_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_content_records_v_locales_locale_parent_id_unique" ON "_content_records_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_content_records_v_locales_parent_id_idx" ON "_content_records_v_locales" USING btree ("_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_editorial_drafts_id_idx" ON "payload_locked_documents_rels" USING btree ("editorial_drafts_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_games_id_idx" ON "payload_locked_documents_rels" USING btree ("games_id");
  CREATE INDEX "payload_locked_documents_rels_content_records_id_idx" ON "payload_locked_documents_rels" USING btree ("content_records_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "review_items_field_changes" CASCADE;
  DROP TABLE "review_items" CASCADE;
  DROP TABLE "review_runs" CASCADE;
  DROP TABLE "review_decisions" CASCADE;
  DROP TABLE "editorial_drafts_translations" CASCADE;
  DROP TABLE "editorial_drafts_faqs" CASCADE;
  DROP TABLE "material_cells_entries" CASCADE;
  DROP TABLE "material_cells" CASCADE;
  DROP TABLE "editorial_drafts" CASCADE;
  DROP TABLE "_editorial_drafts_v_version_translations" CASCADE;
  DROP TABLE "_editorial_drafts_v_version_faqs" CASCADE;
  DROP TABLE "_material_cells_v_entries" CASCADE;
  DROP TABLE "_material_cells_v" CASCADE;
  DROP TABLE "_editorial_drafts_v" CASCADE;
  DROP TABLE "draft_merge_proposals_comparison" CASCADE;
  DROP TABLE "draft_merge_proposals" CASCADE;
  DROP TABLE "draft_merge_decisions_choices" CASCADE;
  DROP TABLE "draft_merge_decisions" CASCADE;
  DROP TABLE "merge_workflow_events" CASCADE;
  DROP TABLE "migration_records_translations" CASCADE;
  DROP TABLE "migration_records_faqs" CASCADE;
  DROP TABLE "migration_records" CASCADE;
  DROP TABLE "migration_batches" CASCADE;
  DROP TABLE "migration_sources" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "games" CASCADE;
  DROP TABLE "games_locales" CASCADE;
  DROP TABLE "content_records" CASCADE;
  DROP TABLE "content_records_locales" CASCADE;
  DROP TABLE "_content_records_v" CASCADE;
  DROP TABLE "_content_records_v_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_review_decisions_action";
  DROP TYPE "public"."enum_editorial_drafts_translations_locale";
  DROP TYPE "public"."enum_editorial_drafts_faqs_locale";
  DROP TYPE "public"."enum_material_cells_field";
  DROP TYPE "public"."enum_material_cells_state";
  DROP TYPE "public"."enum_editorial_drafts_kind";
  DROP TYPE "public"."enum_editorial_drafts_state";
  DROP TYPE "public"."enum_editorial_drafts_body_format";
  DROP TYPE "public"."enum__editorial_drafts_v_version_translations_locale";
  DROP TYPE "public"."enum__editorial_drafts_v_version_faqs_locale";
  DROP TYPE "public"."enum__material_cells_v_field";
  DROP TYPE "public"."enum__material_cells_v_state";
  DROP TYPE "public"."enum__editorial_drafts_v_version_kind";
  DROP TYPE "public"."enum__editorial_drafts_v_version_state";
  DROP TYPE "public"."enum__editorial_drafts_v_version_body_format";
  DROP TYPE "public"."enum_draft_merge_decisions_choices_field";
  DROP TYPE "public"."enum_draft_merge_decisions_choices_choice";
  DROP TYPE "public"."enum_draft_merge_decisions_action";
  DROP TYPE "public"."enum_merge_workflow_events_action";
  DROP TYPE "public"."enum_migration_records_translations_locale";
  DROP TYPE "public"."enum_migration_records_faqs_locale";
  DROP TYPE "public"."enum_migration_records_mapping_level";
  DROP TYPE "public"."enum_migration_sources_source_kind";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_content_records_body_format";
  DROP TYPE "public"."enum_content_records_status";
  DROP TYPE "public"."enum__content_records_v_version_body_format";
  DROP TYPE "public"."enum__content_records_v_version_status";
  DROP TYPE "public"."enum__content_records_v_published_locale";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
