ALTER TABLE "credit_products" DROP CONSTRAINT "credit_products_cost_center_id_cost_centers_id_fk";
--> statement-breakpoint
DROP INDEX "idx_credit_products_cost_center";--> statement-breakpoint
ALTER TABLE "credit_products" DROP COLUMN "cost_center_id";