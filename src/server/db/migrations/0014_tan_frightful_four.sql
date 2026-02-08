ALTER TABLE "loans" ADD COLUMN "agreement_id" integer;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loans_agreement" ON "loans" USING btree ("agreement_id");--> statement-breakpoint

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
);--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_agreement_history" ADD CONSTRAINT "loan_agreement_history_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_loan" ON "loan_agreement_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_changed_at" ON "loan_agreement_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "idx_loan_agreement_history_agreement" ON "loan_agreement_history" USING btree ("agreement_id");--> statement-breakpoint

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
);--> statement-breakpoint
ALTER TABLE "loan_status_history" ADD CONSTRAINT "loan_status_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_loan" ON "loan_status_history" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_status_history_changed_at" ON "loan_status_history" USING btree ("changed_at");
