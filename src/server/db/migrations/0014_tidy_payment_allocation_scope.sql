ALTER TABLE "payment_allocation_policy_rules" DROP COLUMN "order_within";--> statement-breakpoint
DROP TYPE "public"."allocation_order_within";--> statement-breakpoint

ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" DROP DEFAULT;--> statement-breakpoint
ALTER TYPE "public"."allocation_scope" RENAME TO "allocation_scope_old";--> statement-breakpoint
CREATE TYPE "public"."allocation_scope" AS ENUM('ONLY_PAST_DUE', 'PAST_DUE_FIRST');--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DATA TYPE "public"."allocation_scope" USING (
  CASE
    WHEN "scope"::text = 'CURRENT_ALLOWED' THEN 'PAST_DUE_FIRST'
    ELSE "scope"::text
  END
)::"public"."allocation_scope";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DEFAULT 'PAST_DUE_FIRST';--> statement-breakpoint
DROP TYPE "public"."allocation_scope_old";
