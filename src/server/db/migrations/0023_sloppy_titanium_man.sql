DROP INDEX "uniq_loan_installment_version_number";--> statement-breakpoint
DROP INDEX "idx_installments_loan_version_due";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_installment_version_number" ON "loan_installments" USING btree ("loan_id","installment_number");--> statement-breakpoint
CREATE INDEX "idx_installments_loan_version_due" ON "loan_installments" USING btree ("loan_id","due_date");--> statement-breakpoint
ALTER TABLE "loan_installments" DROP COLUMN "schedule_version";