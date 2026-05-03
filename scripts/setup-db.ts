import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

const statements = [
  `CREATE TABLE IF NOT EXISTS ping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort TEXT NOT NULL DEFAULT 'default',
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `INSERT INTO ping (cohort, count) VALUES ('default', 0) ON CONFLICT DO NOTHING`,
  `ALTER TABLE ping ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "public_read" ON ping`,
  `DROP POLICY IF EXISTS "public_update" ON ping`,
  `DROP POLICY IF EXISTS "public_insert" ON ping`,
  `CREATE POLICY "public_read" ON ping FOR SELECT USING (true)`,
  `CREATE POLICY "public_update" ON ping FOR UPDATE USING (true)`,
  `CREATE POLICY "public_insert" ON ping FOR INSERT WITH CHECK (true)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort TEXT NOT NULL UNIQUE,
    current_round TEXT DEFAULT 'mirror',
    reveal_state TEXT DEFAULT 'collecting',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort TEXT NOT NULL,
    round TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_responses_cohort_round ON responses(cohort, round)`,
  `INSERT INTO sessions (cohort, current_round, reveal_state) VALUES
    ('Dolphins', 'mirror', 'collecting'),
    ('Foxes', 'mirror', 'collecting'),
    ('Elephants', 'mirror', 'collecting')
   ON CONFLICT (cohort) DO NOTHING`,
  `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE responses ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "sessions_public_all" ON sessions`,
  `DROP POLICY IF EXISTS "responses_public_all" ON responses`,
  `CREATE POLICY "sessions_public_all" ON sessions FOR ALL USING (true) WITH CHECK (true)`,
  `CREATE POLICY "responses_public_all" ON responses FOR ALL USING (true) WITH CHECK (true)`,

  `CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(cohort, participant_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_participants_cohort_active ON participants(cohort, active)`,
  `ALTER TABLE participants ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "participants_public_all" ON participants`,
  `CREATE POLICY "participants_public_all" ON participants FOR ALL USING (true) WITH CHECK (true)`,

  `DO $$
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
   END $$`,

  `WITH duplicates AS (
     SELECT id, ROW_NUMBER() OVER (
       PARTITION BY cohort, round, participant_id
       ORDER BY created_at ASC
     ) as rn
     FROM responses
   )
   DELETE FROM responses WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)`,

  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'responses_unique_per_round'
     ) THEN
       ALTER TABLE responses
       ADD CONSTRAINT responses_unique_per_round
       UNIQUE (cohort, round, participant_id);
     END IF;
   END $$`,
];

const realtimeTables = ["ping", "sessions", "responses", "participants"];

async function main() {
  try {
    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    for (const table of realtimeTables) {
      try {
        await sql.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`(realtime ${table} note: ${msg})`);
      }
    }

    console.log("ping, sessions, responses tables ready");
    console.log("participants table ready");
    console.log("lifecycle columns ready");
    console.log("deduplicated existing responses");
    console.log("responses unique constraint ready");
  } catch (err) {
    console.error("setup failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
