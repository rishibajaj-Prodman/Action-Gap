CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL UNIQUE,
  current_round TEXT DEFAULT 'mirror',
  reveal_state TEXT DEFAULT 'collecting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL,
  round TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_responses_cohort_round ON responses(cohort, round);

INSERT INTO sessions (cohort, current_round, reveal_state) VALUES
  ('Dolphins', 'mirror', 'collecting'),
  ('Foxes', 'mirror', 'collecting'),
  ('Elephants', 'mirror', 'collecting')
ON CONFLICT (cohort) DO NOTHING;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_public_all" ON sessions;
DROP POLICY IF EXISTS "responses_public_all" ON responses;
CREATE POLICY "sessions_public_all" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "responses_public_all" ON responses FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
