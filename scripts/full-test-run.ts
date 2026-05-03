import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require" });
const COHORT = "Dolphins";

const NAMES = ["Sara", "Marcus", "Lena", "Pavel", "Eva"];

const REFLECTIONS = [
  "I'll stop pretending recycling is enough.",
  "Comfort is the loudest excuse.",
  "The boss's plane bothers me more now.",
  "I've been my own dragon, my own excuse.",
  "Climate is a relationship problem, not a data problem.",
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pTrue(p: number) {
  return Math.random() < p;
}

async function step(label: string, fn: () => Promise<unknown>) {
  console.log(`\n[${label}]`);
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`  ✓ ${Date.now() - t0}ms`, out ?? "");
  } catch (err) {
    console.log(`  ✗ FAILED`, err instanceof Error ? err.message : err);
  }
}

async function curlRoute(path: string, expectedMarkers: string[]) {
  const url = `http://localhost:3000${path}`;
  const res = await fetch(url);
  const body = await res.text();
  const found: Record<string, boolean> = {};
  for (const m of expectedMarkers) {
    found[m] = body.includes(m);
  }
  const all = expectedMarkers.every((m) => found[m]);
  return { status: res.status, allMarkers: all, found };
}

async function main() {
  console.log("=".repeat(60));
  console.log("FULL TEST RUN — Dolphins cohort");
  console.log("=".repeat(60));

  await step("WIPE Dolphins", async () => {
    await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
    await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
    await sql`UPDATE sessions SET started_at=NULL, ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
    return "tables cleared";
  });

  await step("CHECK /poster/Dolphins (not_started)", async () => {
    const r = await curlRoute("/poster/Dolphins", [
      "Session starts soon",
      "DOLPHINS",
      "moves together",
    ]);
    return JSON.stringify(r);
  });

  await step("ADD 5 participants", async () => {
    const rows = NAMES.map((name, i) => ({
      cohort: COHORT,
      participant_id: `pid_test_${i}_${Date.now()}`,
      name,
    }));
    for (const r of rows) {
      await sql`INSERT INTO participants ${sql(r)}`;
    }
    return `inserted ${rows.length} participants`;
  });

  await step("START session", async () => {
    await sql`UPDATE sessions SET started_at = NOW(), current_round='idle' WHERE cohort = ${COHORT}`;
    return "session live, idle";
  });

  await step("CHECK /poster/Dolphins (live + idle)", async () => {
    const r = await curlRoute("/poster/Dolphins", [
      "DOLPHINS",
      "Scan to join",
    ]);
    return JSON.stringify(r);
  });

  // Round 1: Mirror
  await step("ROUND → mirror", async () => {
    await sql`UPDATE sessions SET current_round='mirror', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  });

  await step("SUBMIT mirror responses (5)", async () => {
    const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT}`;
    for (const p of parts) {
      await sql`INSERT INTO responses ${sql({
        cohort: COHORT,
        round: "mirror",
        participant_id: p.participant_id,
        data: { prediction: rand(40, 75), belief: pTrue(0.8) },
      })}`;
    }
    return `${parts.length} mirror responses`;
  });

  await step("REVEAL mirror", async () => {
    await sql`UPDATE sessions SET reveal_state='reveal' WHERE cohort = ${COHORT}`;
  });

  await step("CHECK /poster/Dolphins (mirror reveal)", async () => {
    const r = await curlRoute("/poster/Dolphins", [
      "DOLPHINS",
      "01 · THE MIRROR",
    ]);
    return JSON.stringify(r);
  });

  // Round 2: Funnel
  await step("ROUND → funnel", async () => {
    await sql`UPDATE sessions SET current_round='funnel', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  });

  await step("SUBMIT funnel responses", async () => {
    const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT}`;
    for (const p of parts) {
      await sql`INSERT INTO responses ${sql({
        cohort: COHORT,
        round: "funnel",
        participant_id: p.participant_id,
        data: {
          stage1: pTrue(0.95),
          stage2: pTrue(0.7),
          stage3: pTrue(0.5),
          stage4: pTrue(0.25),
        },
      })}`;
    }
    return `${parts.length} funnel responses`;
  });

  // Round 3: Court
  await step("ROUND → court", async () => {
    await sql`UPDATE sessions SET current_round='court', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  });

  await step("SUBMIT court responses", async () => {
    const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT}`;
    for (const p of parts) {
      const verdicts = [1, 2, 3, 4, 5].map((pairId) => ({
        pairId,
        vote: pTrue(pairId === 3 ? 0.5 : 0.75) ? "greenwash" : "real",
      }));
      await sql`INSERT INTO responses ${sql({
        cohort: COHORT,
        round: "court",
        participant_id: p.participant_id,
        data: { verdicts },
      })}`;
    }
    return `${parts.length} court responses`;
  });

  await step("REVEAL court", async () => {
    await sql`UPDATE sessions SET reveal_state='reveal' WHERE cohort = ${COHORT}`;
  });

  // Round 4: Reflection
  await step("ROUND → reflection", async () => {
    await sql`UPDATE sessions SET current_round='reflection', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  });

  await step("SUBMIT reflection responses", async () => {
    const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT}`;
    for (let i = 0; i < parts.length; i++) {
      await sql`INSERT INTO responses ${sql({
        cohort: COHORT,
        round: "reflection",
        participant_id: parts[i].participant_id,
        data: { text: REFLECTIONS[i % REFLECTIONS.length] },
      })}`;
    }
    return `${parts.length} reflections`;
  });

  // End
  await step("END session", async () => {
    await sql`UPDATE sessions SET ended_at = NOW(), current_round='complete' WHERE cohort = ${COHORT}`;
    await sql`UPDATE participants SET active=false WHERE cohort = ${COHORT}`;
  });

  await step("CHECK /poster/Dolphins (complete)", async () => {
    const r = await curlRoute("/poster/Dolphins", [
      "DOLPHINS",
      "Session complete",
      "View cohort insights",
    ]);
    return JSON.stringify(r);
  });

  await step("CHECK /insights/Dolphins (briefing)", async () => {
    const r = await curlRoute("/insights/Dolphins", [
      "Insights briefing",
      "DOLPHINS",
      "The Gap",
      "The Funnel",
      "Reflection",
    ]);
    return JSON.stringify(r);
  });

  // Verify DB integrity
  await step("VERIFY DB integrity", async () => {
    const counts = await sql`
      SELECT round, COUNT(*) as n
      FROM responses
      WHERE cohort = ${COHORT}
      GROUP BY round
      ORDER BY round
    `;
    const session = await sql`SELECT current_round, reveal_state, started_at IS NOT NULL as started, ended_at IS NOT NULL as ended FROM sessions WHERE cohort = ${COHORT}`;
    const partCount = await sql`SELECT COUNT(*) as n, SUM(CASE WHEN active THEN 1 ELSE 0 END) as active FROM participants WHERE cohort = ${COHORT}`;
    return JSON.stringify({
      responsesByRound: counts.map((r) => `${r.round}:${r.n}`).join(", "),
      session: session[0],
      participants: partCount[0],
    });
  });

  console.log("\n" + "=".repeat(60));
  console.log("DONE");
  console.log("=".repeat(60));

  await sql.end();
}

main();
