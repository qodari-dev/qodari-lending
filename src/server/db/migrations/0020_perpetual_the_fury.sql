ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_default_cost_center_id_cost_centers_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "default_cost_center_id";