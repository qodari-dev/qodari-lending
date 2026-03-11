-- ---------------------------------------------------------------------------
-- 0039 - Signature system improvements
-- ---------------------------------------------------------------------------
-- 1. Add triggered_by columns to signature_events for audit trail
-- ---------------------------------------------------------------------------

ALTER TABLE "signature_events"
  ADD COLUMN "triggered_by_user_id" varchar(180),
  ADD COLUMN "triggered_by_user_name" varchar(180);
