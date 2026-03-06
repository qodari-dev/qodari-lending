CREATE TYPE "public"."document_content_format" AS ENUM('HTML_HBS', 'PDF_STATIC');--> statement-breakpoint
CREATE TYPE "public"."document_template_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."loan_document_status" AS ENUM('GENERATED', 'SENT_FOR_SIGNATURE', 'PARTIALLY_SIGNED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."signature_artifact_type" AS ENUM('SIGNED_PDF', 'CERTIFICATE', 'AUDIT_TRAIL', 'TIMESTAMP_PROOF');--> statement-breakpoint
CREATE TYPE "public"."signature_envelope_status" AS ENUM('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."signature_provider" AS ENUM('DOCUSIGN', 'YOUSIGN', 'ADOBE_SIGN', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."signature_signer_status" AS ENUM('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'REJECTED', 'EXPIRED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."signer_role" AS ENUM('BORROWER', 'CO_DEBTOR', 'SPOUSE', 'EMPLOYER_REPRESENTATIVE', 'ENTITY_OFFICER');--> statement-breakpoint
CREATE TABLE "credit_product_document_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_product_id" integer NOT NULL,
	"document_template_id" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"document_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_credit_product_document_rules_order_min" CHECK ("credit_product_document_rules"."document_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"version" integer NOT NULL,
	"status" "document_template_status" DEFAULT 'DRAFT' NOT NULL,
	"content_format" "document_content_format" NOT NULL,
	"template_body" text,
	"template_storage_key" text,
	"legal_text_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_document_templates_version_min" CHECK ("document_templates"."version" > 0),
	CONSTRAINT "chk_document_templates_content" CHECK (
        (
          "document_templates"."content_format" = 'HTML_HBS'
          AND "document_templates"."template_body" IS NOT NULL
          AND "document_templates"."template_storage_key" IS NULL
        )
        OR
        (
          "document_templates"."content_format" = 'PDF_STATIC'
          AND "document_templates"."template_storage_key" IS NOT NULL
          AND "document_templates"."template_body" IS NULL
        )
      )
);
--> statement-breakpoint
CREATE TABLE "loan_document_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"document_template_id" integer NOT NULL,
	"document_template_version" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"document_code" varchar(80) NOT NULL,
	"document_name" varchar(180) NOT NULL,
	"status" "loan_document_status" DEFAULT 'GENERATED' NOT NULL,
	"unsigned_storage_key" text NOT NULL,
	"unsigned_sha256" varchar(64) NOT NULL,
	"signed_storage_key" text,
	"signed_sha256" varchar(64),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_for_signature_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_loan_document_instances_template_version_min" CHECK ("loan_document_instances"."document_template_version" > 0),
	CONSTRAINT "chk_loan_document_instances_revision_min" CHECK ("loan_document_instances"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "signature_artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature_envelope_id" integer NOT NULL,
	"loan_document_instance_id" integer,
	"provider" "signature_provider" NOT NULL,
	"provider_artifact_id" varchar(180),
	"artifact_type" "signature_artifact_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer,
	"sha256" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_signature_artifacts_size_bytes_min" CHECK ("signature_artifacts"."size_bytes" IS NULL OR "signature_artifacts"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "signature_envelope_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature_envelope_id" integer NOT NULL,
	"loan_document_instance_id" integer NOT NULL,
	"doc_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_signature_envelope_documents_doc_order_min" CHECK ("signature_envelope_documents"."doc_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "signature_envelopes" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"provider" "signature_provider" NOT NULL,
	"provider_envelope_id" varchar(180) NOT NULL,
	"status" "signature_envelope_status" DEFAULT 'DRAFT' NOT NULL,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature_envelope_id" integer,
	"provider" "signature_provider" NOT NULL,
	"provider_event_id" varchar(180),
	"event_type" varchar(120) NOT NULL,
	"event_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL,
	"webhook_signature_valid" boolean,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text
);
--> statement-breakpoint
CREATE TABLE "signature_signers" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature_envelope_id" integer NOT NULL,
	"signer_role" "signer_role" NOT NULL,
	"sign_order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"provider_signer_id" varchar(180),
	"third_party_id" integer,
	"full_name" varchar(180) NOT NULL,
	"email" varchar(180),
	"phone" varchar(40),
	"document_type_code" varchar(20),
	"document_number" varchar(40),
	"status" "signature_signer_status" DEFAULT 'PENDING' NOT NULL,
	"signed_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_signature_signers_sign_order_min" CHECK ("signature_signers"."sign_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "template_signer_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_template_id" integer NOT NULL,
	"signer_role" "signer_role" NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"sign_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_template_signer_rules_sign_order_min" CHECK ("template_signer_rules"."sign_order" > 0)
);
--> statement-breakpoint
ALTER TABLE "credit_product_document_rules" ADD CONSTRAINT "credit_product_document_rules_credit_product_id_credit_products_id_fk" FOREIGN KEY ("credit_product_id") REFERENCES "public"."credit_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_product_document_rules" ADD CONSTRAINT "credit_product_document_rules_document_template_id_document_templates_id_fk" FOREIGN KEY ("document_template_id") REFERENCES "public"."document_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_document_instances" ADD CONSTRAINT "loan_document_instances_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_document_instances" ADD CONSTRAINT "loan_document_instances_document_template_id_document_templates_id_fk" FOREIGN KEY ("document_template_id") REFERENCES "public"."document_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_artifacts" ADD CONSTRAINT "signature_artifacts_signature_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("signature_envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_artifacts" ADD CONSTRAINT "signature_artifacts_loan_document_instance_id_loan_document_instances_id_fk" FOREIGN KEY ("loan_document_instance_id") REFERENCES "public"."loan_document_instances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelope_documents" ADD CONSTRAINT "signature_envelope_documents_signature_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("signature_envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelope_documents" ADD CONSTRAINT "signature_envelope_documents_loan_document_instance_id_loan_document_instances_id_fk" FOREIGN KEY ("loan_document_instance_id") REFERENCES "public"."loan_document_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_envelopes" ADD CONSTRAINT "signature_envelopes_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_signature_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("signature_envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_signature_envelope_id_signature_envelopes_id_fk" FOREIGN KEY ("signature_envelope_id") REFERENCES "public"."signature_envelopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_third_party_id_third_parties_id_fk" FOREIGN KEY ("third_party_id") REFERENCES "public"."third_parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_signer_rules" ADD CONSTRAINT "template_signer_rules_document_template_id_document_templates_id_fk" FOREIGN KEY ("document_template_id") REFERENCES "public"."document_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_credit_product_document_rules" ON "credit_product_document_rules" USING btree ("credit_product_id","document_template_id");--> statement-breakpoint
CREATE INDEX "idx_credit_product_document_rules_product_order" ON "credit_product_document_rules" USING btree ("credit_product_id","document_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_document_templates_code_version" ON "document_templates" USING btree ("code","version");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_loan_document_instances_loan_code_revision" ON "loan_document_instances" USING btree ("loan_id","document_code","revision");--> statement-breakpoint
CREATE INDEX "idx_loan_document_instances_loan" ON "loan_document_instances" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_loan_document_instances_status" ON "loan_document_instances" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_signature_artifacts_envelope_type_key" ON "signature_artifacts" USING btree ("signature_envelope_id","artifact_type","storage_key");--> statement-breakpoint
CREATE INDEX "idx_signature_artifacts_document" ON "signature_artifacts" USING btree ("loan_document_instance_id");--> statement-breakpoint
CREATE INDEX "idx_signature_artifacts_envelope" ON "signature_artifacts" USING btree ("signature_envelope_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_signature_envelope_documents" ON "signature_envelope_documents" USING btree ("signature_envelope_id","loan_document_instance_id");--> statement-breakpoint
CREATE INDEX "idx_signature_envelope_documents_order" ON "signature_envelope_documents" USING btree ("signature_envelope_id","doc_order");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_signature_envelopes_provider_id" ON "signature_envelopes" USING btree ("provider","provider_envelope_id");--> statement-breakpoint
CREATE INDEX "idx_signature_envelopes_loan" ON "signature_envelopes" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_signature_envelopes_status" ON "signature_envelopes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_signature_events_provider_event" ON "signature_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_signature_events_envelope" ON "signature_events" USING btree ("signature_envelope_id");--> statement-breakpoint
CREATE INDEX "idx_signature_signers_envelope_order" ON "signature_signers" USING btree ("signature_envelope_id","sign_order");--> statement-breakpoint
CREATE INDEX "idx_signature_signers_provider_signer" ON "signature_signers" USING btree ("provider_signer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_template_signer_rules_template_role_order" ON "template_signer_rules" USING btree ("document_template_id","signer_role","sign_order");--> statement-breakpoint
CREATE INDEX "idx_template_signer_rules_template_order" ON "template_signer_rules" USING btree ("document_template_id","sign_order");