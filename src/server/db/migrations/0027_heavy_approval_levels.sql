CREATE TYPE "public"."loan_application_approval_action" AS ENUM('ASSIGNED', 'APPROVED_FORWARD', 'APPROVED_FINAL', 'REJECTED', 'CANCELED', 'REASSIGNED');--> statement-breakpoint

CREATE TABLE "loan_approval_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"level_order" integer NOT NULL,
	"max_approval_amount" numeric(14, 2),
	"round_robin_cursor" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loan_approval_levels_max_amount_positive" CHECK ("loan_approval_levels"."max_approval_amount" IS NULL OR "loan_approval_levels"."max_approval_amount" > 0),
	CONSTRAINT "chk_loan_approval_levels_round_robin_cursor_min" CHECK ("loan_approval_levels"."round_robin_cursor" >= 0)
);--> statement-breakpoint

CREATE TABLE "loan_approval_level_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_approval_level_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loan_approval_level_users_sort_order_min" CHECK ("loan_approval_level_users"."sort_order" >= 0)
);--> statement-breakpoint

CREATE TABLE "loan_application_approval_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_application_id" integer NOT NULL,
	"level_id" integer,
	"action" "loan_application_approval_action" NOT NULL,
	"actor_user_id" uuid,
	"actor_user_name" varchar(255),
	"assigned_to_user_id" uuid,
	"assigned_to_user_name" varchar(255),
	"note" varchar(255),
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "loan_applications" ADD COLUMN "assigned_approval_user_id" uuid;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "assigned_approval_user_name" varchar(255);--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "current_approval_level_id" integer;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD COLUMN "target_approval_level_id" integer;--> statement-breakpoint

ALTER TABLE "loan_approval_level_users" ADD CONSTRAINT "loan_approval_level_users_loan_approval_level_id_loan_approval_levels_id_fk" FOREIGN KEY ("loan_approval_level_id") REFERENCES "public"."loan_approval_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_approval_history" ADD CONSTRAINT "loan_application_approval_history_loan_application_id_loan_applications_id_fk" FOREIGN KEY ("loan_application_id") REFERENCES "public"."loan_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_approval_history" ADD CONSTRAINT "loan_application_approval_history_level_id_loan_approval_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."loan_approval_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_current_approval_level_id_loan_approval_levels_id_fk" FOREIGN KEY ("current_approval_level_id") REFERENCES "public"."loan_approval_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_target_approval_level_id_loan_approval_levels_id_fk" FOREIGN KEY ("target_approval_level_id") REFERENCES "public"."loan_approval_levels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX "uniq_loan_approval_levels_order" ON "loan_approval_levels" USING btree ("level_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_approval_level_user" ON "loan_approval_level_users" USING btree ("loan_approval_level_id", "user_id");--> statement-breakpoint
CREATE INDEX "idx_loan_approval_level_users_level" ON "loan_approval_level_users" USING btree ("loan_approval_level_id");--> statement-breakpoint
CREATE INDEX "idx_loan_approval_level_users_level_active" ON "loan_approval_level_users" USING btree ("loan_approval_level_id", "is_active");--> statement-breakpoint
CREATE INDEX "idx_loan_app_approval_history_application" ON "loan_application_approval_history" USING btree ("loan_application_id");--> statement-breakpoint
CREATE INDEX "idx_loan_app_approval_history_level" ON "loan_application_approval_history" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "idx_loan_app_approval_history_action" ON "loan_application_approval_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_loan_app_approval_history_occurred_at" ON "loan_application_approval_history" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_status_assigned_user" ON "loan_applications" USING btree ("status", "assigned_approval_user_id");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_current_level" ON "loan_applications" USING btree ("current_approval_level_id");--> statement-breakpoint
CREATE INDEX "idx_loan_applications_target_level" ON "loan_applications" USING btree ("target_approval_level_id");
