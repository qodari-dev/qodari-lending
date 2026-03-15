CREATE TYPE "public"."provision_accounting_status" AS ENUM('PENDING', 'ACCOUNTED');--> statement-breakpoint
ALTER TABLE "credits_settings"
  ADD COLUMN "provision_expense_gl_account_id" integer,
  ADD COLUMN "portfolio_provision_gl_account_id" integer,
  ADD COLUMN "provision_recovery_gl_account_id" integer;--> statement-breakpoint
ALTER TABLE "credits_settings"
  ADD CONSTRAINT "credits_settings_provision_expense_gl_account_id_gl_accounts_id_fk"
  FOREIGN KEY ("provision_expense_gl_account_id") REFERENCES "public"."gl_accounts"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings"
  ADD CONSTRAINT "credits_settings_portfolio_provision_gl_account_id_gl_accounts_id_fk"
  FOREIGN KEY ("portfolio_provision_gl_account_id") REFERENCES "public"."gl_accounts"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits_settings"
  ADD CONSTRAINT "credits_settings_provision_recovery_gl_account_id_gl_accounts_id_fk"
  FOREIGN KEY ("provision_recovery_gl_account_id") REFERENCES "public"."gl_accounts"("id")
  ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_provision_snapshots"
  ADD COLUMN "accounting_status" "public"."provision_accounting_status" DEFAULT 'PENDING' NOT NULL,
  ADD COLUMN "accounted_at" timestamp with time zone,
  ADD COLUMN "accounted_by_user_id" uuid,
  ADD COLUMN "accounted_by_user_name" varchar(255),
  ADD COLUMN "accounting_document_code" varchar(20),
  ADD COLUMN "accounting_note" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_provision_snapshot_accounting_status"
  ON "portfolio_provision_snapshots" USING btree ("accounting_status");--> statement-breakpoint
