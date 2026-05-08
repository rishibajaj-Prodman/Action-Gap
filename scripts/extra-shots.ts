import { chromium } from "playwright";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, { ssl: "require" });
const COHORT = "Dolphins";
const BASE = "http://localhost:3000";
const SHOTS = "./screenshots";

const NAMES = ["Sara", "Marcus", "Lena", "Pavel", "Eva"];
const REFLECTIONS = [
  "I'll stop pretending recycling is enough.",
  "Comfort is the loudest excuse.",
  "The boss's plane bothers me more now.",
  "I've been my own dragon, my own excuse.",
  "Climate is a relationship problem, not a data problem.",
];

function pTrue(p: number) { return Math.random() < p; }
function rand(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }

async function reset() {
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NOW(), ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  for (let i = 0; i < NAMES.length; i++) {
    await sql`INSERT INTO participants ${sql({
      cohort: COHORT,
      participant_id: `pid_extra_${i}_${Date.now()}_${Math.random()}`,
      name: NAMES[i],
    })}`;
  }
}
async function setRound(round: string, reveal = "collecting") {
  await sql`UPDATE sessions SET current_round=${round}, reveal_state=${reveal} WHERE cohort = ${COHORT}`;
}
async function submitPartial(round: string, n: number) {
  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT} AND active = true ORDER BY joined_at LIMIT ${n}`;
  for (let i = 0; i < parts.length; i++) {
    let data: unknown;
    if (round === "mirror") data = { prediction: rand(40, 75), belief: pTrue(0.8) };
    else if (round === "funnel") data = { stage1: pTrue(0.95), stage2: pTrue(0.7), stage3: pTrue(0.5), stage4: pTrue(0.25) };
    else if (round === "court") data = { verdicts: [1,2,3,4,5].map(pid => ({ pairId: pid, vote: pTrue(0.6) ? "greenwash" : "real" })) };
    else data = { text: REFLECTIONS[i % REFLECTIONS.length] };
    await sql`INSERT INTO responses ${sql({ cohort: COHORT, round, participant_id: parts[i].participant_id, data } as Record<string, unknown>)}`;
  }
}
async function submitAll(round: string) {
  await submitPartial(round, 999);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // Court collecting — partial (3 of 5)
  await reset();
  await setRound("court");
  await submitPartial("court", 3);
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/EXTRA-court-collecting.png`, fullPage: true });
  console.log("📸 EXTRA-court-collecting.png");

  // Court collecting — everyone in (full reset)
  await reset();
  await setRound("court");
  await submitAll("court");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/EXTRA-court-collecting-allin.png`, fullPage: true });
  console.log("📸 EXTRA-court-collecting-allin.png");

  // Reflection reveal — verify new Signature
  await reset();
  await setRound("reflection");
  await submitAll("reflection");
  await setRound("reflection", "reveal");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(4000); // dragon flies + signature + insight
  await page.screenshot({ path: `${SHOTS}/EXTRA-reflection-reveal.png`, fullPage: true });
  console.log("📸 EXTRA-reflection-reveal.png");

  // Funnel collecting — partial submissions to see waiting-for animation
  await reset();
  await setRound("funnel");
  await submitPartial("funnel", 2);
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/EXTRA-funnel-waiting.png`, fullPage: true });
  console.log("📸 EXTRA-funnel-waiting.png");

  await browser.close();
  await sql.end();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
