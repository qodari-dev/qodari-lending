ALTER TABLE "third_parties" DROP CONSTRAINT "third_parties_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "third_parties" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "third_parties" DROP COLUMN "city_id";--> statement-breakpoint
ALTER TABLE "third_parties" DROP COLUMN "phone";