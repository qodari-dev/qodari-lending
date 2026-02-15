CREATE TABLE "credit_product_charge_off_policies" (
  "id" serial PRIMARY KEY NOT NULL,
  "credit_product_id" integer NOT NULL,
  "allow_charge_off" boolean DEFAULT false NOT NULL,
  "min_days_past_due" integer DEFAULT 180 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_charge_off_policy_min_dpd" CHECK ("credit_product_charge_off_policies"."min_days_past_due" >= 0)
);--> statement-breakpoint

ALTER TABLE "credit_product_charge_off_policies"
  ADD CONSTRAINT "credit_product_charge_off_policies_credit_product_id_credit_products_id_fk"
  FOREIGN KEY ("credit_product_id")
  REFERENCES "public"."credit_products"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "uniq_charge_off_policy_product"
  ON "credit_product_charge_off_policies" USING btree ("credit_product_id");--> statement-breakpoint

CREATE INDEX "idx_charge_off_policy_allow"
  ON "credit_product_charge_off_policies" USING btree ("allow_charge_off");
