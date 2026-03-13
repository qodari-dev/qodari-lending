CREATE TYPE "public"."loan_disbursement_event_type" AS ENUM('CREATED', 'LIQUIDATED', 'SENT_TO_ACCOUNTING', 'SENT_TO_BANK', 'DISBURSED', 'REJECTED', 'DATES_UPDATED');--> statement-breakpoint
CREATE TABLE "loan_disbursement_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"event_type" "loan_disbursement_event_type" NOT NULL,
	"from_disbursement_status" "loan_disbursement_status",
	"to_disbursement_status" "loan_disbursement_status",
	"event_date" date NOT NULL,
	"previous_disbursement_date" date,
	"new_disbursement_date" date,
	"previous_first_collection_date" date,
	"new_first_collection_date" date,
	"previous_maturity_date" date,
	"new_maturity_date" date,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by_user_id" uuid,
	"changed_by_user_name" varchar(255),
	"note" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loan_disbursement_events" ADD CONSTRAINT "loan_disbursement_events_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loan_disbursement_events_loan" ON "loan_disbursement_events" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_disbursement_events_changed_at" ON "loan_disbursement_events" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_disbursement_events_type" ON "loan_disbursement_events" USING btree ("event_type");