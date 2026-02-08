ALTER TABLE "affiliation_offices" ADD COLUMN "code" varchar(5) NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_receipt_types" ADD COLUMN "code" varchar(5) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_affiliation_offices_code" ON "affiliation_offices" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_payment_receipt_types_code" ON "payment_receipt_types" USING btree ("code");
