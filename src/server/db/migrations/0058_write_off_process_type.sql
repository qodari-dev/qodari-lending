DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'WRITE_OFF'
      AND enumtypid = 'process_type'::regtype
  ) THEN
    ALTER TYPE "process_type" ADD VALUE 'WRITE_OFF';
  END IF;
END $$;
