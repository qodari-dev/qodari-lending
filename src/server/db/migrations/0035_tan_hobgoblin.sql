ALTER TABLE "loan_applications" ADD COLUMN "approval_assigned_at" timestamp with time zone;
ALTER TABLE "loan_application_approval_history" ADD COLUMN "approval_assigned_at" timestamp with time zone;

UPDATE "loan_applications"
SET "approval_assigned_at" = COALESCE("updated_at", "created_at")
WHERE "status" = 'PENDING'
  AND "assigned_approval_user_id" IS NOT NULL
  AND "approval_assigned_at" IS NULL;

UPDATE "loan_application_approval_history"
SET "approval_assigned_at" = "occurred_at"
WHERE "assigned_to_user_id" IS NOT NULL
  AND "approval_assigned_at" IS NULL;

UPDATE "loan_approval_level_users"
SET "sort_order" = 1
WHERE "sort_order" < 1;

ALTER TABLE "loan_approval_level_users" ALTER COLUMN "sort_order" SET DEFAULT 1;

ALTER TABLE "loan_approval_level_users" DROP CONSTRAINT "chk_loan_approval_level_users_sort_order_min";
ALTER TABLE "loan_approval_level_users" ADD CONSTRAINT "chk_loan_approval_level_users_sort_order_min" CHECK ("loan_approval_level_users"."sort_order" >= 1);
