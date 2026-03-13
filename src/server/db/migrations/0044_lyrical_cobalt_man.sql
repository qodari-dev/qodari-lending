ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::text;--> statement-breakpoint
UPDATE "loan_installments" SET "status" = 'CAUSED' WHERE "status" = 'INACTIVE';--> statement-breakpoint
DROP TYPE "public"."installment_record_status";--> statement-breakpoint
CREATE TYPE "public"."installment_record_status" AS ENUM('GENERATED', 'ACCOUNTED', 'VOID', 'RELIQUIDATED', 'CAUSED');--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DEFAULT 'GENERATED'::"public"."installment_record_status";--> statement-breakpoint
ALTER TABLE "loan_installments" ALTER COLUMN "status" SET DATA TYPE "public"."installment_record_status" USING "status"::"public"."installment_record_status";
