CREATE TYPE "public"."accounting_entries_status" AS ENUM('DRAFT', 'POSTED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."accounting_entry_source_type" AS ENUM('LOAN_APPROVAL', 'LOAN_PAYMENT', 'LOAN_PAYMENT_VOID', 'PROCESS_RUN', 'MANUAL_ADJUSTMENT', 'REFINANCE');--> statement-breakpoint
DROP INDEX "idx_entries_voucher";--> statement-breakpoint
DROP INDEX "idx_entries_loan_installment_due_status";--> statement-breakpoint
DROP INDEX "idx_entries_gl_third_party_status";--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD COLUMN "status" "accounting_entries_status" DEFAULT 'DRAFT' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD COLUMN "status_date" date;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD COLUMN "source_type" "accounting_entry_source_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD COLUMN "source_id" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD COLUMN "reversal_of_entry_id" integer;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "fk_accounting_entries_reversal_of_entry" FOREIGN KEY ("reversal_of_entry_id") REFERENCES "public"."accounting_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounting_entries_source" ON "accounting_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_accounting_entries_reversal" ON "accounting_entries" USING btree ("reversal_of_entry_id");--> statement-breakpoint
CREATE INDEX "idx_entries_loan_installment_due_status" ON "accounting_entries" USING btree ("loan_id","installment_number","due_date","status");--> statement-breakpoint
CREATE INDEX "idx_entries_gl_third_party_status" ON "accounting_entries" USING btree ("gl_account_id","third_party_id","status");--> statement-breakpoint
ALTER TABLE "accounting_entries" DROP COLUMN "voucher_number";--> statement-breakpoint
ALTER TABLE "accounting_entries" DROP COLUMN "check_number";--> statement-breakpoint
ALTER TABLE "accounting_entries" DROP COLUMN "status_code";--> statement-breakpoint
ALTER TABLE "accounting_entries" DROP COLUMN "transaction_type_code";--> statement-breakpoint
ALTER TABLE "accounting_entries" DROP COLUMN "transaction_document";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "voucher_number";--> statement-breakpoint
ALTER TABLE "portfolio_entries" DROP COLUMN "legacy_status_code";