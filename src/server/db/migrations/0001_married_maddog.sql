CREATE TYPE "public"."day_count_convention" AS ENUM('30_360', 'ACTUAL_360', 'ACTUAL_365', 'ACTUAL_ACTUAL');--> statement-breakpoint
CREATE TYPE "public"."insurance_accrual_method" AS ENUM('ONE_TIME', 'PER_INSTALLMENT', 'DAILY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."insurance_base_amount" AS ENUM('OUTSTANDING_BALANCE', 'DISBURSED_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."insurance_rate_type" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."interest_accrual_method" AS ENUM('DAILY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."interest_rate_type" AS ENUM('EFFECTIVE_ANNUAL', 'NOMINAL_MONTHLY', 'NOMINAL_ANNUAL', 'MONTHLY_FLAT');--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ALTER COLUMN "rate_value" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "interest_rate_type" "interest_rate_type" DEFAULT 'EFFECTIVE_ANNUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "interest_accrual_method" "interest_accrual_method" DEFAULT 'DAILY' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "interest_day_count_convention" "day_count_convention" DEFAULT 'ACTUAL_360' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "late_interest_rate_type" "interest_rate_type" DEFAULT 'EFFECTIVE_ANNUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "late_interest_accrual_method" "interest_accrual_method" DEFAULT 'DAILY' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "late_interest_day_count_convention" "day_count_convention" DEFAULT 'ACTUAL_360' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "insurance_accrual_method" "insurance_accrual_method" DEFAULT 'PER_INSTALLMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "insurance_base_amount" "insurance_base_amount" DEFAULT 'OUTSTANDING_BALANCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "insurance_day_count_convention" "day_count_convention";--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD COLUMN "rate_type" "insurance_rate_type" DEFAULT 'PERCENTAGE' NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD COLUMN "fixed_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "chk_credit_products_ins_day_count_required_when_daily" CHECK ("credit_products"."insurance_accrual_method" <> 'DAILY' OR "credit_products"."insurance_day_count_convention" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "chk_credit_products_ins_day_count_only_for_daily" CHECK ("credit_products"."insurance_accrual_method" = 'DAILY' OR "credit_products"."insurance_day_count_convention" IS NULL);--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD CONSTRAINT "chk_insurance_ranges_percentage_fields" CHECK ("insurance_rate_ranges"."rate_type" <> 'PERCENTAGE' OR ("insurance_rate_ranges"."rate_value" IS NOT NULL AND "insurance_rate_ranges"."fixed_amount" IS NULL));--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD CONSTRAINT "chk_insurance_ranges_fixed_fields" CHECK ("insurance_rate_ranges"."rate_type" <> 'FIXED_AMOUNT' OR ("insurance_rate_ranges"."fixed_amount" IS NOT NULL AND "insurance_rate_ranges"."rate_value" IS NULL));