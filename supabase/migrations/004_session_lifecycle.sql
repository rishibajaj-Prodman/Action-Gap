DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN started_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN ended_at TIMESTAMPTZ;
  END IF;
END $$;
