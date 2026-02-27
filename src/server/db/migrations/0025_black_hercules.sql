CREATE TYPE "public"."billing_email_dispatch_status" AS ENUM('QUEUED', 'RUNNING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."billing_email_dispatch_trigger_source" AS ENUM('CRON', 'MANUAL', 'RETRY');--> statement-breakpoint
CREATE TABLE "agreement_billing_email_dispatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_id" integer NOT NULL,
	"billing_cycle_profile_id" integer NOT NULL,
	"billing_cycle_profile_cycle_id" integer NOT NULL,
	"period" varchar(7) NOT NULL,
	"scheduled_date" date NOT NULL,
	"status" "billing_email_dispatch_status" DEFAULT 'QUEUED' NOT NULL,
	"trigger_source" "billing_email_dispatch_trigger_source" DEFAULT 'MANUAL' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"queued_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"resend_message_id" varchar(255),
	"last_error" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_agreement_billing_email_dispatch_period_format" CHECK ("agreement_billing_email_dispatches"."period" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "chk_agreement_billing_email_dispatch_attempts_min" CHECK ("agreement_billing_email_dispatches"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "billing_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"from_email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"note" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "billing_email_to" varchar(255);--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "billing_email_cc" varchar(255);--> statement-breakpoint
ALTER TABLE "agreements" ADD COLUMN "billing_email_template_id" integer;--> statement-breakpoint
ALTER TABLE "agreement_billing_email_dispatches" ADD CONSTRAINT "agreement_billing_email_dispatches_agreement_id_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."agreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_billing_email_dispatches" ADD CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_id_billing_cycle_profiles_id_fk" FOREIGN KEY ("billing_cycle_profile_id") REFERENCES "public"."billing_cycle_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agreement_billing_email_dispatches" ADD CONSTRAINT "agreement_billing_email_dispatches_billing_cycle_profile_cycle_id_billing_cycle_profile_cycles_id_fk" FOREIGN KEY ("billing_cycle_profile_cycle_id") REFERENCES "public"."billing_cycle_profile_cycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_agreement_billing_email_dispatch" ON "agreement_billing_email_dispatches" USING btree ("agreement_id","billing_cycle_profile_id","billing_cycle_profile_cycle_id","period");--> statement-breakpoint
CREATE INDEX "idx_agreement_billing_email_dispatch_agreement" ON "agreement_billing_email_dispatches" USING btree ("agreement_id","status");--> statement-breakpoint
CREATE INDEX "idx_agreement_billing_email_dispatch_cycle" ON "agreement_billing_email_dispatches" USING btree ("billing_cycle_profile_id","billing_cycle_profile_cycle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_billing_email_templates_name" ON "billing_email_templates" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_billing_email_templates_active" ON "billing_email_templates" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "agreements" ADD CONSTRAINT "agreements_billing_email_template_id_billing_email_templates_id_fk" FOREIGN KEY ("billing_email_template_id") REFERENCES "public"."billing_email_templates"("id") ON DELETE set null ON UPDATE no action;