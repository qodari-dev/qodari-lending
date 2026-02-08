ALTER TABLE "loan_application_pledges" RENAME COLUMN "agreement_code" TO "pledge_code";--> statement-breakpoint
ALTER TABLE "loan_application_pledges" RENAME COLUMN "spouse_document_number" TO "document_number";--> statement-breakpoint
ALTER TABLE "loan_applications" RENAME COLUMN "code" TO "credit_number";--> statement-breakpoint
ALTER TABLE "loan_applications" DROP CONSTRAINT "loan_applications_code_unique";--> statement-breakpoint
DROP INDEX "idx_pledges_agreement";--> statement-breakpoint
DROP INDEX "uniq_pledge_application_beneficiary";--> statement-breakpoint
ALTER TABLE "loan_applications" ALTER COLUMN "repayment_method_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_applications" ALTER COLUMN "note" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_applications" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "created_by_user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "payment_guarantee_type_id" integer;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "status_note" text;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_payment_guarantee_type_id_payment_guarantee_types_id_fk" FOREIGN KEY ("payment_guarantee_type_id") REFERENCES "public"."payment_guarantee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pledges_pledge_code" ON "loan_application_pledges" USING btree ("pledge_code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pledge_application_beneficiary" ON "loan_application_pledges" USING btree ("loan_application_id","pledge_code","beneficiary_code");--> statement-breakpoint
ALTER TABLE "loan_applications" DROP COLUMN "approval_type";--> statement-breakpoint
ALTER TABLE "loan_applications" DROP COLUMN "received_date";--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_credit_number_unique" UNIQUE("credit_number");--> statement-breakpoint
DROP TYPE "public"."loan_approval_type";