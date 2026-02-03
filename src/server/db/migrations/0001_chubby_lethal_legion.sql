ALTER TABLE "credits_settings" RENAME COLUMN "code" TO "app_slug";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_code_unique";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_default_collection_method_id_payment_tender_types_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_default_repayment_method_id_repayment_methods_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_default_guarantee_type_id_payment_guarantee_types_id_fk";
--> statement-breakpoint
ALTER TABLE "credits_settings" DROP CONSTRAINT "credits_settings_fund_register_gl_account_id_gl_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "cost_centers" ALTER COLUMN "name" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "credits_settings" ALTER COLUMN "post_accounting_online" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "control_enabled";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "default_collection_method_id";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "treasury_document_number";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "default_repayment_method_id";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "default_guarantee_type_id";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "legacy_default_subsidy_mark";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "software_license_number";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "max_amount";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "max_installments";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "default_insurance_value";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "next_consecutive";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "fund_register_tax_id";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "fund_register_factor";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "fund_register_gl_account_id";--> statement-breakpoint
ALTER TABLE "credits_settings" DROP COLUMN "bank_account_number";--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_app_slug_unique" UNIQUE("app_slug");