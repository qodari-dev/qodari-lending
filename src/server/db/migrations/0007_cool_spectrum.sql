ALTER TABLE "loan_application_co_debtors" DROP CONSTRAINT IF EXISTS "loan_application_co_debtors_co_debtor_id_co_debtors_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "uniq_application_codebtor";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_application_codebtor_codebtor";--> statement-breakpoint
ALTER TABLE "loan_application_co_debtors" DROP COLUMN "co_debtor_id";
--> statement-breakpoint
ALTER TABLE "co_debtors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "co_debtors";
