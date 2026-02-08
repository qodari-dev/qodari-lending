ALTER TABLE "loans" RENAME COLUMN "code" TO "credit_number";--> statement-breakpoint
ALTER TABLE "loans" DROP CONSTRAINT "loans_code_unique";--> statement-breakpoint
DROP INDEX "uniq_loans_code";--> statement-breakpoint
ALTER TABLE "loan_application_status_history" ALTER COLUMN "changed_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_application_status_history" ADD COLUMN "changed_by_user_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "created_by_user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "status_changed_by_user_name" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loans_credit_number" ON "loans" USING btree ("credit_number");--> statement-breakpoint
ALTER TABLE "loan_application_act_numbers" DROP COLUMN "generated_by_user_id";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "fund_register_tax_id";--> statement-breakpoint
ALTER TABLE "loans" DROP COLUMN "fund_register_value";--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_credit_number_unique" UNIQUE("credit_number");