import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function main() {
  try {
    const allRows = await sql`
      SELECT cohort, participant_id, name, active, joined_at
      FROM participants
      ORDER BY cohort, joined_at
    `;
    console.log(`participants total: ${allRows.length}`);
    for (const r of allRows) {
      console.log(`  ${r.cohort.padEnd(10)} | ${r.name.padEnd(20)} | active=${r.active} | ${r.joined_at}`);
    }

    const pub = await sql`
      SELECT tablename FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename
    `;
    console.log(`\nrealtime publication tables: ${pub.map(r => r.tablename).join(", ")}`);

    const policies = await sql`
      SELECT tablename, policyname, cmd
      FROM pg_policies
      WHERE tablename = 'participants'
    `;
    console.log(`\nparticipants policies:`);
    for (const p of policies) console.log(`  ${p.policyname} (${p.cmd})`);
  } finally {
    await sql.end();
  }
}

main();
