CREATE TYPE "public"."process_run_scope_type" AS ENUM('GENERAL', 'CREDIT_PRODUCT', 'LOAN');--> statement-breakpoint
CREATE TYPE "public"."process_run_trigger_source" AS ENUM('MANUAL', 'CRON');--> statement-breakpoint
ALTER TYPE "public"."process_status" ADD VALUE 'QUEUED' BEFORE 'RUNNING';--> statement-breakpoint
DROP INDEX "uniq_process_run";--> statement-breakpoint
ALTER TABLE "process_runs" ALTER COLUMN "status" SET DEFAULT 'QUEUED';--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "scope_type" "process_run_scope_type" DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "scope_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "transaction_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "trigger_source" "process_run_trigger_source" DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "finished_at" timestamp;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "summary" jsonb;--> statement-breakpoint
CREATE INDEX "idx_process_run_status" ON "process_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_process_run" ON "process_runs" USING btree ("process_type","process_date","scope_type","scope_id");--> statement-breakpoint
ALTER TABLE "process_runs" ADD CONSTRAINT "chk_process_run_scope_id_by_scope_type" CHECK (
        (
          "process_runs"."scope_type" = 'GENERAL'
          AND "process_runs"."scope_id" = 0
        )
        OR
        (
          "process_runs"."scope_type" IN ('CREDIT_PRODUCT', 'LOAN')
          AND "process_runs"."scope_id" > 0
        )
      );
