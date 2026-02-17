ALTER TABLE "accounting_distribution_lines" DROP CONSTRAINT "accounting_distribution_lines_cost_center_id_cost_centers_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_distribution_line";--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_distribution_line" ON "accounting_distribution_lines" USING btree ("accounting_distribution_id","gl_account_id");--> statement-breakpoint
ALTER TABLE "accounting_distribution_lines" DROP COLUMN "cost_center_id";