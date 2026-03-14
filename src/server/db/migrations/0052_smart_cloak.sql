CREATE TYPE "public"."subsidy_pledge_payment_voucher_item_status" AS ENUM('PROCESSED', 'SKIPPED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."subsidy_pledge_payment_voucher_status" AS ENUM('COMPLETED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TABLE "subsidy_pledge_payment_voucher_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"source_fingerprint" varchar(255) NOT NULL,
	"worker_document_number" varchar(20),
	"subsidy_mark" varchar(20),
	"subsidy_document" varchar(50),
	"subsidy_cross_document_number" varchar(50),
	"credit_number" varchar(50),
	"loan_id" integer,
	"loan_payment_id" integer,
	"discounted_amount" numeric(14, 2) NOT NULL,
	"applied_amount" numeric(14, 2),
	"status" "subsidy_pledge_payment_voucher_item_status" NOT NULL,
	"message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subsidy_pledge_payment_vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"period" varchar(50) NOT NULL,
	"movement_generation_date" date NOT NULL,
	"subsidy_source" varchar(20) NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_credits" integer DEFAULT 0 NOT NULL,
	"processed_payments" integer DEFAULT 0 NOT NULL,
	"skipped_rows" integer DEFAULT 0 NOT NULL,
	"error_rows" integer DEFAULT 0 NOT NULL,
	"total_discounted_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_applied_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "subsidy_pledge_payment_voucher_status" DEFAULT 'COMPLETED' NOT NULL,
	"message" text,
	"created_by_user_id" uuid NOT NULL,
	"created_by_user_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credits_settings" ADD COLUMN "pledge_payment_receipt_type_id" integer;--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_voucher_items" ADD CONSTRAINT "subsidy_pledge_payment_voucher_items_voucher_id_subsidy_pledge_payment_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."subsidy_pledge_payment_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_voucher_items" ADD CONSTRAINT "subsidy_pledge_payment_voucher_items_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subsidy_pledge_payment_voucher_items" ADD CONSTRAINT "subsidy_pledge_payment_voucher_items_loan_payment_id_loan_payments_id_fk" FOREIGN KEY ("loan_payment_id") REFERENCES "public"."loan_payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_voucher_items_voucher" ON "subsidy_pledge_payment_voucher_items" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_voucher_items_status" ON "subsidy_pledge_payment_voucher_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_voucher_items_loan" ON "subsidy_pledge_payment_voucher_items" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_voucher_items_payment" ON "subsidy_pledge_payment_voucher_items" USING btree ("loan_payment_id");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_voucher_items_fingerprint" ON "subsidy_pledge_payment_voucher_items" USING btree ("source_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_vouchers_period" ON "subsidy_pledge_payment_vouchers" USING btree ("period");--> statement-breakpoint
CREATE INDEX "idx_subsidy_pledge_payment_vouchers_status" ON "subsidy_pledge_payment_vouchers" USING btree ("status");--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_pledge_payment_receipt_type_id_payment_receipt_types_id_fk" FOREIGN KEY ("pledge_payment_receipt_type_id") REFERENCES "public"."payment_receipt_types"("id") ON DELETE restrict ON UPDATE no action;