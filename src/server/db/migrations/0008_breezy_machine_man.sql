ALTER TABLE "credit_products" DROP CONSTRAINT "chk_credit_products_ins_day_count_required_when_daily";--> statement-breakpoint
ALTER TABLE "credit_products" DROP CONSTRAINT "chk_credit_products_ins_day_count_only_for_daily";--> statement-breakpoint
ALTER TABLE "credit_products" ALTER COLUMN "insurance_accrual_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credit_products" ALTER COLUMN "insurance_accrual_method" SET DEFAULT 'PER_INSTALLMENT'::text;--> statement-breakpoint
DROP TYPE "public"."insurance_accrual_method";--> statement-breakpoint
CREATE TYPE "public"."insurance_accrual_method" AS ENUM('ONE_TIME', 'PER_INSTALLMENT');--> statement-breakpoint
ALTER TABLE "credit_products" ALTER COLUMN "insurance_accrual_method" SET DEFAULT 'PER_INSTALLMENT'::"public"."insurance_accrual_method";--> statement-breakpoint
ALTER TABLE "credit_products" ALTER COLUMN "insurance_accrual_method" SET DATA TYPE "public"."insurance_accrual_method" USING "insurance_accrual_method"::"public"."insurance_accrual_method";--> statement-breakpoint
ALTER TABLE "credit_products" DROP COLUMN "insurance_base_amount";--> statement-breakpoint
ALTER TABLE "credit_products" DROP COLUMN "insurance_day_count_convention";--> statement-breakpoint
DROP TYPE "public"."insurance_base_amount";