ALTER TABLE "loan_payments" RENAME COLUMN "code" TO "payment_number";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "movement_type_snapshot" TO "movement_type";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "payroll_payer_tax_id" TO "payroll_payer_document_number";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "legacy_valmay" TO "over_paid_amount";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "legacy_sub43_mark" TO "subsi_code";--> statement-breakpoint
ALTER TABLE "loan_payments" RENAME COLUMN "legacy_sub43_document" TO "subsi_document";--> statement-breakpoint
DROP INDEX "uniq_loan_payment_receipt";--> statement-breakpoint
ALTER TABLE "loan_payments" ALTER COLUMN "description" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_payments" ALTER COLUMN "note" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "created_by_user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "note_status" text;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD COLUMN "updated_by_user_name" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_payment_receipt" ON "loan_payments" USING btree ("receipt_type_id","payment_number");--> statement-breakpoint
ALTER TABLE "loan_payments" DROP COLUMN "cash_amount";--> statement-breakpoint
ALTER TABLE "loan_payments" DROP COLUMN "check_amount";--> statement-breakpoint
ALTER TABLE "loan_payments" DROP COLUMN "credit_amount";--> statement-breakpoint
ALTER TABLE "loan_payments" DROP COLUMN "returned_amount";--> statement-breakpoint
ALTER TABLE "loan_payments" DROP COLUMN "is_interfaced";