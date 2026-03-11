ALTER TABLE "credit_products" DROP CONSTRAINT "credit_products_payment_allocation_policy_id_payment_allocation_policies_id_fk";
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_payment_allocation_policy_id_payment_allocation_policies_id_fk"
  FOREIGN KEY ("payment_allocation_policy_id") REFERENCES "public"."payment_allocation_policies"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
