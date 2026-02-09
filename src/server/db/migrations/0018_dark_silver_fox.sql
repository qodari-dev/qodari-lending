ALTER TABLE "billing_concepts" ALTER COLUMN "concept_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."billing_concept_type";--> statement-breakpoint
CREATE TYPE "public"."billing_concept_type" AS ENUM('PRINCIPAL', 'INTEREST', 'LATE_INTEREST', 'INSURANCE', 'FEE', 'GUARANTEE', 'OTHER');--> statement-breakpoint
ALTER TABLE "billing_concepts" ALTER COLUMN "concept_type" SET DATA TYPE "public"."billing_concept_type" USING "concept_type"::"public"."billing_concept_type";--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" DROP COLUMN "is_mandatory";--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" DROP COLUMN "charge_order";