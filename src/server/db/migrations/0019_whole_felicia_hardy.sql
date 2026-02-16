CREATE TYPE "public"."payment_schedule_mode" AS ENUM('INTERVAL_DAYS', 'MONTHLY_CALENDAR', 'SEMI_MONTHLY');--> statement-breakpoint
CREATE TABLE "credit_product_charge_off_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"allow_charge_off" boolean DEFAULT false NOT NULL,
	"min_days_past_due" integer DEFAULT 180 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_charge_off_policy_min_dpd" CHECK ("credit_product_charge_off_policies"."min_days_past_due" >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_frequencies" RENAME COLUMN "days_interval" TO "interval_days";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DEFAULT 'PAST_DUE_FIRST'::text;--> statement-breakpoint
DROP TYPE "public"."allocation_scope";--> statement-breakpoint
CREATE TYPE "public"."allocation_scope" AS ENUM('ONLY_PAST_DUE', 'PAST_DUE_FIRST');--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DEFAULT 'PAST_DUE_FIRST'::"public"."allocation_scope";--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ALTER COLUMN "scope" SET DATA TYPE "public"."allocation_scope" USING "scope"::"public"."allocation_scope";--> statement-breakpoint
ALTER TABLE "loan_applications" ALTER COLUMN "investment_type_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD COLUMN "min_days_before_first_collection" integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD COLUMN "schedule_mode" "payment_schedule_mode" DEFAULT 'INTERVAL_DAYS' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD COLUMN "day_of_month" integer;--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD COLUMN "semi_month_day_1" integer;--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD COLUMN "semi_month_day_2" integer;--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD COLUMN "use_end_of_month_fallback" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_product_charge_off_policies" ADD CONSTRAINT "credit_product_charge_off_policies_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_charge_off_policy_product" ON "credit_product_charge_off_policies" USING btree ("credit_product_id");--> statement-breakpoint
CREATE INDEX "idx_charge_off_policy_allow" ON "credit_product_charge_off_policies" USING btree ("allow_charge_off");--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" DROP COLUMN "order_within";--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_interval_days_min" CHECK ("payment_frequencies"."interval_days" IS NULL OR "payment_frequencies"."interval_days" >= 1);--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_day_of_month_range" CHECK ("payment_frequencies"."day_of_month" IS NULL OR "payment_frequencies"."day_of_month" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_semi_month_day1_range" CHECK ("payment_frequencies"."semi_month_day_1" IS NULL OR "payment_frequencies"."semi_month_day_1" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_semi_month_day2_range" CHECK ("payment_frequencies"."semi_month_day_2" IS NULL OR "payment_frequencies"."semi_month_day_2" BETWEEN 1 AND 31);--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_semi_month_day_order" CHECK ("payment_frequencies"."semi_month_day_1" IS NULL OR "payment_frequencies"."semi_month_day_2" IS NULL OR "payment_frequencies"."semi_month_day_1" < "payment_frequencies"."semi_month_day_2");--> statement-breakpoint
ALTER TABLE "payment_frequencies" ADD CONSTRAINT "chk_pf_mode_fields" CHECK (
        (
          "payment_frequencies"."schedule_mode" = 'INTERVAL_DAYS'
          AND "payment_frequencies"."interval_days" IS NOT NULL
          AND "payment_frequencies"."day_of_month" IS NULL
          AND "payment_frequencies"."semi_month_day_1" IS NULL
          AND "payment_frequencies"."semi_month_day_2" IS NULL
        )
        OR
        (
          "payment_frequencies"."schedule_mode" = 'MONTHLY_CALENDAR'
          AND "payment_frequencies"."interval_days" IS NULL
          AND "payment_frequencies"."day_of_month" IS NOT NULL
          AND "payment_frequencies"."semi_month_day_1" IS NULL
          AND "payment_frequencies"."semi_month_day_2" IS NULL
        )
        OR
        (
          "payment_frequencies"."schedule_mode" = 'SEMI_MONTHLY'
          AND "payment_frequencies"."interval_days" IS NULL
          AND "payment_frequencies"."day_of_month" IS NULL
          AND "payment_frequencies"."semi_month_day_1" IS NOT NULL
          AND "payment_frequencies"."semi_month_day_2" IS NOT NULL
        )
      );--> statement-breakpoint
DROP TYPE "public"."allocation_order_within";