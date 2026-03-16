ALTER TABLE "credits_settings"
ADD COLUMN "write_off_expense_gl_account_id" integer
REFERENCES "gl_accounts"("id")
ON DELETE RESTRICT;
