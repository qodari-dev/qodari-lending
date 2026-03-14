ALTER TYPE "public"."subsidy_pledge_payment_voucher_status" ADD VALUE 'QUEUED' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."subsidy_pledge_payment_voucher_status" ADD VALUE 'RUNNING' BEFORE 'COMPLETED';--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_vouchers" ALTER COLUMN "status" SET DEFAULT 'QUEUED';--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_vouchers" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_vouchers" ADD COLUMN "finished_at" timestamp with time zone;