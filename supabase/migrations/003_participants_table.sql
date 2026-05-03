CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(cohort, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_cohort_active ON participants(cohort, active);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_public_all" ON participants;
CREATE POLICY "participants_public_all" ON participants FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE participants;
