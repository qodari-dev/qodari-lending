CREATE TYPE "public"."payment_schedule_mode" AS ENUM('INTERVAL_DAYS', 'MONTHLY_CALENDAR', 'SEMI_MONTHLY');--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD COLUMN "schedule_mode" "payment_schedule_mode" DEFAULT 'INTERVAL_DAYS' NOT NULL,
  ADD COLUMN "interval_days" integer,
  ADD COLUMN "day_of_month" integer,
  ADD COLUMN "semi_month_day_1" integer,
  ADD COLUMN "semi_month_day_2" integer,
  ADD COLUMN "use_end_of_month_fallback" boolean DEFAULT true NOT NULL;--> statement-breakpoint

UPDATE "payment_frequencies"
SET "interval_days" = "days_interval"
WHERE "interval_days" IS NULL;--> statement-breakpoint

ALTER TABLE "payment_frequencies" DROP COLUMN "days_interval";--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_interval_days_min"
  CHECK ("interval_days" IS NULL OR "interval_days" >= 1);--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_day_of_month_range"
  CHECK ("day_of_month" IS NULL OR "day_of_month" BETWEEN 1 AND 31);--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_semi_month_day1_range"
  CHECK ("semi_month_day_1" IS NULL OR "semi_month_day_1" BETWEEN 1 AND 31);--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_semi_month_day2_range"
  CHECK ("semi_month_day_2" IS NULL OR "semi_month_day_2" BETWEEN 1 AND 31);--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_semi_month_day_order"
  CHECK ("semi_month_day_1" IS NULL OR "semi_month_day_2" IS NULL OR "semi_month_day_1" < "semi_month_day_2");--> statement-breakpoint

ALTER TABLE "payment_frequencies"
  ADD CONSTRAINT "chk_pf_mode_fields"
  CHECK (
    (
      "schedule_mode" = 'INTERVAL_DAYS'
      AND "interval_days" IS NOT NULL
      AND "day_of_month" IS NULL
      AND "semi_month_day_1" IS NULL
      AND "semi_month_day_2" IS NULL
    )
    OR
    (
      "schedule_mode" = 'MONTHLY_CALENDAR'
      AND "interval_days" IS NULL
      AND "day_of_month" IS NOT NULL
      AND "semi_month_day_1" IS NULL
      AND "semi_month_day_2" IS NULL
    )
    OR
    (
      "schedule_mode" = 'SEMI_MONTHLY'
      AND "interval_days" IS NULL
      AND "day_of_month" IS NULL
      AND "semi_month_day_1" IS NOT NULL
      AND "semi_month_day_2" IS NOT NULL
    )
  );
