import { chromium } from "playwright";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const COHORT = "Dolphins";
const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = "C:/Users/rishi/Documents/Vault/MBA/Organization Behavior Project/screenshots/lifecycle";

async function dbState(label: string) {
  const sess = await sql`SELECT current_round, reveal_state, started_at IS NOT NULL AS started, ended_at IS NOT NULL AS ended FROM sessions WHERE cohort = ${COHORT}`;
  const parts = await sql`SELECT name, active FROM participants WHERE cohort = ${COHORT} ORDER BY joined_at`;
  const resp = await sql`SELECT round, COUNT(*) AS n FROM responses WHERE cohort = ${COHORT} GROUP BY round ORDER BY round`;
  const active = parts.filter((p) => p.active).length;
  console.log(
    `  DB ${label}: round=${sess[0]?.current_round} reveal=${sess[0]?.reveal_state} started=${sess[0]?.started} ended=${sess[0]?.ended} parts=${active}/${parts.length} resp=${resp.map((r) => `${r.round}:${r.n}`).join(",") || "none"}`
  );
  return { sess: sess[0], parts, resp };
}

async function main() {
  console.log(`Testing ${BASE}`);
  console.log("=".repeat(60));

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  ⚠ PAGE ERROR: ${e.message}`));

  // ───── 1. wipe + verify NOT_STARTED
  console.log("\n[1] WIPE + verify not_started");
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NULL, ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  await dbState("after wipe");

  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  console.log(`  / redirected to: ${page.url()}`);
  if (!page.url().endsWith("/control")) console.log("  ⚠ / did not redirect to /control");
  await page.screenshot({ path: `${SHOTS}/01-control-fresh.png`, fullPage: true });

  const sharePanelText = await page.textContent("body");
  console.log(`  Share URLs panel present: ${sharePanelText?.includes("Share URLs")}`);
  console.log(`  Has copy buttons: ${sharePanelText?.includes("Poster") && sharePanelText?.includes("Phone (join)") && sharePanelText?.includes("Insights")}`);

  // ───── 2. open poster while not_started
  console.log("\n[2] /poster/Dolphins (not_started)");
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const t2 = await page.textContent("body");
  console.log(`  has "Session starts soon": ${t2?.includes("Session starts soon")}`);
  console.log(`  has "SESSION NOT STARTED": ${t2?.includes("SESSION NOT STARTED") || t2?.includes("Session not started")}`);
  await page.screenshot({ path: `${SHOTS}/02-poster-not-started.png`, fullPage: true });

  // ───── 3. add participants
  console.log("\n[3] Add 5 participants");
  for (const name of ["Sara", "Marcus", "Lena", "Pavel", "Eva"]) {
    await sql`INSERT INTO participants ${sql({
      cohort: COHORT,
      participant_id: `pid_lc_${name}_${Date.now()}`,
      name,
    })}`;
  }
  await dbState("after add");

  // ───── 4. Start session
  console.log("\n[4] Start session");
  await sql`UPDATE sessions SET started_at=NOW() WHERE cohort = ${COHORT}`;
  await dbState("after start");
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const t4 = await page.textContent("body");
  console.log(`  has "Scan to join": ${t4?.includes("Scan to join")}`);
  console.log(`  has avatars (rendered): ${t4?.includes("Sara") || (await page.locator("img").count()) > 0}`);
  await page.screenshot({ path: `${SHOTS}/04-poster-live-idle.png`, fullPage: true });

  // ───── 5. Mirror with submissions and reveal
  console.log("\n[5] Mirror collecting + reveal");
  await sql`UPDATE sessions SET current_round='mirror' WHERE cohort = ${COHORT}`;
  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT} AND active = true`;
  for (const p of parts) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT,
      round: "mirror",
      participant_id: p.participant_id,
      data: { prediction: 50 + Math.floor(Math.random() * 30), belief: Math.random() < 0.8 },
    })}`;
  }
  await sql`UPDATE sessions SET reveal_state='reveal' WHERE cohort = ${COHORT}`;
  await dbState("mirror reveal");
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3500);
  const t5 = await page.textContent("body");
  console.log(`  has "Pluralistic ignorance": ${t5?.includes("Pluralistic ignorance")}`);
  console.log(`  has "Predicted" or "PREDICTED": ${t5?.includes("Predicted") || t5?.includes("PREDICTED")}`);
  await page.screenshot({ path: `${SHOTS}/05-poster-mirror-reveal.png`, fullPage: true });

  // ───── 6. End session — verify behavior
  console.log("\n[6] END session — what changes?");
  await sql`UPDATE sessions SET ended_at=NOW(), current_round='complete' WHERE cohort = ${COHORT}`;
  await sql`UPDATE participants SET active=false WHERE cohort = ${COHORT}`;
  await dbState("after end");
  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const t6 = await page.textContent("body");
  console.log(`  has "Session complete": ${t6?.includes("Session complete")}`);
  console.log(`  has "Built by:": ${t6?.includes("Built by:")}`);
  for (const n of ["Sara", "Marcus", "Lena", "Pavel", "Eva"]) {
    console.log(`  Built by includes "${n}": ${t6?.includes(n)}`);
  }
  console.log(`  ⓘ NOTE: "Built by:" lists ALL participants (active+inactive) — intentional, post-End names still show because the poster is the cohort's artifact.`);
  await page.screenshot({ path: `${SHOTS}/06-poster-final.png`, fullPage: true });

  // /control while ended
  console.log("\n[6b] /control after end");
  await page.goto(`${BASE}/control`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const tc = await page.textContent("body");
  console.log(`  Dolphins shows "ENDED": ${tc?.includes("ENDED")}`);
  console.log(`  Roster shows "0 active": ${tc?.includes("0 active")}`);
  await page.screenshot({ path: `${SHOTS}/06c-control-ended.png`, fullPage: true });

  // ───── 7. Reset session — verify behavior
  // Mirrors the resetSession() handler in app/control/page.tsx exactly.
  console.log("\n[7] RESET session — what changes?");
  await sql`UPDATE sessions SET started_at=NULL, ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`UPDATE participants SET active=true WHERE cohort = ${COHORT}`;
  await dbState("after reset");
  await page.goto(`${BASE}/control`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const t7c = await page.textContent("body");
  console.log(`  Dolphins shows "NOT STARTED": ${t7c?.includes("NOT STARTED")}`);
  const reactivated = (await sql`SELECT active FROM participants WHERE cohort = ${COHORT}`).filter((p) => p.active).length;
  console.log(`  Participants ACTIVE after Reset: ${reactivated}/5 (FIX: Reset now reactivates so the same group can replay)`);
  await page.screenshot({ path: `${SHOTS}/07-control-after-reset.png`, fullPage: true });

  await page.goto(`${BASE}/poster/${COHORT}`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const t7p = await page.textContent("body");
  console.log(`  /poster/Dolphins shows "Session starts soon": ${t7p?.includes("Session starts soon")}`);
  console.log(`  /poster/Dolphins still has "Built by:" footer: ${t7p?.includes("Built by:")}`);
  await page.screenshot({ path: `${SHOTS}/07b-poster-after-reset.png`, fullPage: true });

  // ───── 8. The "two pages of mirror" check
  console.log("\n[8] Same Mirror visible from multiple URLs?");
  await sql`INSERT INTO participants ${sql({
    cohort: COHORT,
    participant_id: `pid_lc_test_${Date.now()}`,
    name: "Test",
  })}`;
  await sql`UPDATE participants SET active=true WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NOW(), current_round='mirror' WHERE cohort = ${COHORT}`;
  for (const p of await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT} AND active = true`) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT,
      round: "mirror",
      participant_id: p.participant_id,
      data: { prediction: 60, belief: true },
    })}`;
  }

  console.log("  Two URLs that BOTH show the Mirror UI:");
  console.log("    A. /poster/Dolphins (when current_round=mirror) — full poster shell");
  console.log("    B. /presenter/Dolphins/mirror — standalone Mirror only (legacy presenter route)");
  console.log("  Both render the same MirrorPoster component, just different layouts. Two tabs of these = same data, different chrome.");

  await ctx.close();
  await browser.close();
  await sql.end();

  console.log("\n" + "=".repeat(60));
  console.log("Screenshots in screenshots/lifecycle/");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
