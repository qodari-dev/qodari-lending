CREATE TYPE "public"."risk_center_type" AS ENUM('CIFIN', 'DATACREDITO');--> statement-breakpoint
CREATE TABLE "risk_center_report_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"risk_center_report_run_id" integer NOT NULL,
	"loan_id" integer NOT NULL,
	"risk_center_type" "risk_center_type" NOT NULL,
	"report_date" date NOT NULL,
	"was_reported" boolean DEFAULT false NOT NULL,
	"reported_status" varchar(40) NOT NULL,
	"days_past_due" integer DEFAULT 0 NOT NULL,
	"current_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"overdue_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reported_third_parties_count" integer DEFAULT 0 NOT NULL,
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_center_report_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"risk_center_type" "risk_center_type" NOT NULL,
	"credit_cutoff_date" date NOT NULL,
	"payment_cutoff_date" date NOT NULL,
	"reviewed_credits" integer DEFAULT 0 NOT NULL,
	"reported_credits" integer DEFAULT 0 NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"generated_by_user_id" uuid NOT NULL,
	"generated_by_user_name" varchar(255) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loans" RENAME COLUMN "is_reported_to_cifin" TO "is_reported_to_risk_center";--> statement-breakpoint
ALTER TABLE "loans" RENAME COLUMN "cifin_report_date" TO "risk_center_report_date";--> statement-breakpoint
ALTER TABLE "risk_center_report_items" ADD CONSTRAINT "risk_center_report_items_risk_center_report_run_id_risk_center_report_runs_id_fk" FOREIGN KEY ("risk_center_report_run_id") REFERENCES "public"."risk_center_report_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_center_report_items" ADD CONSTRAINT "risk_center_report_items_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_risk_center_items_run" ON "risk_center_report_items" USING btree ("risk_center_report_run_id");--> statement-breakpoint
CREATE INDEX "idx_risk_center_items_loan_date" ON "risk_center_report_items" USING btree ("loan_id","report_date");--> statement-breakpoint
CREATE INDEX "idx_risk_center_items_loan_type_date" ON "risk_center_report_items" USING btree ("loan_id","risk_center_type","report_date");--> statement-breakpoint
CREATE INDEX "idx_risk_center_items_type_reported" ON "risk_center_report_items" USING btree ("risk_center_type","was_reported","report_date");--> statement-breakpoint
CREATE INDEX "idx_risk_center_runs_type_generated" ON "risk_center_report_runs" USING btree ("risk_center_type","generated_at");--> statement-breakpoint
CREATE INDEX "idx_risk_center_runs_type_payment_cutoff" ON "risk_center_report_runs" USING btree ("risk_center_type","payment_cutoff_date");--> statement-breakpoint
CREATE INDEX "idx_risk_center_runs_credit_cutoff" ON "risk_center_report_runs" USING btree ("credit_cutoff_date");