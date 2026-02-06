ALTER TABLE "aging_profiles" DROP CONSTRAINT "chk_aging_profiles_effective_order";--> statement-breakpoint
ALTER TABLE "accounting_periods" ALTER COLUMN "closed_by_user_name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "affiliation_offices" ADD COLUMN "city_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "user_payment_receipt_types" ADD COLUMN "user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "affiliation_offices" ADD CONSTRAINT "affiliation_offices_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aging_profiles" DROP COLUMN "effective_from";--> statement-breakpoint
ALTER TABLE "aging_profiles" DROP COLUMN "effective_to";