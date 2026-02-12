ALTER TABLE "insurance_companies" RENAME COLUMN "monthly_distribution_id" TO "distribution_id";--> statement-breakpoint
ALTER TABLE "insurance_companies" DROP CONSTRAINT "insurance_companies_total_charge_distribution_id_accounting_distributions_id_fk";
--> statement-breakpoint
ALTER TABLE "insurance_companies" DROP CONSTRAINT "insurance_companies_monthly_distribution_id_accounting_distributions_id_fk";
--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" DROP COLUMN "factor";--> statement-breakpoint
ALTER TABLE "insurance_companies" DROP COLUMN "total_charge_distribution_id";