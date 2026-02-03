CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identification_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(5) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_product_required_documents" RENAME TO "credit_product_documents";--> statement-breakpoint
ALTER TABLE "co_debtors" RENAME COLUMN "document_type" TO "identification_type_id";--> statement-breakpoint
ALTER TABLE "co_debtors" ALTER COLUMN "identification_type_id" TYPE integer USING ("identification_type_id"::integer);--> statement-breakpoint
ALTER TABLE "co_debtors" RENAME COLUMN "home_city_code" TO "home_city_id";--> statement-breakpoint
ALTER TABLE "co_debtors" RENAME COLUMN "work_city_code" TO "work_city_id";--> statement-breakpoint
ALTER TABLE "co_debtors" ALTER COLUMN "home_city_id" TYPE integer USING ("home_city_id"::integer);--> statement-breakpoint
ALTER TABLE "co_debtors" ALTER COLUMN "work_city_id" TYPE integer USING ("work_city_id"::integer);--> statement-breakpoint
ALTER TABLE "credit_product_documents" RENAME COLUMN "required_document_type_id" TO "document_type_id";--> statement-breakpoint
ALTER TABLE "insurance_companies" RENAME COLUMN "tax_id" TO "document_number";--> statement-breakpoint
ALTER TABLE "loan_application_documents" RENAME COLUMN "required_document_type_id" TO "document_type_id";--> statement-breakpoint
ALTER TABLE "third_parties" RENAME COLUMN "document_type" TO "identification_type_id";--> statement-breakpoint
ALTER TABLE "third_parties" ALTER COLUMN "identification_type_id" TYPE integer USING ("identification_type_id"::integer);--> statement-breakpoint
ALTER TABLE "credit_product_documents" DROP CONSTRAINT "credit_product_required_documents_credit_product_id_credit_products_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_product_documents" DROP CONSTRAINT "credit_product_required_documents_required_document_type_id_document_types_id_fk";
--> statement-breakpoint
ALTER TABLE "loan_application_documents" DROP CONSTRAINT "loan_application_documents_required_document_type_id_document_types_id_fk";
--> statement-breakpoint
DROP INDEX "uniq_credit_product_required_document";--> statement-breakpoint
DROP INDEX "uniq_insurance_companies_tax_id";--> statement-breakpoint
DROP INDEX "uniq_co_debtors_document_number";--> statement-breakpoint
DROP INDEX "uniq_application_document_type";--> statement-breakpoint
DROP INDEX "uniq_third_party_identity";--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD COLUMN "identification_type_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "loan_application_documents" ADD COLUMN "uploaded_by_user_name" uuid;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "channel_id" integer;--> statement-breakpoint
ALTER TABLE "third_parties" ADD COLUMN "city_id" integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cities_name" ON "cities" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_identification_types_name" ON "identification_types" USING btree ("name");--> statement-breakpoint

ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_home_city_id_cities_id_fk" FOREIGN KEY ("home_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_debtors" ADD CONSTRAINT "co_debtors_work_city_id_cities_id_fk" FOREIGN KEY ("work_city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_documents" ADD CONSTRAINT "credit_product_documents_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_documents" ADD CONSTRAINT "credit_product_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_companies" ADD CONSTRAINT "insurance_companies_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_application_documents" ADD CONSTRAINT "loan_application_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_identification_type_id_identification_types_id_fk" FOREIGN KEY ("identification_type_id") REFERENCES "public"."identification_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_document" ON "credit_product_documents" USING btree ("credit_product_id","document_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_insurance_companies_document_number_id" ON "insurance_companies" USING btree ("identification_type_id","document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_co_debtors_document_number" ON "co_debtors" USING btree ("identification_type_id","document_number");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_application_document_type" ON "loan_application_documents" USING btree ("loan_application_id","document_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_third_party_identity" ON "third_parties" USING btree ("identification_type_id","document_number");
