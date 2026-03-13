ALTER TABLE "accounting_entries" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accounting_entries" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::text;--> statement-breakpoint
UPDATE "accounting_entries" SET "status" = 'ACCOUNTED' WHERE "status" = 'POSTED';--> statement-breakpoint
DROP TYPE "public"."accounting_entries_status";--> statement-breakpoint
CREATE TYPE "public"."accounting_entries_status" AS ENUM('DRAFT', 'ACCOUNTED', 'VOIDED');--> statement-breakpoint
ALTER TABLE "accounting_entries" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"public"."accounting_entries_status";--> statement-breakpoint
ALTER TABLE "accounting_entries" ALTER COLUMN "status" SET DATA TYPE "public"."accounting_entries_status" USING "status"::"public"."accounting_entries_status";--> statement-breakpoint
CREATE INDEX "idx_entries_process_status_date" ON "accounting_entries" USING btree ("process_type","status","entry_date");--> statement-breakpoint
UPDATE "accounting_entries" SET "process_run_id" = NULL WHERE "source_type" <> 'PROCESS_RUN';--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "chk_accounting_entries_process_run_source" CHECK (
        (
          "accounting_entries"."source_type" = 'PROCESS_RUN'
          AND "accounting_entries"."process_run_id" IS NOT NULL
        )
        OR
        (
          "accounting_entries"."source_type" <> 'PROCESS_RUN'
          AND "accounting_entries"."process_run_id" IS NULL
        )
      ) NOT VALID;
