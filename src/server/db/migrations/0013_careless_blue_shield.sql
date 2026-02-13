ALTER TYPE "public"."interest_rate_type" ADD VALUE 'EFFECTIVE_MONTHLY' BEFORE 'NOMINAL_MONTHLY';--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_concept_rules_tier_requires_metric";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_rules_percentage_required";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_rules_percentage_no_amount";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_rules_fixed_amount_required";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_rules_fixed_amount_no_rate";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP CONSTRAINT "chk_billing_rules_tier_requires_value_source";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "calc_method";--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ALTER COLUMN "calc_method" SET DATA TYPE text;--> statement-breakpoint

DROP TYPE "public"."billing_concept_calc_method";--> statement-breakpoint
CREATE TYPE "public"."billing_concept_calc_method" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'TIERED_FIXED_AMOUNT', 'TIERED_PERCENTAGE');--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ALTER COLUMN "calc_method" SET DATA TYPE "public"."billing_concept_calc_method" USING "calc_method"::"public"."billing_concept_calc_method";--> statement-breakpoint
ALTER TABLE "billing_concepts" ALTER COLUMN "default_frequency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ALTER COLUMN "override_frequency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ALTER COLUMN "frequency" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."billing_concept_frequency";--> statement-breakpoint
CREATE TYPE "public"."billing_concept_frequency" AS ENUM('ONE_TIME', 'MONTHLY', 'PER_INSTALLMENT');--> statement-breakpoint
ALTER TABLE "billing_concepts" ALTER COLUMN "default_frequency" SET DATA TYPE "public"."billing_concept_frequency" USING "default_frequency"::"public"."billing_concept_frequency";--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ALTER COLUMN "override_frequency" SET DATA TYPE "public"."billing_concept_frequency" USING "override_frequency"::"public"."billing_concept_frequency";--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ALTER COLUMN "frequency" SET DATA TYPE "public"."billing_concept_frequency" USING "frequency"::"public"."billing_concept_frequency";--> statement-breakpoint

ALTER TABLE "billing_concepts" ADD COLUMN "calc_method" "billing_concept_calc_method" NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "base_amount" "billing_concept_base_amount";--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "range_metric" "billing_concept_range_metric";--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "min_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "max_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "rounding_mode" "billing_concept_rounding_mode" DEFAULT 'NEAREST' NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD COLUMN "rounding_decimals" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD COLUMN "range_metric" "billing_concept_range_metric";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "base_amount";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "range_metric";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "min_amount";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "max_amount";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "rounding_mode";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "rounding_decimals";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_range_pair" CHECK (("billing_concept_rules"."value_from" IS NULL AND "billing_concept_rules"."value_to" IS NULL) OR ("billing_concept_rules"."value_from" IS NOT NULL AND "billing_concept_rules"."value_to" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_value_required" CHECK ("billing_concept_rules"."amount" IS NOT NULL OR "billing_concept_rules"."rate" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_min_max_order" CHECK ("billing_concepts"."min_amount" IS NULL OR "billing_concepts"."max_amount" IS NULL OR "billing_concepts"."min_amount" <= "billing_concepts"."max_amount");--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_fixed_no_base" CHECK ("billing_concepts"."calc_method" <> 'FIXED_AMOUNT' OR "billing_concepts"."base_amount" IS NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_percentage_requires_base" CHECK ("billing_concepts"."calc_method" <> 'PERCENTAGE' OR "billing_concepts"."base_amount" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_tier_fixed_no_base" CHECK ("billing_concepts"."calc_method" <> 'TIERED_FIXED_AMOUNT' OR "billing_concepts"."base_amount" IS NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_tier_percentage_requires_base" CHECK ("billing_concepts"."calc_method" <> 'TIERED_PERCENTAGE' OR "billing_concepts"."base_amount" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_tier_requires_metric" CHECK ("billing_concepts"."calc_method" NOT IN ('TIERED_FIXED_AMOUNT', 'TIERED_PERCENTAGE') OR "billing_concepts"."range_metric" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_non_tier_no_metric" CHECK ("billing_concepts"."calc_method" IN ('TIERED_FIXED_AMOUNT', 'TIERED_PERCENTAGE') OR "billing_concepts"."range_metric" IS NULL);--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "chk_billing_concepts_rounding_decimals_range" CHECK ("billing_concepts"."rounding_decimals" BETWEEN 0 AND 6);
