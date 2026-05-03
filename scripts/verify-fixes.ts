import { chromium } from "playwright";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const COHORT = "Dolphins";
const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = "C:/Users/rishi/Documents/Vault/MBA/Organization Behavior Project/screenshots/fixes";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // Setup: Dolphins live with mirror collecting + 5 participants + responses
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NOW(), ended_at=NULL, current_round='mirror', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  for (const name of ["Sara", "Marcus", "Lena", "Pavel", "Eva"]) {
    await sql`INSERT INTO participants ${sql({
      cohort: COHORT,
      participant_id: `pid_vf_${name}_${Date.now()}`,
      name,
    })}`;
  }
  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT} AND active = true`;
  for (const p of parts) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "mirror", participant_id: p.participant_id,
      data: { prediction: 60, belief: true },
    })}`;
  }

  // 1. Mirror collecting — status pill should say "● Collecting · 5 / 5"
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  const t1 = await page.textContent("body");
  console.log(`[Mirror collecting] pill says "Collecting · 5 / 5": ${t1?.includes("Collecting · 5 / 5")}`);
  await page.screenshot({ path: `${SHOTS}/01-mirror-collecting-pill.png` });

  // 2. Mirror reveal — pill should say "● Revealed"
  await sql`UPDATE sessions SET reveal_state='reveal' WHERE cohort = ${COHORT}`;
  await page.waitForTimeout(2000);
  const t2 = await page.textContent("body");
  console.log(`[Mirror reveal] pill says "Revealed": ${t2?.includes("● Revealed")}`);
  await page.screenshot({ path: `${SHOTS}/02-mirror-reveal-pill.png` });

  // 3. Court collecting (set up court state with simpler quotes)
  await sql`UPDATE sessions SET current_round='court', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  for (const p of parts) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "court", participant_id: p.participant_id,
      data: { verdicts: [
        { pairId: 1, vote: "greenwash" },
        { pairId: 2, vote: "greenwash" },
        { pairId: 3, vote: "real" },
        { pairId: 4, vote: "greenwash" },
        { pairId: 5, vote: "greenwash" },
      ]},
    })}`;
  }
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  const t3 = await page.textContent("body");
  console.log(`[Court collecting] simpler BP quote present: ${t3?.includes("scrapped the 40% cut")}`);
  console.log(`[Court collecting] no jargon "Verbund": ${!t3?.includes("Verbund")}`);
  console.log(`[Court collecting] no jargon "Carbon Border Adjustment": ${!t3?.includes("Carbon Border Adjustment")}`);
  console.log(`[Court collecting] pill says "Collecting · 5 / 5": ${t3?.includes("Collecting · 5 / 5")}`);
  await page.screenshot({ path: `${SHOTS}/03-court-collecting-pill.png` });

  // 4. Phone — show your-avatar badge in waiting state
  // First reset, add 1 participant via UI flow
  await sql`UPDATE sessions SET started_at=NOW(), ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  await sql`UPDATE participants SET active=false WHERE cohort = ${COHORT}`;

  const phoneCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const phone = await phoneCtx.newPage();
  await phone.goto(`${BASE}/phone/${COHORT}`);
  await phone.waitForLoadState("networkidle");
  await phone.waitForTimeout(800);
  const input = phone.locator('input[type="text"]').first();
  await input.fill("rishi");
  await phone.locator("button", { hasText: "Join the Dolphins" }).click();
  await phone.waitForTimeout(2000);
  const phoneText = await phone.textContent("body");
  console.log(`[Phone after join] your-avatar badge with name: ${phoneText?.includes("Rishi")}`);
  await phone.screenshot({ path: `${SHOTS}/04-phone-self-avatar.png` });

  // 5. Phone reveal flash — listen during a reveal transition
  // Set round to mirror so phone shows mirror UI
  await sql`UPDATE sessions SET current_round='mirror', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  await phone.waitForTimeout(2500); // round-intro animation finishes
  // Submit the mirror to put phone into "Submitted." waiting state
  // (Avoid clicking — easier to just stay here and trigger reveal)
  await sql`UPDATE sessions SET reveal_state='reveal' WHERE cohort = ${COHORT}`;
  await phone.waitForTimeout(800); // wait for flash to fire
  const flashText = await phone.textContent("body");
  console.log(`[Phone reveal flash] shows "Result revealed": ${flashText?.includes("Result revealed")}`);
  console.log(`[Phone reveal flash] shows "Watch the screen": ${flashText?.includes("Watch the screen")}`);
  await phone.screenshot({ path: `${SHOTS}/05-phone-reveal-flash.png` });

  await phoneCtx.close();
  await ctx.close();
  await browser.close();
  await sql.end();

  console.log("\nScreenshots in screenshots/fixes/");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
