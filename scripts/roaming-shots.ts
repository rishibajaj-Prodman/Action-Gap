import { chromium } from "playwright";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, { ssl: "require" });
const BASE = "http://localhost:3000";
const SHOTS = "./screenshots";

const NAMES = ["Sara", "Marcus", "Lena", "Pavel", "Eva"];

async function reset(cohort: string) {
  await sql`DELETE FROM responses WHERE cohort = ${cohort}`;
  await sql`DELETE FROM participants WHERE cohort = ${cohort}`;
  await sql`UPDATE sessions SET started_at=NOW(), ended_at=NULL, current_round='funnel', reveal_state='collecting' WHERE cohort = ${cohort}`;
  for (let i = 0; i < NAMES.length; i++) {
    await sql`INSERT INTO participants ${sql({
      cohort,
      participant_id: `pid_roam_${i}_${Date.now()}_${Math.random()}`,
      name: NAMES[i],
    })}`;
  }
  // Drop in 2 partial submissions so the screen has a non-trivial counter + waiting list
  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${cohort} AND active = true ORDER BY joined_at LIMIT 2`;
  for (const p of parts) {
    await sql`INSERT INTO responses ${sql({
      cohort, round: "funnel", participant_id: p.participant_id,
      data: { stage1: true, stage2: true, stage3: false, stage4: false },
    })}`;
  }
}

async function captureSequence(
  page: import("playwright").Page,
  cohort: string,
  delays: number[],
  prefix: string,
) {
  await reset(cohort);
  await page.goto(`${BASE}/poster/${cohort}`);
  await page.waitForLoadState("networkidle");
  // wait for initial mount + first paint
  await page.waitForTimeout(1500);

  let elapsed = 0;
  for (let i = 0; i < delays.length; i++) {
    const wait = delays[i] - elapsed;
    if (wait > 0) await page.waitForTimeout(wait);
    elapsed = delays[i];
    const path = `${SHOTS}/ROAM-${prefix}-${String(i + 1).padStart(2, "0")}-t${delays[i]}ms.png`;
    await page.screenshot({ path, fullPage: true });
    console.log(`📸 ${path}`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // Dolphin: 9s loop. Sample at peak (≈2.25s), zero-cross descending (≈4.5s), trough (≈6.75s)
  await captureSequence(page, "Dolphins", [2250, 4500, 6750, 8500], "dolphin");

  // Fox: 9s loop. Sample mid-dart, mid-pause-with-tilt, second dart, end-pose
  await captureSequence(page, "Foxes", [800, 2500, 4500, 6500], "fox");

  // Elephant: 16s walk. Sample early, mid, late, near-edge
  await captureSequence(page, "Elephants", [3000, 7000, 11000, 14500], "elephant");

  await browser.close();
  await sql.end();
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
