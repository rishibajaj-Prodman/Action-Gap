import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });

async function main() {
  try {
    await sql`
      INSERT INTO participants (cohort, participant_id, name)
      VALUES ('Dolphins', 'test_pid_1', 'TestUser')
      ON CONFLICT (cohort, participant_id) DO UPDATE SET name = EXCLUDED.name
    `;

    const rows = await sql`
      SELECT cohort, participant_id, name, active
      FROM participants
      WHERE cohort = 'Dolphins' AND participant_id = 'test_pid_1'
    `;

    if (rows.length !== 1) {
      throw new Error(`expected 1 row, got ${rows.length}`);
    }
    console.log("read back:", rows[0]);

    await sql`
      DELETE FROM participants
      WHERE cohort = 'Dolphins' AND participant_id = 'test_pid_1'
    `;

    console.log("participants test passed (insert / select / delete)");
  } catch (err) {
    console.error("participants test failed:", err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
