import { chromium, type Page } from "playwright";
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

const issues: string[] = [];
function log(msg: string) { console.log(msg); }
function note(msg: string) { issues.push(msg); console.log("  ⚠ " + msg); }

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `${SHOTS}/${name}.png`,
    fullPage,
  });
  log(`  📸 ${name}.png`);
}

async function consoleErrors(page: Page, label: string) {
  const errs: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errs.push(msg.text());
  });
  page.on("pageerror", (err) => errs.push(`PAGE ERROR: ${err.message}`));
  return () => {
    for (const e of errs) {
      // Ignore noisy non-issues
      if (e.includes("Failed to load resource") && e.includes("dicebear")) continue;
      note(`[${label}] console: ${e.slice(0, 200)}`);
    }
  };
}

async function wipeAndSeedComplete() {
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NULL, ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;

  for (let i = 0; i < NAMES.length; i++) {
    await sql`INSERT INTO participants ${sql({
      cohort: COHORT,
      participant_id: `pid_test_${i}_${Date.now()}_${Math.random()}`,
      name: NAMES[i],
    })}`;
  }
  await sql`UPDATE sessions SET started_at=NOW() WHERE cohort = ${COHORT}`;

  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT}`;
  for (const p of parts) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "mirror", participant_id: p.participant_id,
      data: { prediction: rand(40, 75), belief: pTrue(0.8) },
    })}`;
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "funnel", participant_id: p.participant_id,
      data: { stage1: pTrue(0.95), stage2: pTrue(0.7), stage3: pTrue(0.5), stage4: pTrue(0.25) },
    })}`;
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "court", participant_id: p.participant_id,
      data: { verdicts: [1,2,3,4,5].map(pid => ({
        pairId: pid,
        vote: pTrue(pid === 3 ? 0.5 : 0.75) ? "greenwash" : "real",
      })) },
    })}`;
  }
  for (let i = 0; i < parts.length; i++) {
    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round: "reflection", participant_id: parts[i].participant_id,
      data: { text: REFLECTIONS[i % REFLECTIONS.length] },
    })}`;
  }
  await sql`UPDATE sessions SET ended_at=NOW(), current_round='complete' WHERE cohort = ${COHORT}`;
  await sql`UPDATE participants SET active=false WHERE cohort = ${COHORT}`;
}

async function wipeOnly() {
  await sql`DELETE FROM responses WHERE cohort = ${COHORT}`;
  await sql`DELETE FROM participants WHERE cohort = ${COHORT}`;
  await sql`UPDATE sessions SET started_at=NULL, ended_at=NULL, current_round='idle', reveal_state='collecting' WHERE cohort = ${COHORT}`;
}

async function setRound(round: string, reveal = "collecting") {
  await sql`UPDATE sessions SET current_round=${round}, reveal_state=${reveal} WHERE cohort = ${COHORT}`;
}

async function startSession() {
  await sql`UPDATE sessions SET started_at=NOW(), current_round='idle' WHERE cohort = ${COHORT}`;
}

async function addParticipants() {
  for (let i = 0; i < NAMES.length; i++) {
    await sql`INSERT INTO participants ${sql({
      cohort: COHORT,
      participant_id: `pid_test_${i}_${Date.now()}_${Math.random()}`,
      name: NAMES[i],
    })}`;
  }
}

async function submitAll(round: "mirror" | "funnel" | "court" | "reflection") {
  const parts = await sql`SELECT participant_id FROM participants WHERE cohort = ${COHORT} AND active = true`;
  for (let i = 0; i < parts.length; i++) {
    let data: unknown;
    if (round === "mirror") data = { prediction: rand(40, 75), belief: pTrue(0.8) };
    else if (round === "funnel") data = { stage1: pTrue(0.95), stage2: pTrue(0.7), stage3: pTrue(0.5), stage4: pTrue(0.25) };
    else if (round === "court") data = { verdicts: [1,2,3,4,5].map(pid => ({
      pairId: pid, vote: pTrue(pid === 3 ? 0.5 : 0.75) ? "greenwash" : "real",
    })) };
    else data = { text: REFLECTIONS[i % REFLECTIONS.length] };

    await sql`INSERT INTO responses ${sql({
      cohort: COHORT, round, participant_id: parts[i].participant_id, data,
    } as Record<string, unknown>)}`;
  }
}

async function endSession() {
  await sql`UPDATE sessions SET ended_at=NOW(), current_round='complete' WHERE cohort = ${COHORT}`;
  await sql`UPDATE participants SET active=false WHERE cohort = ${COHORT}`;
}

async function main() {
  log("Launching Chromium…");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();
  const flush = await consoleErrors(page, "global");

  // ────────────── 1. landing
  log("\n=== /  (landing) ===");
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  const heading = await page.locator("h1").first().textContent();
  log(`  H1: ${heading}`);
  if (heading?.trim() !== "The Action Gap") note(`landing H1 unexpected: ${heading}`);
  await shot(page, "01-landing");

  // ────────────── 2. /control
  log("\n=== /control ===");
  await page.goto(`${BASE}/control`);
  await page.waitForLoadState("networkidle");
  const controlH1 = await page.locator("h1").first().textContent();
  log(`  H1: ${controlH1}`);
  if (!controlH1?.includes("ACTION GAP")) note("control H1 missing");
  const cohortHeadings = await page.locator("section h2").allTextContents();
  log(`  Cohort columns: ${cohortHeadings.join(" | ")}`);
  if (cohortHeadings.length !== 3) note(`expected 3 cohort columns, got ${cohortHeadings.length}`);
  await shot(page, "02-control");

  // ────────────── 3. /dev/seed
  log("\n=== /dev/seed ===");
  await page.goto(`${BASE}/dev/seed`);
  await page.waitForLoadState("networkidle");
  await shot(page, "03-dev-seed");

  // ────────────── 4. final poster (existing complete state)
  log("\n=== /poster/Dolphins (complete) ===");
  await wipeAndSeedComplete();
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // let avatars + canvases settle
  const finalText = await page.textContent("body");
  log(`  has "Session complete": ${finalText?.includes("Session complete")}`);
  log(`  has "Built by:": ${finalText?.includes("Built by:")}`);
  log(`  has "View cohort insights": ${finalText?.includes("View cohort insights")}`);
  if (!finalText?.includes("Session complete")) note("FinalPoster: 'Session complete' not visible");
  if (!finalText?.includes("Built by:")) note("FinalPoster: 'Built by:' footer missing");
  if (!finalText?.includes(NAMES[0])) note("FinalPoster: participant names not in footer");
  await shot(page, "04-poster-complete");

  // ────────────── 5. /insights/Dolphins
  log("\n=== /insights/Dolphins ===");
  await page.goto(`${BASE}/insights/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const insightsText = await page.textContent("body");
  log(`  has "Insights briefing": ${insightsText?.includes("Insights briefing")}`);
  log(`  has "The Gap": ${insightsText?.includes("The Gap")}`);
  log(`  has "Drop-off": ${insightsText?.includes("Drop-off")}`);
  log(`  has "dragons": ${insightsText?.toLowerCase().includes("dragon")}`);
  if (!insightsText?.includes("The Gap")) note("Insights: 'The Gap' panel missing");
  await shot(page, "05-insights");

  // ────────────── 6. modal drill-down
  log("\n=== /insights modal ===");
  const heroButtons = page.locator("button").filter({ hasText: "The Gap" });
  const heroCount = await heroButtons.count();
  log(`  hero panels found: ${heroCount}`);
  if (heroCount > 0) {
    await heroButtons.first().click();
    await page.waitForTimeout(500);
    const modalText = await page.textContent("body");
    log(`  modal opened: ${modalText?.includes("Drill-down") || modalText?.includes("Discussion prompts")}`);
    if (!modalText?.includes("Discussion prompts")) note("Modal: 'Discussion prompts' section missing");
    await shot(page, "06-insights-modal");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    note("Insights: hero clickable not found");
  }

  // ────────────── 7. pre-session
  log("\n=== /poster/Dolphins (not_started) ===");
  await wipeOnly();
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const preText = await page.textContent("body");
  log(`  has "Session starts soon": ${preText?.includes("Session starts soon")}`);
  log(`  has "moves together": ${preText?.includes("moves together")}`);
  if (!preText?.includes("Session starts soon")) note("Pre-session: prompt missing");
  await shot(page, "07-poster-not-started");

  // ────────────── 8. live + idle (QR centered)
  log("\n=== /poster/Dolphins (live + idle) ===");
  await addParticipants();
  await startSession();
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const idleText = await page.textContent("body");
  log(`  has "Scan to join": ${idleText?.includes("Scan to join")}`);
  if (!idleText?.includes("Scan to join")) note("Live+idle: 'Scan to join' missing");
  await shot(page, "08-poster-live-idle");

  // ────────────── 9. mirror collecting
  log("\n=== /poster/Dolphins (mirror collecting) ===");
  await setRound("mirror");
  await submitAll("mirror");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  const mirrorText = await page.textContent("body");
  log(`  has "The Mirror": ${mirrorText?.includes("The Mirror")}`);
  log(`  has counter: ${/\d+ \/ \d+/.test(mirrorText ?? "")}`);
  if (!mirrorText?.includes("The Mirror")) note("Mirror collecting: heading missing");
  await shot(page, "09-poster-mirror-collecting");

  // ────────────── 10. mirror reveal
  log("\n=== /poster/Dolphins (mirror reveal) ===");
  await setRound("mirror", "reveal");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3500); // wait for signature + research insight
  const revealText = await page.textContent("body");
  log(`  has "PREDICTED": ${revealText?.includes("PREDICTED")}`);
  log(`  has "ACTUAL": ${revealText?.includes("ACTUAL")}`);
  log(`  has "Pluralistic ignorance": ${revealText?.includes("Pluralistic ignorance")}`);
  if (!revealText?.includes("PREDICTED") && !revealText?.includes("Predicted")) {
    note("Mirror reveal: predicted/actual layout missing");
  }
  await shot(page, "10-poster-mirror-reveal");

  // ────────────── 11. funnel
  log("\n=== /poster/Dolphins (funnel) ===");
  await setRound("funnel");
  await submitAll("funnel");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  const funnelText = await page.textContent("body");
  log(`  has "THE FUNNEL": ${funnelText?.includes("THE FUNNEL")}`);
  log(`  has "Concerned": ${funnelText?.includes("Concerned")}`);
  if (!funnelText?.includes("THE FUNNEL")) note("Funnel: heading missing");
  await shot(page, "11-poster-funnel");

  // ────────────── 12. court reveal
  log("\n=== /poster/Dolphins (court reveal) ===");
  await setRound("court");
  await submitAll("court");
  await setRound("court", "reveal");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3500);
  const courtText = await page.textContent("body");
  log(`  has "THE COURT": ${courtText?.includes("THE COURT")}`);
  log(`  has BP: ${courtText?.includes("BP")}`);
  if (!courtText?.includes("THE COURT")) note("Court: heading missing");
  await shot(page, "12-poster-court-reveal");

  // ────────────── 13. reflection
  log("\n=== /poster/Dolphins (reflection) ===");
  await setRound("reflection");
  await submitAll("reflection");
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3500);
  const refText = await page.textContent("body");
  log(`  has "REFLECTION": ${refText?.includes("REFLECTION")}`);
  log(`  has "dragons we": ${refText?.toLowerCase().includes("dragons we")}`);
  if (!refText?.includes("REFLECTION")) note("Reflection: heading missing");
  await shot(page, "13-poster-reflection");

  // ────────────── 14. complete after journey
  log("\n=== /poster/Dolphins (complete after journey) ===");
  await endSession();
  await page.goto(`${BASE}/poster/Dolphins`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await shot(page, "14-poster-complete-after-journey");

  // ────────────── 15. phone join screen
  log("\n=== /phone/Dolphins (join) ===");
  await wipeOnly();
  // Use a fresh browser context so localStorage is clean
  const phoneCtx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
  });
  const phonePage = await phoneCtx.newPage();
  await phonePage.goto(`${BASE}/phone/Dolphins`);
  await phonePage.waitForLoadState("networkidle");
  await phonePage.waitForTimeout(800);
  const joinText = await phonePage.textContent("body");
  log(`  has "Welcome to the Dolphins": ${joinText?.includes("Welcome to the Dolphins")}`);
  log(`  has "first name": ${joinText?.includes("first name")}`);
  if (!joinText?.includes("Welcome to the Dolphins")) note("Phone join: welcome heading missing");
  await phonePage.screenshot({ path: `${SHOTS}/15-phone-join.png`, fullPage: true });
  log(`  📸 15-phone-join.png`);

  // type a name + submit
  const input = phonePage.locator('input[type="text"]').first();
  await input.fill("rishi");
  await phonePage.screenshot({ path: `${SHOTS}/16-phone-typed.png` });
  log(`  📸 16-phone-typed.png`);
  await phonePage.locator("button", { hasText: "Join the Dolphins" }).click();
  await phonePage.waitForTimeout(1500);
  const joinedText = await phonePage.textContent("body");
  log(`  has "You're in": ${joinedText?.includes("You")}`);
  log(`  has normalized "Rishi": ${joinedText?.includes("Rishi")}`);
  if (!joinedText?.includes("Rishi")) note("Phone join: name not normalized to 'Rishi'");
  await phonePage.screenshot({ path: `${SHOTS}/17-phone-waiting-room.png` });
  log(`  📸 17-phone-waiting-room.png`);

  // round intro overlay test
  await startSession();
  await setRound("mirror");
  await phonePage.waitForTimeout(1500);
  const intro = await phonePage.textContent("body");
  log(`  intro overlay: has "CHECKPOINT": ${intro?.includes("CHECKPOINT")}`);
  await phonePage.screenshot({ path: `${SHOTS}/18-phone-mirror-intro.png` });
  log(`  📸 18-phone-mirror-intro.png`);
  await phonePage.waitForTimeout(2200);
  await phonePage.screenshot({ path: `${SHOTS}/19-phone-mirror-prediction.png` });
  log(`  📸 19-phone-mirror-prediction.png`);

  await phoneCtx.close();
  flush();

  log("\n" + "=".repeat(60));
  log(`ISSUES FOUND: ${issues.length}`);
  for (const i of issues) log(`  ⚠ ${i}`);
  log("=".repeat(60));

  await browser.close();
  await sql.end();
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
