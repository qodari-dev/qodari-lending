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
ALTER TABLE "credit_product_late_interest_rules" DROP CONSTRAINT "credit_product_late_interest_rules_credit_product_category_id_credit_product_categories_id_fk";
--> statement-breakpoint
DROP INDEX "idx_late_rules_category";--> statement-breakpoint
DROP INDEX "idx_late_rules_active";--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ALTER COLUMN "payoff_amount" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ALTER COLUMN "payoff_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" ADD COLUMN "credit_product_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" ADD COLUMN "category_code" "category_code" NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_products" ADD COLUMN "age_basis" "late_interest_age_basis" DEFAULT 'OLDEST_OVERDUE_INSTALLMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_refinancing_links" ADD COLUMN "created_by_user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "agreement_id" integer;--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_status_history" ADD CONSTRAINT "loan_status_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_loan" ON "loan_agreement_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_changed_at" ON "loan_agreement_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_agreement" ON "loan_agreement_history" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_loan" ON "loan_status_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_changed_at" ON "loan_status_history" USING btree ("changed_at");--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" ADD CONSTRAINT "credit_product_late_interest_rules_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_late_rules_credit_product" ON "credit_product_late_interest_rules" USING btree ("credit_product_id");--> statement-breakpoint
CREATE INDEX "idx_loans_agreement" ON "loans" USING btree ("agreement_id");--> statement-breakpoint
CREATE INDEX "idx_late_rules_active" ON "credit_product_late_interest_rules" USING btree ("credit_product_id","is_active");--> statement-breakpoint
ALTER TABLE "credit_product_categories" DROP COLUMN "late_factor";--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" DROP COLUMN "credit_product_category_id";--> statement-breakpoint
ALTER TABLE "credit_product_late_interest_rules" DROP COLUMN "age_basis";--> statement-breakpoint
