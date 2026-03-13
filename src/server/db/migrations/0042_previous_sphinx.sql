ALTER TABLE "loan_application_pledges" ALTER COLUMN "beneficiary_code" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "credits_settings" ADD COLUMN "pledge_subsidy_code" varchar(20);