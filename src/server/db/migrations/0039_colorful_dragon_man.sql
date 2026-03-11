-- Fix: loan_application_documents.uploaded_by_user_name was incorrectly defined as uuid
ALTER TABLE "loan_application_documents" ALTER COLUMN "uploaded_by_user_name" SET DATA TYPE varchar(255);--> statement-breakpoint

-- Fix: loan_application_risk_assessments had duplicate column name 'executed_by_user_id'
-- The varchar column 'executed_by_user_id' was actually executedByUserName (typo in column name)
-- Step 1: Rename the buggy column and change type of the real one
ALTER TABLE "loan_application_risk_assessments" ADD COLUMN "executed_by_user_name" varchar(255);--> statement-breakpoint
UPDATE "loan_application_risk_assessments" SET "executed_by_user_name" = 'Sistema' WHERE "executed_by_user_name" IS NULL;--> statement-breakpoint
ALTER TABLE "loan_application_risk_assessments" ALTER COLUMN "executed_by_user_name" SET NOT NULL;--> statement-breakpoint

-- Add missing createdByUserName to payroll_excess_payments
ALTER TABLE "payroll_excess_payments" ADD COLUMN "created_by_user_name" varchar(255);--> statement-breakpoint
UPDATE "payroll_excess_payments" SET "created_by_user_name" = 'Sistema' WHERE "created_by_user_name" IS NULL;--> statement-breakpoint
ALTER TABLE "payroll_excess_payments" ALTER COLUMN "created_by_user_name" SET NOT NULL;
