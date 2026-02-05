CREATE TYPE "public"."insurance_rate_range_metric" AS ENUM('INSTALLMENT_COUNT', 'CREDIT_AMOUNT');--> statement-breakpoint
ALTER TABLE "credit_products" DROP CONSTRAINT "credit_products_study_gl_account_id_gl_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_cities_name";--> statement-breakpoint
DROP INDEX "uniq_insurance_rate_range";--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "insurance_range_metric" "insurance_rate_range_metric" DEFAULT 'CREDIT_AMOUNT' NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "city_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD COLUMN "range_metric" "insurance_rate_range_metric" NOT NULL;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cities_code" ON "cities" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_insurance_rate_range" ON "insurance_rate_ranges" USING btree ("insurance_company_id","range_metric","value_from","value_to");--> statement-breakpoint
ALTER TABLE "credit_products" DROP COLUMN "study_fee_amount";--> statement-breakpoint
ALTER TABLE "credit_products" DROP COLUMN "study_gl_account_id";