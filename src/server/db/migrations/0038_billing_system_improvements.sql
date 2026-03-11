-- =================================================================
-- 0038: Billing System Improvements
-- - FK RESTRICT en billing_cycle_profiles, agreements, dispatches
-- - Nuevas columnas en dispatches: dispatch_number, total_billed_amount, total_credits
-- - Nueva tabla: agreement_billing_email_dispatch_items
-- - Nueva columna en loan_payments: billing_dispatch_id
-- =================================================================

-- -----------------------------------------------------------------
-- 1. FK RESTRICT: billing_cycle_profiles.agreement_id
-- -----------------------------------------------------------------
ALTER TABLE "billing_cycle_profiles"
  DROP CONSTRAINT "billing_cycle_profiles_agreement_id_agreements_id_fk";
ALTER TABLE "billing_cycle_profiles"
  ADD CONSTRAINT "billing_cycle_profiles_agreement_id_agreements_id_fk"
  FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- -----------------------------------------------------------------
-- 2. FK RESTRICT: agreements.billing_email_template_id
-- -----------------------------------------------------------------
ALTER TABLE "agreements"
  DROP CONSTRAINT "agreements_billing_email_template_id_billing_email_templates_id_fk";
ALTER TABLE "agreements"
  ADD CONSTRAINT "agreements_billing_email_template_id_billing_email_templates_id_fk"
  FOREIGN KEY ("billing_email_template_id") REFERENCES "public"."billing_email_templates"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- -----------------------------------------------------------------
-- 3. FK RESTRICT: agreement_billing_email_dispatches.agreement_id
-- -----------------------------------------------------------------
ALTER TABLE "agreement_billing_email_dispatches"
  DROP CONSTRAINT "agreement_billing_email_dispatches_agreement_id_agreements_id_fk";
ALTER TABLE "agreement_billing_email_dispatches"
  ADD CONSTRAINT "agreement_billing_email_dispatches_agreement_id_agreements_id_fk"
  FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- -----------------------------------------------------------------
-- 4. FK RESTRICT: agreement_billing_email_dispatches.billing_cycle_profile_id
-- -----------------------------------------------------------------
ALTER TABLE "agreement_billing_email_dispatches"
  DROP CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_id_billing_cycle_profiles_id_fk";
ALTER TABLE "agreement_billing_email_dispatches"
  ADD CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_id_billing_cycle_profiles_id_fk"
  FOREIGN KEY ("billing_cycle_profile_id") REFERENCES "public"."billing_cycle_profiles"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- -----------------------------------------------------------------
-- 5. FK RESTRICT: agreement_billing_email_dispatches.billing_cycle_profile_cycle_id
-- -----------------------------------------------------------------
ALTER TABLE "agreement_billing_email_dispatches"
  DROP CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_cycle_id_billing_cycle_profile_cycles_id_fk";
ALTER TABLE "agreement_billing_email_dispatches"
  ADD CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_cycle_id_billing_cycle_profile_cycles_id_fk"
  FOREIGN KEY ("billing_cycle_profile_cycle_id") REFERENCES "public"."billing_cycle_profile_cycles"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- -----------------------------------------------------------------
-- 6. Nuevas columnas en agreement_billing_email_dispatches
-- -----------------------------------------------------------------
ALTER TABLE "agreement_billing_email_dispatches"
  ADD COLUMN "dispatch_number" integer NOT NULL DEFAULT 0;
ALTER TABLE "agreement_billing_email_dispatches"
  ADD COLUMN "total_billed_amount" numeric(14, 2);
ALTER TABLE "agreement_billing_email_dispatches"
  ADD COLUMN "total_credits" integer;
ALTER TABLE "agreement_billing_email_dispatches"
  ADD CONSTRAINT "chk_agreement_billing_email_dispatch_number_min"
  CHECK ("dispatch_number" >= 0);

-- -----------------------------------------------------------------
-- 7. Nueva tabla: agreement_billing_email_dispatch_items
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "agreement_billing_email_dispatch_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "dispatch_id" integer NOT NULL,
  "loan_id" integer NOT NULL,
  "credit_number" varchar(50) NOT NULL,
  "borrower_name" varchar(255) NOT NULL,
  "borrower_document" varchar(17) NOT NULL,
  "current_balance" numeric(14, 2) NOT NULL,
  "installment_amount" numeric(14, 2) NOT NULL,
  "overdue_amount" numeric(14, 2) NOT NULL DEFAULT '0',
  "days_past_due" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "agreement_billing_email_dispatch_items"
  ADD CONSTRAINT "agreement_billing_email_dispatch_items_dispatch_id_agreement_billing_email_dispatches_id_fk"
  FOREIGN KEY ("dispatch_id") REFERENCES "public"."agreement_billing_email_dispatches"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "agreement_billing_email_dispatch_items"
  ADD CONSTRAINT "agreement_billing_email_dispatch_items_loan_id_loans_id_fk"
  FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

CREATE INDEX IF NOT EXISTS "idx_dispatch_items_dispatch"
  ON "agreement_billing_email_dispatch_items" USING btree ("dispatch_id");
CREATE INDEX IF NOT EXISTS "idx_dispatch_items_loan"
  ON "agreement_billing_email_dispatch_items" USING btree ("loan_id");

-- -----------------------------------------------------------------
-- 8. Nueva columna en loan_payments: billing_dispatch_id
-- -----------------------------------------------------------------
ALTER TABLE "loan_payments"
  ADD COLUMN "billing_dispatch_id" integer;
ALTER TABLE "loan_payments"
  ADD CONSTRAINT "loan_payments_billing_dispatch_id_agreement_billing_email_dispatches_id_fk"
  FOREIGN KEY ("billing_dispatch_id") REFERENCES "public"."agreement_billing_email_dispatches"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
