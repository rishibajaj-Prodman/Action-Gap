WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY cohort, round, participant_id
    ORDER BY created_at ASC
  ) as rn
  FROM responses
)
DELETE FROM responses WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'responses_unique_per_round'
  ) THEN
    ALTER TABLE responses
    ADD CONSTRAINT responses_unique_per_round
    UNIQUE (cohort, round, participant_id);
  END IF;
END $$;
