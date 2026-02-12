ALTER TABLE "loan_application_co_debtors" ALTER COLUMN "co_debtor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_application_co_debtors" ADD COLUMN "third_party_id" integer;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "home_address" varchar(80);--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "home_city_id" integer;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "home_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "work_address" varchar(80);--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "work_city_id" integer;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "work_phone" varchar(20);--> statement-breakpoint
UPDATE "loan_application_co_debtors" lac
SET "third_party_id" = tp."id"
FROM "co_debtors" cd
JOIN "third_parties" tp
  ON tp."identification_type_id" = cd."identification_type_id"
 AND tp."document_number" = cd."document_number"
WHERE lac."co_debtor_id" = cd."id"
  AND lac."third_party_id" IS NULL;--> statement-breakpoint
ALTER TABLE "loan_application_co_debtors" ADD CONSTRAINT "loan_application_co_debtors_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_home_city_id_cities_id_fk" FOREIGN KEY ("home_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_work_city_id_cities_id_fk" FOREIGN KEY ("work_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_application_third_party" ON "loan_application_co_debtors" USING btree ("loan_application_id","third_party_id");--> statement-breakpoint
CREATE INDEX "idx_application_codebtor_third_party" ON "loan_application_co_debtors" USING btree ("third_party_id");
