CREATE TABLE IF NOT EXISTS ping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort TEXT NOT NULL DEFAULT 'default',
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ping (cohort, count) VALUES ('default', 0)
ON CONFLICT DO NOTHING;

ALTER TABLE ping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON ping;
DROP POLICY IF EXISTS "public_update" ON ping;
DROP POLICY IF EXISTS "public_insert" ON ping;
CREATE POLICY "public_read" ON ping FOR SELECT USING (true);
CREATE POLICY "public_update" ON ping FOR UPDATE USING (true);
CREATE POLICY "public_insert" ON ping FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE ping;
