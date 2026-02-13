ALTER TABLE "loans" ADD COLUMN "bank_id" integer;
ALTER TABLE "loans" ADD COLUMN "bank_account_type" "bank_account_type";
ALTER TABLE "loans" ADD COLUMN "bank_account_number" varchar(25);
ALTER TABLE "loans" ADD CONSTRAINT "loans_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "idx_loans_bank" ON "loans" USING btree ("bank_id");
