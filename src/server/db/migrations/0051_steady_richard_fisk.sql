ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::text;--> statement-breakpoint
UPDATE "loan_installments" SET "status" = 'REFINANCED' WHERE "status" = 'RELIQUIDATED';--> statement-breakpoint
DROP TYPE "public"."installment_record_status";--> statement-breakpoint
CREATE TYPE "public"."installment_record_status" AS ENUM('GENERATED', 'ACCOUNTED', 'VOID', 'REFINANCED', 'CAUSED');--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::"public"."installment_record_status";--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DATA TYPE "public"."installment_record_status" USING "status"::"public"."installment_record_status";--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::text;--> statement-breakpoint
UPDATE "loans" SET "status" = 'REFINANCED' WHERE "status" = 'RELIQUIDATED';--> statement-breakpoint
UPDATE "loan_status_history" SET "from_status" = 'REFINANCED' WHERE "from_status" = 'RELIQUIDATED';--> statement-breakpoint
UPDATE "loan_status_history" SET "to_status" = 'REFINANCED' WHERE "to_status" = 'RELIQUIDATED';--> statement-breakpoint
DROP TYPE "public"."loan_status";--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('GENERATED', 'ACCOUNTED', 'VOID', 'REFINANCED', 'PAID');--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "from_status" SET DATA TYPE "public"."loan_status" USING "from_status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loan_status_history" ALTER COLUMN "to_status" SET DATA TYPE "public"."loan_status" USING "to_status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "loans" ALTER COLUMN "status" SET DATA TYPE "public"."loan_status" USING "status"::"public"."loan_status";--> statement-breakpoint
ALTER TABLE "credits_settings" ADD COLUMN "refinancing_receipt_type_id" integer;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_refinancing_receipt_type_id_payment_receipt_types_id_fk" FOREIGN KEY ("refinancing_receipt_type_id") REFERENCES "public"."payment_receipt_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_refinance_policies" DROP COLUMN "require_approval";