ALTER TABLE "payment_allocation_policy_rules" RENAME COLUMN "policy_id" TO "payment_allocation_policy_id";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" DROP CONSTRAINT "payment_allocation_policy_rules_policy_id_payment_allocation_policies_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_payment_allocation_policies_code";--> statement-breakpoint
DROP INDEX "uniq_payment_alloc_rule_order";--> statement-breakpoint
DROP INDEX "uniq_payment_alloc_rule_concept";--> statement-breakpoint
DROP INDEX "idx_payment_alloc_rules_policy";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ADD CONSTRAINT "payment_allocation_policy_rules_payment_allocation_policy_id_payment_allocation_policies_id_fk" FOREIGN KEY ("payment_allocation_policy_id") REFERENCES "public"."payment_allocation_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_allocation_policies_name" ON "payment_allocation_policies" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_alloc_rule_order" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_alloc_rule_concept" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id","billing_concept_id");--> statement-breakpoint
CREATE INDEX "idx_payment_alloc_rules_policy" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id");--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" DROP COLUMN "start_date";--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" DROP COLUMN "end_date";--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "payment_allocation_policies" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" DROP COLUMN "note";