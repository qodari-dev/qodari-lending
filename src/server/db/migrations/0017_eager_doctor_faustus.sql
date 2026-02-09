ALTER TABLE "credit_product_billing_concepts" DROP CONSTRAINT "credit_product_billing_concepts_override_rule_id_billing_concept_rules_id_fk";
--> statement-breakpoint
ALTER TABLE "loan_process_states" DROP CONSTRAINT "loan_process_states_last_process_run_id_process_runs_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_portfolio_aging_snapshot";--> statement-breakpoint
ALTER TABLE "loan_application_risk_assessments" ALTER COLUMN "executed_by_user_id" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ALTER COLUMN "aging_profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ALTER COLUMN "executed_by_user_id" SET DATA TYPE uuid USING NULL;--> statement-breakpoint
ALTER TABLE "process_runs" ADD COLUMN "executed_by_user_name" varchar(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_billing_concept_rule_id_concept" ON "billing_concept_rules" USING btree ("id","billing_concept_id");--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ADD CONSTRAINT "fk_credit_product_billing_concepts_override_rule_concept" FOREIGN KEY ("override_rule_id","billing_concept_id") REFERENCES "public"."billing_concept_rules"("id","billing_concept_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_process_states" ADD CONSTRAINT "loan_process_states_last_process_run_id_process_runs_id_fk" FOREIGN KEY ("last_process_run_id") REFERENCES "public"."process_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_alloc_rule_concept" ON "payment_allocation_policy_rules" USING btree ("policy_id","billing_concept_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_portfolio_aging_snapshot" ON "portfolio_aging_snapshots" USING btree ("accounting_period_id","aging_profile_id","loan_id","gl_account_id");--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_percentage_required" CHECK ("billing_concept_rules"."calc_method" <> 'PERCENTAGE' OR ("billing_concept_rules"."base_amount" IS NOT NULL AND "billing_concept_rules"."rate" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_percentage_no_amount" CHECK ("billing_concept_rules"."calc_method" <> 'PERCENTAGE' OR "billing_concept_rules"."amount" IS NULL);--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_fixed_amount_required" CHECK ("billing_concept_rules"."calc_method" <> 'FIXED_AMOUNT' OR "billing_concept_rules"."amount" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_fixed_amount_no_rate" CHECK ("billing_concept_rules"."calc_method" <> 'FIXED_AMOUNT' OR ("billing_concept_rules"."base_amount" IS NULL AND "billing_concept_rules"."rate" IS NULL));--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_tier_requires_value_source" CHECK ("billing_concept_rules"."calc_method" <> 'TIERED' OR ("billing_concept_rules"."amount" IS NOT NULL OR ("billing_concept_rules"."base_amount" IS NOT NULL AND "billing_concept_rules"."rate" IS NOT NULL)));--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "chk_billing_rules_effective_order" CHECK ("billing_concept_rules"."effective_from" IS NULL OR "billing_concept_rules"."effective_to" IS NULL OR "billing_concept_rules"."effective_from" <= "billing_concept_rules"."effective_to");--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ADD CONSTRAINT "chk_loan_ref_link_not_self" CHECK ("loan_refinancing_links"."loan_id" <> "loan_refinancing_links"."reference_loan_id");--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "chk_portfolio_entry_charge_nonneg" CHECK ("portfolio_entries"."charge_amount" >= 0);--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "chk_portfolio_entry_payment_nonneg" CHECK ("portfolio_entries"."payment_amount" >= 0);--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "chk_portfolio_entry_balance_formula" CHECK ("portfolio_entries"."balance" = "portfolio_entries"."charge_amount" - "portfolio_entries"."payment_amount");--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "chk_portfolio_entry_balance_nonneg" CHECK ("portfolio_entries"."balance" >= 0);
