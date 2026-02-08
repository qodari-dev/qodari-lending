ALTER TABLE "agreements" RENAME COLUMN "nit" TO "document_number";--> statement-breakpoint
ALTER TABLE "billing_cycle_profiles" DROP CONSTRAINT "chk_billing_cycle_profiles_effective_order";--> statement-breakpoint
DROP INDEX "uniq_agreements_legacy_idecon";--> statement-breakpoint
DROP INDEX "idx_agreements_status";--> statement-breakpoint
DROP INDEX "idx_agreements_nit";--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "city_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agreements_nit" ON "agreements" USING btree ("document_number");--> statement-breakpoint
ALTER TABLE "agreements" DROP COLUMN "legacy_idecon";--> statement-breakpoint
ALTER TABLE "agreements" DROP COLUMN "type_code";--> statement-breakpoint
ALTER TABLE "agreements" DROP COLUMN "zone_code";--> statement-breakpoint
ALTER TABLE "agreements" DROP COLUMN "status_code";--> statement-breakpoint
ALTER TABLE "billing_cycle_profiles" DROP COLUMN "effective_from";--> statement-breakpoint
ALTER TABLE "billing_cycle_profiles" DROP COLUMN "effective_to";