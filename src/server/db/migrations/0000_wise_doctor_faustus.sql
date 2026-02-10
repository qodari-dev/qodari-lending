CREATE TYPE "public"."account_detail_type" AS ENUM('RECEIVABLE', 'PAYABLE', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."accounting_entries_status" AS ENUM('DRAFT', 'POSTED', 'VOIDED');--> statement-breakpoint
CREATE TYPE "public"."accounting_entry_source_type" AS ENUM('LOAN_APPROVAL', 'LOAN_PAYMENT', 'LOAN_PAYMENT_VOID', 'PROCESS_RUN', 'MANUAL_ADJUSTMENT', 'REFINANCE');--> statement-breakpoint
CREATE TYPE "public"."allocation_scope" AS ENUM('ONLY_PAST_DUE', 'PAST_DUE_FIRST', 'CURRENT_ALLOWED');--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('SAVINGS', 'CHECKING');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_base_amount" AS ENUM('DISBURSED_AMOUNT', 'PRINCIPAL', 'OUTSTANDING_BALANCE', 'INSTALLMENT_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_calc_method" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'TIERED');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_financing_mode" AS ENUM('DISCOUNT_FROM_DISBURSEMENT', 'FINANCED_IN_LOAN', 'BILLED_SEPARATELY');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_frequency" AS ENUM('ONE_TIME', 'MONTHLY', 'PER_INSTALLMENT', 'PER_EVENT');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_range_metric" AS ENUM('INSTALLMENT_COUNT', 'DISBURSED_AMOUNT', 'PRINCIPAL', 'OUTSTANDING_BALANCE', 'INSTALLMENT_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_rounding_mode" AS ENUM('NEAREST', 'UP', 'DOWN');--> statement-breakpoint
CREATE TYPE "public"."billing_concept_type" AS ENUM('PRINCIPAL', 'INTEREST', 'LATE_INTEREST', 'INSURANCE', 'FEE', 'GUARANTEE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."category_code" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."entry_nature" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."financing_type" AS ENUM('FIXED_AMOUNT', 'ON_BALANCE');--> statement-breakpoint
CREATE TYPE "public"."installment_record_status" AS ENUM('GENERATED', 'ACCOUNTED', 'VOID', 'RELIQUIDATED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."insurance_rate_range_metric" AS ENUM('INSTALLMENT_COUNT', 'CREDIT_AMOUNT');--> statement-breakpoint
CREATE TYPE "public"."late_interest_age_basis" AS ENUM('OLDEST_OVERDUE_INSTALLMENT', 'EACH_INSTALLMENT');--> statement-breakpoint
CREATE TYPE "public"."loan_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."loan_disbursement_status" AS ENUM('LIQUIDATED', 'SENT_TO_ACCOUNTING', 'SENT_TO_BANK', 'DISBURSED');--> statement-breakpoint
CREATE TYPE "public"."loan_payment_status" AS ENUM('PAID', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('ACTIVE', 'GENERATED', 'INACTIVE', 'ACCOUNTED', 'VOID', 'RELIQUIDATED', 'FINISHED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."allocation_order_within" AS ENUM('DUE_DATE_ASC', 'INSTALLMENT_ASC');--> statement-breakpoint
CREATE TYPE "public"."overpayment_handling" AS ENUM('EXCESS_BALANCE', 'APPLY_TO_PRINCIPAL', 'APPLY_TO_FUTURE_INSTALLMENTS');--> statement-breakpoint
CREATE TYPE "public"."payment_receipt_movement_type" AS ENUM('RECEIPT', 'PLEDGE', 'PAYROLL', 'DEPOSIT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."payment_tender_type" AS ENUM('TRANSFER', 'CHECK', 'CASH');--> statement-breakpoint
CREATE TYPE "public"."payroll_excess_status" AS ENUM('PENDING', 'APPLIED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('NATURAL', 'LEGAL');--> statement-breakpoint
CREATE TYPE "public"."portfolio_entry_status" AS ENUM('OPEN', 'CLOSED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."process_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."process_type" AS ENUM('CREDIT', 'RECEIPT', 'PLEDGE', 'PAYROLL', 'INTEREST', 'DEPOSIT', 'OTHER', 'INSURANCE', 'LATE_INTEREST');--> statement-breakpoint
CREATE TYPE "public"."risk_decision" AS ENUM('PASS', 'FAIL');--> statement-breakpoint
CREATE TYPE "public"."risk_evaluation_mode" AS ENUM('NONE', 'VALIDATE_ONLY', 'REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."risk_status" AS ENUM('NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED', 'MANUAL_REVIEW', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('M', 'F');--> statement-breakpoint
CREATE TYPE "public"."taxpayer_type" AS ENUM('STATE_COMPANY', 'COMMON_REGIME', 'SIMPLIFIED_REGIME', 'NO_SALES_REGIME', 'LARGE_TAXPAYER', 'NATURAL_PERSON', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."third_party_setting" AS ENUM('YES', 'NO', 'WITHHOLDING');--> statement-breakpoint
CREATE TYPE "public"."weekend_policy" AS ENUM('KEEP', 'PREVIOUS_BUSINESS_DAY', 'NEXT_BUSINESS_DAY');--> statement-breakpoint
CREATE TABLE "accounting_distribution_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"accounting_distribution_id" integer NOT NULL,
	"gl_account_id" integer NOT NULL,
	"cost_center_id" integer NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"nature" "entry_nature" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_type" "process_type" NOT NULL,
	"document_code" varchar(7) NOT NULL,
	"sequence" integer NOT NULL,
	"entry_date" date NOT NULL,
	"gl_account_id" integer NOT NULL,
	"cost_center_id" integer,
	"third_party_id" integer,
	"description" varchar(255) NOT NULL,
	"nature" "entry_nature" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"loan_id" integer,
	"installment_number" integer,
	"due_date" date,
	"status" "accounting_entries_status" DEFAULT 'DRAFT' NOT NULL,
	"status_date" date,
	"source_type" "accounting_entry_source_type" NOT NULL,
	"source_id" varchar(64) NOT NULL,
	"reversal_of_entry_id" integer,
	"process_run_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closed_at" timestamp,
	"closed_by_user_id" uuid,
	"closed_by_user_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliation_offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"city_id" integer NOT NULL,
	"address" varchar(255) NOT NULL,
	"phone" varchar(20),
	"representative_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"cost_center_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aging_buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"aging_profile_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"name" varchar(60) NOT NULL,
	"days_from" integer DEFAULT 0 NOT NULL,
	"days_to" integer,
	"provision_rate" numeric(12, 6),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_aging_bucket_days_from_min" CHECK ("aging_buckets"."days_from" >= 0),
	CONSTRAINT "chk_aging_bucket_days_order" CHECK ("aging_buckets"."days_to" IS NULL OR "aging_buckets"."days_from" <= "aging_buckets"."days_to")
);
--> statement-breakpoint
CREATE TABLE "aging_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agreements" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_code" varchar(20) NOT NULL,
	"document_number" varchar(17) NOT NULL,
	"business_name" varchar(80) NOT NULL,
	"city_id" integer NOT NULL,
	"address" varchar(120),
	"phone" varchar(20),
	"legal_representative" varchar(80),
	"start_date" date NOT NULL,
	"end_date" date,
	"note" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"status_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_agreements_dates_order" CHECK ("agreements"."end_date" IS NULL OR "agreements"."start_date" <= "agreements"."end_date")
);
--> statement-breakpoint
CREATE TABLE "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"asobancaria_code" varchar(5) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_concept_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"billing_concept_id" integer NOT NULL,
	"calc_method" "billing_concept_calc_method" NOT NULL,
	"base_amount" "billing_concept_base_amount",
	"rate" numeric(12, 6),
	"amount" numeric(14, 2),
	"range_metric" "billing_concept_range_metric",
	"value_from" numeric(14, 2),
	"value_to" numeric(14, 2),
	"min_amount" numeric(14, 2),
	"max_amount" numeric(14, 2),
	"rounding_mode" "billing_concept_rounding_mode" DEFAULT 'NEAREST' NOT NULL,
	"rounding_decimals" integer DEFAULT 2 NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_billing_concept_rules_tier_requires_metric" CHECK ("billing_concept_rules"."calc_method" <> 'TIERED' OR "billing_concept_rules"."range_metric" IS NOT NULL),
	CONSTRAINT "chk_billing_concept_rules_range_order" CHECK ("billing_concept_rules"."value_from" IS NULL OR "billing_concept_rules"."value_to" IS NULL OR "billing_concept_rules"."value_from" <= "billing_concept_rules"."value_to"),
	CONSTRAINT "chk_billing_rules_percentage_required" CHECK ("billing_concept_rules"."calc_method" <> 'PERCENTAGE' OR ("billing_concept_rules"."base_amount" IS NOT NULL AND "billing_concept_rules"."rate" IS NOT NULL)),
	CONSTRAINT "chk_billing_rules_percentage_no_amount" CHECK ("billing_concept_rules"."calc_method" <> 'PERCENTAGE' OR "billing_concept_rules"."amount" IS NULL),
	CONSTRAINT "chk_billing_rules_fixed_amount_required" CHECK ("billing_concept_rules"."calc_method" <> 'FIXED_AMOUNT' OR "billing_concept_rules"."amount" IS NOT NULL),
	CONSTRAINT "chk_billing_rules_fixed_amount_no_rate" CHECK ("billing_concept_rules"."calc_method" <> 'FIXED_AMOUNT' OR ("billing_concept_rules"."base_amount" IS NULL AND "billing_concept_rules"."rate" IS NULL)),
	CONSTRAINT "chk_billing_rules_tier_requires_value_source" CHECK ("billing_concept_rules"."calc_method" <> 'TIERED' OR ("billing_concept_rules"."amount" IS NOT NULL OR ("billing_concept_rules"."base_amount" IS NOT NULL AND "billing_concept_rules"."rate" IS NOT NULL))),
	CONSTRAINT "chk_billing_rules_effective_order" CHECK ("billing_concept_rules"."effective_from" IS NULL OR "billing_concept_rules"."effective_to" IS NULL OR "billing_concept_rules"."effective_from" <= "billing_concept_rules"."effective_to")
);
--> statement-breakpoint
CREATE TABLE "billing_concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"concept_type" "billing_concept_type" NOT NULL,
	"default_frequency" "billing_concept_frequency" NOT NULL,
	"default_financing_mode" "billing_concept_financing_mode" NOT NULL,
	"default_gl_account_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_cycle_profile_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"billing_cycle_profile_id" integer NOT NULL,
	"cycle_in_month" integer NOT NULL,
	"cutoff_day" integer NOT NULL,
	"run_day" integer NOT NULL,
	"expected_pay_day" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_billing_cycle_profile_cycles_cycle_in_month_min" CHECK ("billing_cycle_profile_cycles"."cycle_in_month" >= 1),
	CONSTRAINT "chk_billing_cycle_profile_cycles_cutoff_day" CHECK ("billing_cycle_profile_cycles"."cutoff_day" BETWEEN 1 AND 31),
	CONSTRAINT "chk_billing_cycle_profile_cycles_run_day" CHECK ("billing_cycle_profile_cycles"."run_day" BETWEEN 1 AND 31),
	CONSTRAINT "chk_billing_cycle_profile_cycles_expected_pay_day" CHECK ("billing_cycle_profile_cycles"."expected_pay_day" IS NULL OR "billing_cycle_profile_cycles"."expected_pay_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE TABLE "billing_cycle_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"credit_product_id" integer NOT NULL,
	"agreement_id" integer,
	"cycles_per_month" integer DEFAULT 1 NOT NULL,
	"weekend_policy" "weekend_policy" DEFAULT 'NEXT_BUSINESS_DAY' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_billing_cycle_profiles_cycles_per_month_min" CHECK ("billing_cycle_profiles"."cycles_per_month" >= 1)
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "co_debtors" (
	"id" serial PRIMARY KEY NOT NULL,
	"identification_type_id" integer NOT NULL,
	"document_number" varchar(20) NOT NULL,
	"home_address" varchar(80) NOT NULL,
	"home_city_id" integer NOT NULL,
	"home_phone" varchar(20) NOT NULL,
	"company_name" varchar(80) NOT NULL,
	"work_address" varchar(80) NOT NULL,
	"work_city_id" integer NOT NULL,
	"work_phone" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_fund_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_fund_id" integer NOT NULL,
	"accounting_period_id" integer NOT NULL,
	"fund_amount" numeric(20, 2) NOT NULL,
	"reinvestment_amount" numeric(20, 2) NOT NULL,
	"expense_amount" numeric(20, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_funds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(30) NOT NULL,
	"is_controlled" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_product_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"capital_gl_account_id" integer NOT NULL,
	"interest_gl_account_id" integer NOT NULL,
	"late_interest_gl_account_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_product_billing_concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"billing_concept_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"override_frequency" "billing_concept_frequency",
	"override_financing_mode" "billing_concept_financing_mode",
	"override_gl_account_id" integer,
	"override_rule_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"category_code" "category_code" NOT NULL,
	"installments_from" integer NOT NULL,
	"installments_to" integer NOT NULL,
	"financing_factor" numeric(12, 9) NOT NULL,
	"pledge_factor" numeric(12, 9),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_credit_product_category_installments_min" CHECK ("credit_product_categories"."installments_from" >= 1),
	CONSTRAINT "chk_credit_product_category_installments_order" CHECK ("credit_product_categories"."installments_from" <= "credit_product_categories"."installments_to")
);
--> statement-breakpoint
CREATE TABLE "credit_product_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"document_type_id" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_product_late_interest_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"category_code" "category_code" NOT NULL,
	"days_from" integer NOT NULL,
	"days_to" integer,
	"late_factor" numeric(12, 9) NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_late_rules_days_from_min" CHECK ("credit_product_late_interest_rules"."days_from" >= 0),
	CONSTRAINT "chk_late_rules_days_order" CHECK ("credit_product_late_interest_rules"."days_to" IS NULL OR "credit_product_late_interest_rules"."days_from" <= "credit_product_late_interest_rules"."days_to")
);
--> statement-breakpoint
CREATE TABLE "credit_product_refinance_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"allow_refinance" boolean DEFAULT false NOT NULL,
	"allow_consolidation" boolean DEFAULT false NOT NULL,
	"max_loans_to_consolidate" integer DEFAULT 1 NOT NULL,
	"min_loan_age_days" integer DEFAULT 0 NOT NULL,
	"max_days_past_due" integer DEFAULT 99999 NOT NULL,
	"min_paid_installments" integer DEFAULT 0 NOT NULL,
	"max_refinance_count" integer DEFAULT 99 NOT NULL,
	"capitalize_arrears" boolean DEFAULT false NOT NULL,
	"require_approval" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_refi_policy_max_loans_min" CHECK ("credit_product_refinance_policies"."max_loans_to_consolidate" >= 1),
	CONSTRAINT "chk_refi_policy_min_age_min" CHECK ("credit_product_refinance_policies"."min_loan_age_days" >= 0),
	CONSTRAINT "chk_refi_policy_max_dpd_min" CHECK ("credit_product_refinance_policies"."max_days_past_due" >= 0),
	CONSTRAINT "chk_refi_policy_min_paid_min" CHECK ("credit_product_refinance_policies"."min_paid_installments" >= 0),
	CONSTRAINT "chk_refi_policy_max_refi_min" CHECK ("credit_product_refinance_policies"."max_refinance_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credit_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"credit_fund_id" integer NOT NULL,
	"payment_allocation_policy_id" integer NOT NULL,
	"xml_model_id" integer,
	"financing_type" "financing_type" NOT NULL,
	"pays_insurance" boolean DEFAULT false NOT NULL,
	"insurance_range_metric" "insurance_rate_range_metric" DEFAULT 'CREDIT_AMOUNT' NOT NULL,
	"capital_distribution_id" integer NOT NULL,
	"interest_distribution_id" integer NOT NULL,
	"late_interest_distribution_id" integer NOT NULL,
	"reports_to_credit_bureau" boolean DEFAULT false NOT NULL,
	"max_installments" integer,
	"cost_center_id" integer,
	"risk_evaluation_mode" "risk_evaluation_mode" DEFAULT 'NONE' NOT NULL,
	"risk_min_score" numeric(12, 5),
	"age_basis" "late_interest_age_basis" DEFAULT 'OLDEST_OVERDUE_INSTALLMENT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"app_slug" varchar(255) NOT NULL,
	"audit_transactions_enabled" boolean DEFAULT false NOT NULL,
	"accounting_system_code" varchar(2) NOT NULL,
	"post_accounting_online" boolean DEFAULT false NOT NULL,
	"subsidy_enabled" boolean DEFAULT false NOT NULL,
	"accounting_enabled" boolean DEFAULT true NOT NULL,
	"cash_gl_account_id" integer,
	"major_gl_account_id" integer,
	"excess_gl_account_id" integer,
	"pledge_subsidy_gl_account_id" integer,
	"write_off_gl_account_id" integer,
	"default_cost_center_id" integer,
	"credit_manager_name" varchar(50),
	"credit_manager_title" varchar(80),
	"admin_manager_name" varchar(50),
	"admin_manager_title" varchar(80),
	"legal_advisor_name" varchar(50),
	"legal_advisor_title" varchar(80),
	"admin_director_name" varchar(50),
	"admin_director_title" varchar(80),
	"finance_manager_name" varchar(50),
	"finance_manager_title" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credits_settings_app_slug_unique" UNIQUE("app_slug")
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gl_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(13) NOT NULL,
	"name" varchar(255) NOT NULL,
	"third_party_setting" "third_party_setting" DEFAULT 'NO' NOT NULL,
	"requires_cost_center" boolean DEFAULT false NOT NULL,
	"detail_type" "account_detail_type" DEFAULT 'NONE' NOT NULL,
	"is_bank" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identification_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"identification_type_id" integer NOT NULL,
	"document_number" varchar(20) NOT NULL,
	"verification_digit" varchar(1),
	"business_name" varchar(255) NOT NULL,
	"city_id" integer NOT NULL,
	"address" varchar(255) NOT NULL,
	"phone" varchar(20),
	"mobile_number" varchar(20),
	"email" varchar(60),
	"factor" numeric(12, 4) NOT NULL,
	"minimum_value" numeric(12, 2),
	"total_charge_distribution_id" integer,
	"monthly_distribution_id" integer NOT NULL,
	"note" varchar(70),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_rate_ranges" (
	"id" serial PRIMARY KEY NOT NULL,
	"insurance_company_id" integer NOT NULL,
	"range_metric" "insurance_rate_range_metric" NOT NULL,
	"value_from" integer NOT NULL,
	"value_to" integer NOT NULL,
	"rate_value" numeric(12, 5) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_insurance_rate_range_order" CHECK ("insurance_rate_ranges"."value_from" <= "insurance_rate_ranges"."value_to")
);
--> statement-breakpoint
CREATE TABLE "investment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_agreement_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"agreement_id" integer NOT NULL,
	"effective_date" date NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" uuid,
	"changed_by_user_name" varchar(255),
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_act_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliation_office_id" integer NOT NULL,
	"act_date" date NOT NULL,
	"act_number" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_co_debtors" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"co_debtor_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"document_type_id" integer NOT NULL,
	"is_delivered" boolean DEFAULT false NOT NULL,
	"file_key" varchar(512),
	"uploaded_by_user_id" uuid,
	"uploaded_by_user_name" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"event_key" varchar(60) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"correlation_id" varchar(100),
	"http_method" varchar(10),
	"endpoint" varchar(200),
	"http_status" integer,
	"duration_ms" integer,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"metadata" jsonb,
	"event_status" varchar(15) DEFAULT 'OK' NOT NULL,
	"message" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_pledges" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"pledge_code" varchar(20) NOT NULL,
	"document_number" varchar(20),
	"beneficiary_code" integer NOT NULL,
	"pledged_amount" numeric(14, 2) NOT NULL,
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"executed_by_user_id" varchar(255) NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" "risk_decision",
	"score" numeric(12, 5),
	"request_payload" jsonb,
	"response_payload" jsonb,
	"error_message" varchar(255),
	"note" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_application_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"from_status" "loan_application_status",
	"to_status" "loan_application_status" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" uuid,
	"changed_by_user_name" varchar(255),
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_number" varchar(20) NOT NULL,
	"credit_fund_id" integer NOT NULL,
	"channel_id" integer NOT NULL,
	"application_date" date NOT NULL,
	"affiliation_office_id" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_user_name" varchar(255) NOT NULL,
	"third_party_id" integer NOT NULL,
	"is_category_manual" boolean DEFAULT false NOT NULL,
	"category_code" "category_code" NOT NULL,
	"repayment_method_id" integer,
	"payment_guarantee_type_id" integer,
	"pledges_subsidy" boolean DEFAULT false NOT NULL,
	"salary" numeric(14, 2) NOT NULL,
	"other_income" numeric(14, 2) NOT NULL,
	"other_credits" numeric(14, 2) NOT NULL,
	"payment_capacity" numeric(14, 2) NOT NULL,
	"bank_account_number" varchar(25) NOT NULL,
	"bank_account_type" "bank_account_type" NOT NULL,
	"bank_id" integer NOT NULL,
	"credit_product_id" integer NOT NULL,
	"payment_frequency_id" integer,
	"financing_factor" numeric(12, 9) NOT NULL,
	"installments" integer NOT NULL,
	"insurance_company_id" integer,
	"insurance_factor" numeric(12, 5) DEFAULT '0' NOT NULL,
	"requested_amount" numeric(14, 2) NOT NULL,
	"approved_amount" numeric(14, 2),
	"investment_type_id" integer,
	"status" "loan_application_status" DEFAULT 'PENDING' NOT NULL,
	"status_changed_by_user_id" uuid,
	"status_date" date,
	"act_number" varchar(20),
	"rejection_reason_id" integer,
	"note" text,
	"status_note" text,
	"is_insurance_approved" boolean DEFAULT false NOT NULL,
	"credit_study_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"risk_status" "risk_status" DEFAULT 'NOT_REQUIRED' NOT NULL,
	"risk_score" numeric(12, 5),
	"risk_checked_at" timestamp with time zone,
	"risk_note" varchar(255),
	CONSTRAINT "loan_applications_credit_number_unique" UNIQUE("credit_number")
);
--> statement-breakpoint
CREATE TABLE "loan_billing_concepts" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"billing_concept_id" integer NOT NULL,
	"source_credit_product_concept_id" integer,
	"source_rule_id" integer,
	"frequency" "billing_concept_frequency" NOT NULL,
	"financing_mode" "billing_concept_financing_mode" NOT NULL,
	"gl_account_id" integer,
	"calc_method" "billing_concept_calc_method" NOT NULL,
	"base_amount" "billing_concept_base_amount",
	"rate" numeric(12, 6),
	"amount" numeric(14, 2),
	"value_from" numeric(14, 2),
	"value_to" numeric(14, 2),
	"min_amount" numeric(14, 2),
	"max_amount" numeric(14, 2),
	"rounding_mode" "billing_concept_rounding_mode" DEFAULT 'NEAREST' NOT NULL,
	"rounding_decimals" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_installments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"schedule_version" integer DEFAULT 1 NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"principal_amount" numeric(14, 2) NOT NULL,
	"interest_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"insurance_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "installment_record_status" DEFAULT 'GENERATED' NOT NULL,
	"remaining_principal" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_installment_amounts_non_negative" CHECK (
      "loan_installments"."principal_amount" >= 0 AND
      "loan_installments"."interest_amount" >= 0 AND
      "loan_installments"."insurance_amount" >= 0 AND
      "loan_installments"."remaining_principal" >= 0
    )
);
--> statement-breakpoint
CREATE TABLE "loan_payment_method_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_payment_id" integer NOT NULL,
	"collection_method_id" integer NOT NULL,
	"line_number" integer NOT NULL,
	"tender_reference" varchar(50),
	"amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"receipt_type_id" integer NOT NULL,
	"payment_number" varchar(50) NOT NULL,
	"movement_type" "payment_receipt_movement_type",
	"payment_date" date NOT NULL,
	"issued_date" date,
	"loan_id" integer NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" "loan_payment_status" DEFAULT 'PAID' NOT NULL,
	"status_date" date,
	"accounting_voucher_type_code" varchar(4),
	"accounting_document_code" varchar(7),
	"payroll_reference_number" varchar(7),
	"payroll_payer_document_number" varchar(15),
	"created_by_user_id" uuid NOT NULL,
	"created_by_user_name" varchar(255) NOT NULL,
	"note" text,
	"note_status" text,
	"updated_by_user_id" uuid,
	"updated_by_user_name" varchar(255),
	"over_paid_amount" integer,
	"gl_account_id" integer,
	"subsi_code" varchar(2),
	"subsi_document" varchar(8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_process_states" (
	"loan_id" integer NOT NULL,
	"process_type" "process_type" NOT NULL,
	"last_processed_date" date NOT NULL,
	"last_process_run_id" integer NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_process_states_loan_id_process_type_pk" PRIMARY KEY("loan_id","process_type")
);
--> statement-breakpoint
CREATE TABLE "loan_refinancing_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"reference_loan_id" integer NOT NULL,
	"payoff_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_by_user_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loan_ref_link_not_self" CHECK ("loan_refinancing_links"."loan_id" <> "loan_refinancing_links"."reference_loan_id")
);
--> statement-breakpoint
CREATE TABLE "loan_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"from_status" "loan_status",
	"to_status" "loan_status" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" uuid,
	"changed_by_user_name" varchar(255),
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_number" varchar(20) NOT NULL,
	"credit_fund_id" integer,
	"created_by_user_id" uuid NOT NULL,
	"created_by_user_name" varchar(255) NOT NULL,
	"record_date" date NOT NULL,
	"loan_application_id" integer NOT NULL,
	"agreement_id" integer,
	"third_party_id" integer NOT NULL,
	"payee_third_party_id" integer NOT NULL,
	"installments" integer NOT NULL,
	"credit_start_date" date NOT NULL,
	"maturity_date" date NOT NULL,
	"first_collection_date" date,
	"principal_amount" numeric(14, 2) NOT NULL,
	"initial_total_amount" numeric(14, 2) NOT NULL,
	"insurance_company_id" integer,
	"insurance_value" numeric(14, 2),
	"discount_study_credit" boolean DEFAULT false NOT NULL,
	"cost_center_id" integer,
	"repayment_method_id" integer NOT NULL,
	"payment_guarantee_type_id" integer NOT NULL,
	"guarantee_document" varchar(50),
	"status" "loan_status" DEFAULT 'ACTIVE' NOT NULL,
	"status_date" date NOT NULL,
	"affiliation_office_id" integer NOT NULL,
	"status_changed_by_user_id" uuid,
	"status_changed_by_user_name" varchar(255),
	"note" varchar(255),
	"payment_frequency_id" integer,
	"is_reported_to_cifin" boolean DEFAULT false NOT NULL,
	"cifin_report_date" date,
	"has_legal_process" boolean DEFAULT false NOT NULL,
	"legal_process_date" date,
	"has_payment_agreement" boolean DEFAULT false NOT NULL,
	"payment_agreement_date" date,
	"disbursement_status" "loan_disbursement_status" DEFAULT 'LIQUIDATED' NOT NULL,
	"last_payment_date" date,
	"is_written_off" boolean DEFAULT false NOT NULL,
	"written_off_date" date,
	"is_interest_written_off" boolean DEFAULT false NOT NULL,
	"interest_write_off_document" varchar(30),
	"withheld_balance_value" integer DEFAULT 0 NOT NULL,
	"channel_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_credit_number_unique" UNIQUE("credit_number")
);
--> statement-breakpoint
CREATE TABLE "payment_allocation_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"overpayment_handling" "overpayment_handling" DEFAULT 'EXCESS_BALANCE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocation_policy_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_allocation_policy_id" integer NOT NULL,
	"priority" integer NOT NULL,
	"billing_concept_id" integer NOT NULL,
	"scope" "allocation_scope" DEFAULT 'PAST_DUE_FIRST' NOT NULL,
	"order_within" "allocation_order_within" DEFAULT 'DUE_DATE_ASC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payment_alloc_rule_priority_min" CHECK ("payment_allocation_policy_rules"."priority" >= 1)
);
--> statement-breakpoint
CREATE TABLE "payment_frequencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"days_interval" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_guarantee_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_receipt_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"movement_type" "payment_receipt_movement_type" NOT NULL,
	"gl_account_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_tender_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "payment_tender_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_excess_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_type" "process_type" NOT NULL,
	"loan_id" integer NOT NULL,
	"payer_tax_id" varchar(15),
	"date" date NOT NULL,
	"description" varchar(150) NOT NULL,
	"excess_amount" numeric(14, 2) NOT NULL,
	"status" "payroll_excess_status" DEFAULT 'PENDING' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_aging_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"accounting_period_id" integer NOT NULL,
	"aging_profile_id" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"affiliation_office_id" integer NOT NULL,
	"credit_product_id" integer NOT NULL,
	"gl_account_id" integer NOT NULL,
	"loan_id" integer NOT NULL,
	"third_party_id" integer NOT NULL,
	"category_code" "category_code",
	"principal_amount" numeric(14, 2) NOT NULL,
	"installment_value" numeric(14, 2) NOT NULL,
	"repayment_method_id" integer NOT NULL,
	"days_past_due" integer DEFAULT 0 NOT NULL,
	"current_amount" numeric(14, 2) NOT NULL,
	"total_past_due" numeric(14, 2) NOT NULL,
	"total_portfolio" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"gl_account_id" integer NOT NULL,
	"third_party_id" integer NOT NULL,
	"loan_id" integer NOT NULL,
	"installment_number" integer DEFAULT 0 NOT NULL,
	"due_date" date NOT NULL,
	"charge_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"last_movement_date" date,
	"status" "portfolio_entry_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_portfolio_entry_charge_nonneg" CHECK ("portfolio_entries"."charge_amount" >= 0),
	CONSTRAINT "chk_portfolio_entry_payment_nonneg" CHECK ("portfolio_entries"."payment_amount" >= 0),
	CONSTRAINT "chk_portfolio_entry_balance_formula" CHECK ("portfolio_entries"."balance" = "portfolio_entries"."charge_amount" - "portfolio_entries"."payment_amount"),
	CONSTRAINT "chk_portfolio_entry_balance_nonneg" CHECK ("portfolio_entries"."balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "portfolio_provision_snapshot_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"provision_snapshot_id" integer NOT NULL,
	"aging_snapshot_id" integer NOT NULL,
	"aging_bucket_id" integer NOT NULL,
	"base_amount" numeric(14, 2) NOT NULL,
	"provision_rate" numeric(12, 6),
	"provision_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_provision_detail_base_nonneg" CHECK ("portfolio_provision_snapshot_details"."base_amount" >= 0),
	CONSTRAINT "chk_provision_detail_amount_nonneg" CHECK ("portfolio_provision_snapshot_details"."provision_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "portfolio_provision_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"accounting_period_id" integer NOT NULL,
	"aging_profile_id" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"total_base_amount" numeric(14, 2) NOT NULL,
	"total_required_provision" numeric(14, 2) NOT NULL,
	"previous_provision_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"delta_to_post" numeric(14, 2) NOT NULL,
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_type" "process_type" NOT NULL,
	"accounting_period_id" integer NOT NULL,
	"process_date" date NOT NULL,
	"executed_by_user_id" uuid NOT NULL,
	"executed_by_user_name" varchar(255) NOT NULL,
	"executed_at" timestamp NOT NULL,
	"status" "process_status" DEFAULT 'COMPLETED' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rejection_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repayment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"identification_type_id" integer NOT NULL,
	"document_number" varchar(17) NOT NULL,
	"verification_digit" varchar(1),
	"person_type" "person_type" NOT NULL,
	"representative_id_number" varchar(15),
	"first_last_name" varchar(20),
	"second_last_name" varchar(15),
	"first_name" varchar(20),
	"second_name" varchar(15),
	"business_name" varchar(60),
	"sex" "sex",
	"category_code" "category_code" NOT NULL,
	"address" varchar(80),
	"city_id" integer NOT NULL,
	"phone" varchar(20) NOT NULL,
	"mobile_phone" varchar(20),
	"email" varchar(60),
	"third_party_type_id" integer NOT NULL,
	"taxpayer_type" "taxpayer_type" NOT NULL,
	"has_rut" boolean DEFAULT false NOT NULL,
	"employer_document_number" varchar(17),
	"employer_business_name" varchar(200),
	"note" varchar(220),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_third_party_names_by_type" CHECK (
      (
        "third_parties"."person_type" = 'NATURAL'
        AND "third_parties"."first_name" IS NOT NULL
        AND "third_parties"."first_last_name" IS NOT NULL
      )
      OR
      (
        "third_parties"."person_type" = 'LEGAL'
        AND "third_parties"."business_name" IS NOT NULL
      )
    ),
	CONSTRAINT "chk_third_party_rep_for_legal" CHECK (
      (
        "third_parties"."person_type" = 'NATURAL'
      )
      OR
      (
        "third_parties"."person_type" = 'LEGAL'
        AND "third_parties"."representative_id_number" IS NOT NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "third_party_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_affiliation_offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"affiliation_office_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment_receipt_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_receipt_type_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounting_distribution_lines" ADD CONSTRAINT "accounting_distribution_lines_accounting_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("accounting_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_distribution_lines" ADD CONSTRAINT "accounting_distribution_lines_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_distribution_lines" ADD CONSTRAINT "accounting_distribution_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "accounting_entries_process_run_id_process_runs_id_fk" FOREIGN KEY ("process_run_id") REFERENCES "public"."process_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounting_entries" ADD CONSTRAINT "fk_accounting_entries_reversal_of_entry" FOREIGN KEY ("reversal_of_entry_id") REFERENCES "public"."accounting_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation_offices" ADD CONSTRAINT "affiliation_offices_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation_offices" ADD CONSTRAINT "affiliation_offices_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aging_buckets" ADD CONSTRAINT "aging_buckets_aging_profile_id_aging_profiles_id_fk" FOREIGN KEY ("aging_profile_id") REFERENCES "public"."aging_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_billing_concept_rule_id_concept" ON "billing_concept_rules" USING btree ("id","billing_concept_id");--> statement-breakpoint
ALTER TABLE "billing_concept_rules" ADD CONSTRAINT "billing_concept_rules_billing_concept_id_billing_concepts_id_fk" FOREIGN KEY ("billing_concept_id") REFERENCES "public"."billing_concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_concepts" ADD CONSTRAINT "billing_concepts_default_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("default_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_cycle_profile_cycles" ADD CONSTRAINT "billing_cycle_profile_cycles_billing_cycle_profile_id_billing_cycle_profiles_id_fk" FOREIGN KEY ("billing_cycle_profile_id") REFERENCES "public"."billing_cycle_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_cycle_profiles" ADD CONSTRAINT "billing_cycle_profiles_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_cycle_profiles" ADD CONSTRAINT "billing_cycle_profiles_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_home_city_id_cities_id_fk" FOREIGN KEY ("home_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_work_city_id_cities_id_fk" FOREIGN KEY ("work_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_fund_budgets" ADD CONSTRAINT "credit_fund_budgets_credit_fund_id_credit_funds_id_fk" FOREIGN KEY ("credit_fund_id") REFERENCES "public"."credit_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_fund_budgets" ADD CONSTRAINT "credit_fund_budgets_accounting_period_id_accounting_periods_id_fk" FOREIGN KEY ("accounting_period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_accounts" ADD CONSTRAINT "credit_product_accounts_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_accounts" ADD CONSTRAINT "credit_product_accounts_capital_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("capital_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_accounts" ADD CONSTRAINT "credit_product_accounts_interest_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("interest_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_accounts" ADD CONSTRAINT "credit_product_accounts_late_interest_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("late_interest_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ADD CONSTRAINT "credit_product_billing_concepts_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ADD CONSTRAINT "credit_product_billing_concepts_billing_concept_id_billing_concepts_id_fk" FOREIGN KEY ("billing_concept_id") REFERENCES "public"."billing_concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ADD CONSTRAINT "credit_product_billing_concepts_override_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("override_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_billing_concepts" ADD CONSTRAINT "fk_credit_product_billing_concepts_override_rule_concept" FOREIGN KEY ("override_rule_id","billing_concept_id") REFERENCES "public"."billing_concept_rules"("id","billing_concept_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_categories" ADD CONSTRAINT "credit_product_categories_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_documents" ADD CONSTRAINT "credit_product_documents_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_documents" ADD CONSTRAINT "credit_product_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" ADD CONSTRAINT "credit_product_late_interest_rules_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_refinance_policies" ADD CONSTRAINT "credit_product_refinance_policies_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_credit_fund_id_credit_funds_id_fk" FOREIGN KEY ("credit_fund_id") REFERENCES "public"."credit_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_payment_allocation_policy_id_payment_allocation_policies_id_fk" FOREIGN KEY ("payment_allocation_policy_id") REFERENCES "public"."payment_allocation_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_capital_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("capital_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_interest_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("interest_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_late_interest_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("late_interest_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_products" ADD CONSTRAINT "credit_products_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_cash_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("cash_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_major_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("major_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_excess_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("excess_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_pledge_subsidy_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("pledge_subsidy_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_write_off_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("write_off_gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings" ADD CONSTRAINT "credits_settings_default_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("default_cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_total_charge_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("total_charge_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_monthly_distribution_id_accounting_distributions_id_fk" FOREIGN KEY ("monthly_distribution_id") REFERENCES "public"."accounting_distributions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_rate_ranges" ADD CONSTRAINT "insurance_rate_ranges_insurance_company_id_insurance_companies_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_act_numbers" ADD CONSTRAINT "loan_application_act_numbers_affiliation_office_id_affiliation_offices_id_fk" FOREIGN KEY ("affiliation_office_id") REFERENCES "public"."affiliation_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_co_debtors" ADD CONSTRAINT "loan_application_co_debtors_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_co_debtors" ADD CONSTRAINT "loan_application_co_debtors_co_debtor_id_co_debtors_id_fk" FOREIGN KEY ("co_debtor_id") REFERENCES "public"."co_debtors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_documents" ADD CONSTRAINT "loan_application_documents_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_documents" ADD CONSTRAINT "loan_application_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_events" ADD CONSTRAINT "loan_application_events_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_pledges" ADD CONSTRAINT "loan_application_pledges_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_risk_assessments" ADD CONSTRAINT "loan_application_risk_assessments_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_status_history" ADD CONSTRAINT "loan_application_status_history_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_credit_fund_id_credit_funds_id_fk" FOREIGN KEY ("credit_fund_id") REFERENCES "public"."credit_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_affiliation_office_id_affiliation_offices_id_fk" FOREIGN KEY ("affiliation_office_id") REFERENCES "public"."affiliation_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_repayment_method_id_repayment_methods_id_fk" FOREIGN KEY ("repayment_method_id") REFERENCES "public"."repayment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_payment_guarantee_type_id_payment_guarantee_types_id_fk" FOREIGN KEY ("payment_guarantee_type_id") REFERENCES "public"."payment_guarantee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_payment_frequency_id_payment_frequencies_id_fk" FOREIGN KEY ("payment_frequency_id") REFERENCES "public"."payment_frequencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_insurance_company_id_insurance_companies_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_investment_type_id_investment_types_id_fk" FOREIGN KEY ("investment_type_id") REFERENCES "public"."investment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_rejection_reason_id_rejection_reasons_id_fk" FOREIGN KEY ("rejection_reason_id") REFERENCES "public"."rejection_reasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD CONSTRAINT "loan_billing_concepts_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD CONSTRAINT "loan_billing_concepts_billing_concept_id_billing_concepts_id_fk" FOREIGN KEY ("billing_concept_id") REFERENCES "public"."billing_concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD CONSTRAINT "loan_billing_concepts_source_credit_product_concept_id_credit_product_billing_concepts_id_fk" FOREIGN KEY ("source_credit_product_concept_id") REFERENCES "public"."credit_product_billing_concepts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD CONSTRAINT "loan_billing_concepts_source_rule_id_billing_concept_rules_id_fk" FOREIGN KEY ("source_rule_id") REFERENCES "public"."billing_concept_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_billing_concepts" ADD CONSTRAINT "loan_billing_concepts_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payment_method_allocations" ADD CONSTRAINT "loan_payment_method_allocations_loan_payment_id_loan_payments_id_fk" FOREIGN KEY ("loan_payment_id") REFERENCES "public"."loan_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payment_method_allocations" ADD CONSTRAINT "loan_payment_method_allocations_collection_method_id_payment_tender_types_id_fk" FOREIGN KEY ("collection_method_id") REFERENCES "public"."payment_tender_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_receipt_type_id_payment_receipt_types_id_fk" FOREIGN KEY ("receipt_type_id") REFERENCES "public"."payment_receipt_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_process_states" ADD CONSTRAINT "loan_process_states_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_process_states" ADD CONSTRAINT "loan_process_states_last_process_run_id_process_runs_id_fk" FOREIGN KEY ("last_process_run_id") REFERENCES "public"."process_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ADD CONSTRAINT "loan_refinancing_links_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ADD CONSTRAINT "loan_refinancing_links_reference_loan_id_loans_id_fk" FOREIGN KEY ("reference_loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_status_history" ADD CONSTRAINT "loan_status_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_credit_fund_id_credit_funds_id_fk" FOREIGN KEY ("credit_fund_id") REFERENCES "public"."credit_funds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_payee_third_party_id_third_parties_id_fk" FOREIGN KEY ("payee_third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_insurance_company_id_insurance_companies_id_fk" FOREIGN KEY ("insurance_company_id") REFERENCES "public"."insurance_companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_repayment_method_id_repayment_methods_id_fk" FOREIGN KEY ("repayment_method_id") REFERENCES "public"."repayment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_payment_guarantee_type_id_payment_guarantee_types_id_fk" FOREIGN KEY ("payment_guarantee_type_id") REFERENCES "public"."payment_guarantee_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_affiliation_office_id_affiliation_offices_id_fk" FOREIGN KEY ("affiliation_office_id") REFERENCES "public"."affiliation_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_payment_frequency_id_payment_frequencies_id_fk" FOREIGN KEY ("payment_frequency_id") REFERENCES "public"."payment_frequencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ADD CONSTRAINT "payment_allocation_policy_rules_payment_allocation_policy_id_payment_allocation_policies_id_fk" FOREIGN KEY ("payment_allocation_policy_id") REFERENCES "public"."payment_allocation_policies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocation_policy_rules" ADD CONSTRAINT "payment_allocation_policy_rules_billing_concept_id_billing_concepts_id_fk" FOREIGN KEY ("billing_concept_id") REFERENCES "public"."billing_concepts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipt_types" ADD CONSTRAINT "payment_receipt_types_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_excess_payments" ADD CONSTRAINT "payroll_excess_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_accounting_period_id_accounting_periods_id_fk" FOREIGN KEY ("accounting_period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_aging_profile_id_aging_profiles_id_fk" FOREIGN KEY ("aging_profile_id") REFERENCES "public"."aging_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_affiliation_office_id_affiliation_offices_id_fk" FOREIGN KEY ("affiliation_office_id") REFERENCES "public"."affiliation_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_aging_snapshots" ADD CONSTRAINT "portfolio_aging_snapshots_repayment_method_id_repayment_methods_id_fk" FOREIGN KEY ("repayment_method_id") REFERENCES "public"."repayment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "portfolio_entries_gl_account_id_gl_accounts_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."gl_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "portfolio_entries_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_entries" ADD CONSTRAINT "portfolio_entries_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshot_details" ADD CONSTRAINT "portfolio_provision_snapshot_details_provision_snapshot_id_portfolio_provision_snapshots_id_fk" FOREIGN KEY ("provision_snapshot_id") REFERENCES "public"."portfolio_provision_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshot_details" ADD CONSTRAINT "portfolio_provision_snapshot_details_aging_snapshot_id_portfolio_aging_snapshots_id_fk" FOREIGN KEY ("aging_snapshot_id") REFERENCES "public"."portfolio_aging_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshot_details" ADD CONSTRAINT "portfolio_provision_snapshot_details_aging_bucket_id_aging_buckets_id_fk" FOREIGN KEY ("aging_bucket_id") REFERENCES "public"."aging_buckets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshots" ADD CONSTRAINT "portfolio_provision_snapshots_accounting_period_id_accounting_periods_id_fk" FOREIGN KEY ("accounting_period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshots" ADD CONSTRAINT "portfolio_provision_snapshots_aging_profile_id_aging_profiles_id_fk" FOREIGN KEY ("aging_profile_id") REFERENCES "public"."aging_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_runs" ADD CONSTRAINT "process_runs_accounting_period_id_accounting_periods_id_fk" FOREIGN KEY ("accounting_period_id") REFERENCES "public"."accounting_periods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_third_party_type_id_third_party_types_id_fk" FOREIGN KEY ("third_party_type_id") REFERENCES "public"."third_party_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_affiliation_offices" ADD CONSTRAINT "user_affiliation_offices_affiliation_office_id_affiliation_offices_id_fk" FOREIGN KEY ("affiliation_office_id") REFERENCES "public"."affiliation_offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_receipt_types" ADD CONSTRAINT "user_payment_receipt_types_payment_receipt_type_id_payment_receipt_types_id_fk" FOREIGN KEY ("payment_receipt_type_id") REFERENCES "public"."payment_receipt_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_distribution_line" ON "accounting_distribution_lines" USING btree ("accounting_distribution_id","gl_account_id","cost_center_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_accounting_distributions_name" ON "accounting_distributions" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_accounting_entry_legacy_key" ON "accounting_entries" USING btree ("process_type","document_code","sequence");--> statement-breakpoint
CREATE INDEX "idx_entries_process_run" ON "accounting_entries" USING btree ("process_run_id");--> statement-breakpoint
CREATE INDEX "idx_entries_loan_installment_due_status" ON "accounting_entries" USING btree ("loan_id","installment_number","due_date","status");--> statement-breakpoint
CREATE INDEX "idx_entries_gl_third_party_status" ON "accounting_entries" USING btree ("gl_account_id","third_party_id","status");--> statement-breakpoint
CREATE INDEX "idx_accounting_entries_source" ON "accounting_entries" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_accounting_entries_reversal" ON "accounting_entries" USING btree ("reversal_of_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_accounting_period_year_month" ON "accounting_periods" USING btree ("year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_affiliation_offices_code" ON "affiliation_offices" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_affiliation_offices_name" ON "affiliation_offices" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_aging_bucket_profile_order" ON "aging_buckets" USING btree ("aging_profile_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_aging_buckets_profile" ON "aging_buckets" USING btree ("aging_profile_id");--> statement-breakpoint
CREATE INDEX "idx_aging_profiles_active" ON "aging_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_agreements_agreement_code" ON "agreements" USING btree ("agreement_code");--> statement-breakpoint
CREATE INDEX "idx_agreements_nit" ON "agreements" USING btree ("document_number");--> statement-breakpoint
CREATE INDEX "idx_agreements_is_active" ON "agreements" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_banks_asobancaria_code" ON "banks" USING btree ("asobancaria_code");--> statement-breakpoint
CREATE INDEX "idx_billing_concept_rules_concept" ON "billing_concept_rules" USING btree ("billing_concept_id");--> statement-breakpoint
CREATE INDEX "idx_billing_concept_rules_active" ON "billing_concept_rules" USING btree ("billing_concept_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_billing_concepts_code" ON "billing_concepts" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_billing_cycle_profile_cycle" ON "billing_cycle_profile_cycles" USING btree ("billing_cycle_profile_id","cycle_in_month");--> statement-breakpoint
CREATE INDEX "idx_billing_cycle_profile_cycles_profile" ON "billing_cycle_profile_cycles" USING btree ("billing_cycle_profile_id");--> statement-breakpoint
CREATE INDEX "idx_billing_cycle_profiles_product" ON "billing_cycle_profiles" USING btree ("credit_product_id");--> statement-breakpoint
CREATE INDEX "idx_billing_cycle_profiles_agreement" ON "billing_cycle_profiles" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "idx_billing_cycle_profiles_active" ON "billing_cycle_profiles" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_channels_code" ON "channels" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_channels_active" ON "channels" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cities_code" ON "cities" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_co_debtors_document_number" ON "co_debtors" USING btree ("identification_type_id","document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cost_centers_code" ON "cost_centers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_fund_budget" ON "credit_fund_budgets" USING btree ("credit_fund_id","accounting_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_funds_name" ON "credit_funds" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_accounts_credit_product" ON "credit_product_accounts" USING btree ("credit_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_billing_concepts" ON "credit_product_billing_concepts" USING btree ("credit_product_id","billing_concept_id");--> statement-breakpoint
CREATE INDEX "idx_credit_product_billing_concepts_product" ON "credit_product_billing_concepts" USING btree ("credit_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_category_range" ON "credit_product_categories" USING btree ("credit_product_id","category_code","installments_from","installments_to");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_document" ON "credit_product_documents" USING btree ("credit_product_id","document_type_id");--> statement-breakpoint
CREATE INDEX "idx_late_rules_credit_product" ON "credit_product_late_interest_rules" USING btree ("credit_product_id");--> statement-breakpoint
CREATE INDEX "idx_late_rules_active" ON "credit_product_late_interest_rules" USING btree ("credit_product_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_refi_policy_product" ON "credit_product_refinance_policies" USING btree ("credit_product_id");--> statement-breakpoint
CREATE INDEX "idx_refi_policy_active" ON "credit_product_refinance_policies" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_credit_products_fund" ON "credit_products" USING btree ("credit_fund_id");--> statement-breakpoint
CREATE INDEX "idx_credit_products_cost_center" ON "credit_products" USING btree ("cost_center_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_document_types_name" ON "document_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_gl_accounts_code" ON "gl_accounts" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_gl_accounts_is_bank" ON "gl_accounts" USING btree ("is_bank");--> statement-breakpoint
CREATE INDEX "idx_gl_accounts_is_active" ON "gl_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identification_types_name" ON "identification_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_insurance_companies_document_number_id" ON "insurance_companies" USING btree ("identification_type_id","document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_insurance_rate_range" ON "insurance_rate_ranges" USING btree ("insurance_company_id","range_metric","value_from","value_to");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_investment_types_name" ON "investment_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_loan" ON "loan_agreement_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_changed_at" ON "loan_agreement_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_agreement" ON "loan_agreement_history" USING btree ("agreement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_act_office_date" ON "loan_application_act_numbers" USING btree ("affiliation_office_id","act_date");--> statement-breakpoint
CREATE INDEX "idx_act_date" ON "loan_application_act_numbers" USING btree ("act_date");--> statement-breakpoint
CREATE INDEX "idx_act_office" ON "loan_application_act_numbers" USING btree ("affiliation_office_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_application_codebtor" ON "loan_application_co_debtors" USING btree ("loan_application_id","co_debtor_id");--> statement-breakpoint
CREATE INDEX "idx_application_codebtor_app" ON "loan_application_co_debtors" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_application_codebtor_codebtor" ON "loan_application_co_debtors" USING btree ("co_debtor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_application_document_type" ON "loan_application_documents" USING btree ("loan_application_id","document_type_id");--> statement-breakpoint
CREATE INDEX "idx_loan_app_events_app" ON "loan_application_events" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_loan_app_events_occurred_at" ON "loan_application_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_loan_app_events_key" ON "loan_application_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "idx_loan_app_events_status" ON "loan_application_events" USING btree ("event_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_pledge_application_beneficiary" ON "loan_application_pledges" USING btree ("loan_application_id","pledge_code","beneficiary_code");--> statement-breakpoint
CREATE INDEX "idx_pledges_application" ON "loan_application_pledges" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_pledges_pledge_code" ON "loan_application_pledges" USING btree ("pledge_code");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_application" ON "loan_application_risk_assessments" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_executed_at" ON "loan_application_risk_assessments" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_app_status_hist_app" ON "loan_application_status_history" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_loan_app_status_hist_changed_at" ON "loan_application_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_date_office" ON "loan_applications" USING btree ("application_date","affiliation_office_id");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_office" ON "loan_applications" USING btree ("affiliation_office_id");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_status" ON "loan_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_third_party" ON "loan_applications" USING btree ("third_party_id");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_product" ON "loan_applications" USING btree ("credit_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_billing_concepts" ON "loan_billing_concepts" USING btree ("loan_id","billing_concept_id");--> statement-breakpoint
CREATE INDEX "idx_loan_billing_concepts_loan" ON "loan_billing_concepts" USING btree ("loan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_installment_version_number" ON "loan_installments" USING btree ("loan_id","schedule_version","installment_number");--> statement-breakpoint
CREATE INDEX "idx_installments_loan_version_due" ON "loan_installments" USING btree ("loan_id","schedule_version","due_date");--> statement-breakpoint
CREATE INDEX "idx_installments_loan_status_due" ON "loan_installments" USING btree ("loan_id","status","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_method_allocation" ON "loan_payment_method_allocations" USING btree ("loan_payment_id","collection_method_id","line_number");--> statement-breakpoint
CREATE INDEX "idx_payment_method_allocation_payment" ON "loan_payment_method_allocations" USING btree ("loan_payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_method_allocation_method" ON "loan_payment_method_allocations" USING btree ("collection_method_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_payment_receipt" ON "loan_payments" USING btree ("receipt_type_id","payment_number");--> statement-breakpoint
CREATE INDEX "idx_loan_payment_loan_date" ON "loan_payments" USING btree ("loan_id","payment_date");--> statement-breakpoint
CREATE INDEX "idx_loan_payment_status" ON "loan_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_loan_process_state_last_date" ON "loan_process_states" USING btree ("process_type","last_processed_date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_ref_link" ON "loan_refinancing_links" USING btree ("loan_id","reference_loan_id");--> statement-breakpoint
CREATE INDEX "idx_ref_link_reference_loan" ON "loan_refinancing_links" USING btree ("reference_loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_loan" ON "loan_status_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_changed_at" ON "loan_status_history" USING btree ("changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loans_credit_number" ON "loans" USING btree ("credit_number");--> statement-breakpoint
CREATE INDEX "idx_loans_application" ON "loans" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_loans_agreement" ON "loans" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "idx_loans_status" ON "loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_loans_start_status" ON "loans" USING btree ("credit_start_date","status");--> statement-breakpoint
CREATE INDEX "idx_loans_office" ON "loans" USING btree ("affiliation_office_id");--> statement-breakpoint
CREATE INDEX "idx_loans_third_party" ON "loans" USING btree ("third_party_id");--> statement-breakpoint
CREATE INDEX "idx_loans_payee" ON "loans" USING btree ("payee_third_party_id");--> statement-breakpoint
CREATE INDEX "idx_loans_disbursement_status" ON "loans" USING btree ("disbursement_status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_allocation_policies_name" ON "payment_allocation_policies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_payment_allocation_policies_active" ON "payment_allocation_policies" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_alloc_rule_order" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id","priority");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_alloc_rule_concept" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id","billing_concept_id");--> statement-breakpoint
CREATE INDEX "idx_payment_alloc_rules_policy" ON "payment_allocation_policy_rules" USING btree ("payment_allocation_policy_id");--> statement-breakpoint
CREATE INDEX "idx_payment_alloc_rules_concept" ON "payment_allocation_policy_rules" USING btree ("billing_concept_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_frequencies_name" ON "payment_frequencies" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_guarantee_types_name" ON "payment_guarantee_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_receipt_types_code" ON "payment_receipt_types" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_receipt_types_name" ON "payment_receipt_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_tender_types_type" ON "payment_tender_types" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_payroll_excess_loan" ON "payroll_excess_payments" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_excess_date" ON "payroll_excess_payments" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_payroll_excess_status" ON "payroll_excess_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_excess_payer" ON "payroll_excess_payments" USING btree ("payer_tax_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_excess_type" ON "payroll_excess_payments" USING btree ("process_type");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_portfolio_aging_snapshot" ON "portfolio_aging_snapshots" USING btree ("accounting_period_id","aging_profile_id","loan_id","gl_account_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_aging_period" ON "portfolio_aging_snapshots" USING btree ("accounting_period_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_aging_office_period" ON "portfolio_aging_snapshots" USING btree ("affiliation_office_id","accounting_period_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_aging_credit_product_period" ON "portfolio_aging_snapshots" USING btree ("credit_product_id","accounting_period_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_aging_third_period" ON "portfolio_aging_snapshots" USING btree ("third_party_id","accounting_period_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_aging_loan_period" ON "portfolio_aging_snapshots" USING btree ("loan_id","accounting_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_portfolio_entry" ON "portfolio_entries" USING btree ("gl_account_id","third_party_id","loan_id","installment_number");--> statement-breakpoint
CREATE INDEX "idx_portfolio_loan" ON "portfolio_entries" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_due_status" ON "portfolio_entries" USING btree ("due_date","status");--> statement-breakpoint
CREATE INDEX "idx_portfolio_third_party" ON "portfolio_entries" USING btree ("third_party_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_gl_account" ON "portfolio_entries" USING btree ("gl_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_provision_detail_line_bucket" ON "portfolio_provision_snapshot_details" USING btree ("provision_snapshot_id","aging_snapshot_id","aging_bucket_id");--> statement-breakpoint
CREATE INDEX "idx_provision_detail_snapshot" ON "portfolio_provision_snapshot_details" USING btree ("provision_snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_provision_detail_aging_snapshot" ON "portfolio_provision_snapshot_details" USING btree ("aging_snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_provision_detail_bucket" ON "portfolio_provision_snapshot_details" USING btree ("aging_bucket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_provision_snapshot_period_profile" ON "portfolio_provision_snapshots" USING btree ("accounting_period_id","aging_profile_id");--> statement-breakpoint
CREATE INDEX "idx_provision_snapshot_period" ON "portfolio_provision_snapshots" USING btree ("accounting_period_id");--> statement-breakpoint
CREATE INDEX "idx_provision_snapshot_profile" ON "portfolio_provision_snapshots" USING btree ("aging_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_process_run" ON "process_runs" USING btree ("process_type","process_date");--> statement-breakpoint
CREATE INDEX "idx_process_run_type_date" ON "process_runs" USING btree ("process_type","process_date");--> statement-breakpoint
CREATE INDEX "idx_process_run_period" ON "process_runs" USING btree ("accounting_period_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_rejection_reasons_name" ON "rejection_reasons" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_repayment_methods_name" ON "repayment_methods" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_third_party_identity" ON "third_parties" USING btree ("identification_type_id","document_number");--> statement-breakpoint
CREATE INDEX "idx_third_party_employer_doc" ON "third_parties" USING btree ("employer_document_number");--> statement-breakpoint
CREATE INDEX "idx_third_party_type" ON "third_parties" USING btree ("third_party_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_third_party_types_name" ON "third_party_types" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_affiliation_office" ON "user_affiliation_offices" USING btree ("user_id","affiliation_office_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_user_receipt_type" ON "user_payment_receipt_types" USING btree ("user_id","payment_receipt_type_id");
