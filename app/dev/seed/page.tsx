"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getTheme } from "@/lib/theme";

const COHORTS = ["Dolphins", "Foxes", "Elephants"] as const;
type Cohort = (typeof COHORTS)[number];

const ROUNDS = ["idle", "mirror", "funnel", "court", "reflection", "complete"] as const;
const REVEAL_STATES = ["collecting", "reveal", "locked"] as const;

const NAMES = [
  "Sara", "Marcus", "Lena", "Pavel", "Eva",
  "Karim", "Ines", "Tomas", "Ada", "Noah",
];

const REFLECTION_TEXTS = [
  "I'll stop pretending recycling is enough.",
  "I keep waiting for someone else.",
  "The boss's plane bothers me more now.",
  "I've been my own dragon.",
  "It's not the data, it's the dissonance.",
  "Comfort is the loudest excuse.",
  "Action follows admission.",
  "I underestimated the room.",
  "The gap is in me, not them.",
  "Climate is a relationship problem.",
];

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";
const HAIRLINE = "#3A3835";
const GREEN = "#5BA89D";
const BLUE = "#3D8FCB";
const CLAY = "#C66B5C";

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedTrue(p: number): boolean {
  return Math.random() < p;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMirrorData() {
  return { prediction: rand(30, 90), belief: weightedTrue(0.7) };
}

function generateFunnelData() {
  return {
    stage1: weightedTrue(0.9),
    stage2: weightedTrue(0.75),
    stage3: weightedTrue(0.5),
    stage4: weightedTrue(0.2),
  };
}

const COURT_GREENWASH_WEIGHT: Record<number, number> = {
  1: 0.75, 2: 0.75, 3: 0.5, 4: 0.75, 5: 0.75,
};

function generateCourtData() {
  return {
    verdicts: [1, 2, 3, 4, 5].map((pairId) => ({
      pairId,
      vote: weightedTrue(COURT_GREENWASH_WEIGHT[pairId]) ? "greenwash" : "real",
    })),
  };
}

function generateReflectionData() {
  return { text: pickRandom(REFLECTION_TEXTS) };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ParticipantRow = {
  participant_id: string;
  cohort: string;
  name: string;
  active: boolean;
};

async function addParticipants(cohort: Cohort, count: number) {
  const { data: existing } = await supabase
    .from("participants")
    .select("name")
    .eq("cohort", cohort);
  const used = new Set((existing ?? []).map((p) => p.name));
  const available = NAMES.filter((n) => !used.has(n));
  const toAdd: { cohort: string; participant_id: string; name: string }[] = [];
  for (let i = 0; i < Math.min(count, available.length); i++) {
    toAdd.push({
      cohort,
      participant_id: `pid_${crypto.randomUUID()}`,
      name: available[i],
    });
  }
  if (toAdd.length) {
    await supabase.from("participants").insert(toAdd);
  }
  return toAdd.length;
}

async function fetchActiveParticipants(cohort: Cohort) {
  const { data } = await supabase
    .from("participants")
    .select("participant_id")
    .eq("cohort", cohort)
    .eq("active", true);
  return (data ?? []) as { participant_id: string }[];
}

async function submitForAll(
  cohort: Cohort,
  round: "mirror" | "funnel" | "court" | "reflection",
  generator: () => unknown
) {
  const parts = await fetchActiveParticipants(cohort);
  if (!parts.length) return 0;
  const rows = parts.map((p) => ({
    cohort,
    round,
    participant_id: p.participant_id,
    data: generator(),
  }));
  await supabase.from("responses").upsert(rows, {
    onConflict: "cohort,round,participant_id",
    ignoreDuplicates: true,
  });
  return rows.length;
}

async function startSession(cohort: Cohort) {
  const iso = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ started_at: iso, updated_at: iso })
    .eq("cohort", cohort);
}

async function endSession(cohort: Cohort) {
  const iso = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ ended_at: iso, current_round: "complete", updated_at: iso })
    .eq("cohort", cohort);
  await supabase
    .from("participants")
    .update({ active: false })
    .eq("cohort", cohort);
}

async function resetSession(cohort: Cohort) {
  const iso = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({
      started_at: null,
      ended_at: null,
      current_round: "idle",
      reveal_state: "collecting",
      updated_at: iso,
    })
    .eq("cohort", cohort);
  await supabase.from("responses").delete().eq("cohort", cohort);
}

async function setRound(cohort: Cohort, round: string) {
  const iso = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({
      current_round: round,
      reveal_state: "collecting",
      updated_at: iso,
    })
    .eq("cohort", cohort);
}

async function setRevealState(cohort: Cohort, state: string) {
  const iso = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ reveal_state: state, updated_at: iso })
    .eq("cohort", cohort);
}

async function wipeCohort(cohort: Cohort) {
  await supabase.from("responses").delete().eq("cohort", cohort);
  await supabase.from("participants").delete().eq("cohort", cohort);
  await supabase
    .from("sessions")
    .update({
      started_at: null,
      ended_at: null,
      current_round: "idle",
      reveal_state: "collecting",
      updated_at: new Date().toISOString(),
    })
    .eq("cohort", cohort);
}

async function autoPlay(cohort: Cohort, log: (msg: string) => void) {
  log(`[${cohort}] adding 5 participants`);
  await addParticipants(cohort, 5);
  await sleep(300);

  log(`[${cohort}] starting session`);
  await startSession(cohort);
  await sleep(300);

  log(`[${cohort}] round → mirror`);
  await setRound(cohort, "mirror");
  await sleep(400);
  await submitForAll(cohort, "mirror", generateMirrorData);
  await sleep(400);
  await setRevealState(cohort, "reveal");
  await sleep(1000);

  log(`[${cohort}] round → funnel`);
  await setRound(cohort, "funnel");
  await sleep(400);
  await submitForAll(cohort, "funnel", generateFunnelData);
  await sleep(1000);

  log(`[${cohort}] round → court`);
  await setRound(cohort, "court");
  await sleep(400);
  await submitForAll(cohort, "court", generateCourtData);
  await sleep(400);
  await setRevealState(cohort, "reveal");
  await sleep(1000);

  log(`[${cohort}] round → reflection`);
  await setRound(cohort, "reflection");
  await sleep(400);
  await submitForAll(cohort, "reflection", generateReflectionData);
  await sleep(1000);

  log(`[${cohort}] ending`);
  await endSession(cohort);
  log(`[${cohort}] done.`);
}

export default function DevSeedPage() {
  if (process.env.NODE_ENV !== "development") {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: INK, color: BONE }}
      >
        <p className="text-sm" style={{ color: ASH }}>
          Not available in production.
        </p>
      </main>
    );
  }
  return <DevSeedInner />;
}

function DevSeedInner() {
  const [sessions, setSessions] = useState<Record<string, SessionRow>>({});
  const [participants, setParticipants] = useState<Record<string, ParticipantRow[]>>({});
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [logLines, setLogLines] = useState<string[]>([]);

  const log = useCallback((msg: string) => {
    const line = `${new Date().toLocaleTimeString()} ${msg}`;
    console.log(line);
    setLogLines((prev) => [...prev.slice(-50), line]);
  }, []);

  const fetchData = useCallback(async () => {
    const [sessRes, partRes, respRes] = await Promise.all([
      supabase.from("sessions").select("*").in("cohort", [...COHORTS]),
      supabase.from("participants").select("*").in("cohort", [...COHORTS]),
      supabase.from("responses").select("cohort").in("cohort", [...COHORTS]),
    ]);
    const s: Record<string, SessionRow> = {};
    for (const row of (sessRes.data ?? []) as SessionRow[]) s[row.cohort] = row;
    setSessions(s);

    const p: Record<string, ParticipantRow[]> = {};
    for (const row of (partRes.data ?? []) as ParticipantRow[]) {
      (p[row.cohort] ??= []).push(row);
    }
    setParticipants(p);

    const r: Record<string, number> = {};
    for (const row of (respRes.data ?? []) as { cohort: string }[]) {
      r[row.cohort] = (r[row.cohort] ?? 0) + 1;
    }
    setResponses(r);
  }, []);

  useEffect(() => {
    fetchData();
    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`dev-seed-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "responses" }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  async function wipeAll() {
    if (!confirm("Wipe ALL 3 cohorts? This deletes participants and responses for all cohorts.")) return;
    log("[ALL] wiping all 3 cohorts");
    for (const c of COHORTS) await wipeCohort(c);
    log("[ALL] wipe complete");
  }

  async function autoPlayAll() {
    log("[ALL] auto-playing all 3 cohorts sequentially");
    for (const c of COHORTS) {
      await autoPlay(c, log);
      await sleep(5000);
    }
    log("[ALL] all done");
  }

  return (
    <main
      className="min-h-screen w-full px-6 py-6 font-mono"
      style={{ backgroundColor: INK, color: BONE }}
    >
      <header className="mb-6 border-b pb-4" style={{ borderColor: HAIRLINE }}>
        <h1 className="text-2xl font-bold tracking-widest">DEV · SEED &amp; TEST</h1>
        <p className="mt-2 text-sm" style={{ color: ASH }}>
          Simulates audience activity for dry runs. All operations write directly to the live Supabase tables.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COHORTS.map((cohort) => (
          <CohortPanel
            key={cohort}
            cohort={cohort}
            session={sessions[cohort]}
            participants={participants[cohort] ?? []}
            responseCount={responses[cohort] ?? 0}
            log={log}
          />
        ))}
      </div>

      <div className="mt-8 border-t pt-4" style={{ borderColor: HAIRLINE }}>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest" style={{ color: ASH }}>
          Global controls
        </h2>
        <div className="flex flex-wrap gap-3">
          <DangerButton onClick={wipeAll}>Wipe all 3 cohorts</DangerButton>
          <ActionButton onClick={autoPlayAll}>🚀 Auto-play all 3 cohorts sequentially</ActionButton>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-widest" style={{ color: ASH }}>
          Log
        </h2>
        <div
          className="h-48 overflow-y-auto rounded-md border p-3 text-xs"
          style={{ borderColor: HAIRLINE, backgroundColor: "#15110F" }}
        >
          {logLines.length === 0 ? (
            <p className="italic" style={{ color: ASH }}>
              No actions yet.
            </p>
          ) : (
            logLines.map((line, i) => (
              <div key={i} style={{ color: BONE }}>
                {line}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function CohortPanel({
  cohort,
  session,
  participants,
  responseCount,
  log,
}: {
  cohort: Cohort;
  session?: SessionRow;
  participants: ParticipantRow[];
  responseCount: number;
  log: (msg: string) => void;
}) {
  const cohortColor = getTheme(cohort).primary;
  const round = session?.current_round ?? "idle";
  const reveal = session?.reveal_state ?? "collecting";
  const status =
    !session || !session.started_at
      ? "not_started"
      : !session.ended_at
        ? "live"
        : "ended";
  const activeCount = useMemo(
    () => participants.filter((p) => p.active).length,
    [participants]
  );

  async function run(name: string, fn: () => Promise<unknown>) {
    log(`[${cohort}] ${name}...`);
    try {
      const result = await fn();
      log(`[${cohort}] ${name} done${result !== undefined ? ` (${result})` : ""}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[${cohort}] ${name} FAILED: ${msg}`);
    }
  }

  async function wipeWithConfirm() {
    if (!confirm(`Wipe ALL data for ${cohort}? This deletes participants AND responses.`)) return;
    await run("wipe", () => wipeCohort(cohort));
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-md border p-4"
      style={{ borderColor: HAIRLINE, backgroundColor: "#15110F" }}
    >
      <h2 className="text-2xl font-bold uppercase tracking-wider" style={{ color: cohortColor }}>
        {cohort}
      </h2>

      <div className="text-xs leading-relaxed" style={{ color: ASH }}>
        Round: <span style={{ color: BONE }}>{round}</span> · Status:{" "}
        <span style={{ color: BONE }}>{status}</span> · State:{" "}
        <span style={{ color: BONE }}>{reveal}</span>
        <br />
        Participants: <span style={{ color: BONE }}>{activeCount}</span> active /{" "}
        <span style={{ color: BONE }}>{participants.length}</span> total · Responses:{" "}
        <span style={{ color: BONE }}>{responseCount}</span>
      </div>

      <Group label="Add participants">
        <ActionButton onClick={() => run("add 3 participants", () => addParticipants(cohort, 3))}>
          + Add 3
        </ActionButton>
        <ActionButton onClick={() => run("add 5 participants", () => addParticipants(cohort, 5))}>
          + Add 5
        </ActionButton>
      </Group>

      <Group label="Submit responses">
        <ActionButton
          onClick={() =>
            run("submit Mirror", () => submitForAll(cohort, "mirror", generateMirrorData))
          }
        >
          Mirror
        </ActionButton>
        <ActionButton
          onClick={() =>
            run("submit Funnel", () => submitForAll(cohort, "funnel", generateFunnelData))
          }
        >
          Funnel
        </ActionButton>
        <ActionButton
          onClick={() =>
            run("submit Court", () => submitForAll(cohort, "court", generateCourtData))
          }
        >
          Court
        </ActionButton>
        <ActionButton
          onClick={() =>
            run("submit Reflection", () =>
              submitForAll(cohort, "reflection", generateReflectionData)
            )
          }
        >
          Reflection
        </ActionButton>
      </Group>

      <Group label="Lifecycle">
        <StateButton onClick={() => run("start session", () => startSession(cohort))}>
          Start
        </StateButton>
        <StateButton onClick={() => run("end session", () => endSession(cohort))}>
          End
        </StateButton>
        <StateButton onClick={() => run("reset session", () => resetSession(cohort))}>
          Reset
        </StateButton>
      </Group>

      <Group label="Round">
        {ROUNDS.map((r) => (
          <StateButton
            key={r}
            active={round === r}
            cohortColor={cohortColor}
            onClick={() => run(`set round = ${r}`, () => setRound(cohort, r))}
          >
            {r}
          </StateButton>
        ))}
      </Group>

      <Group label="Reveal state">
        {REVEAL_STATES.map((s) => (
          <StateButton
            key={s}
            active={reveal === s}
            cohortColor={cohortColor}
            onClick={() => run(`set state = ${s}`, () => setRevealState(cohort, s))}
          >
            {s}
          </StateButton>
        ))}
      </Group>

      <Group label="One-shot">
        <ActionButton onClick={() => autoPlay(cohort, log)}>
          🚀 Auto-play full session
        </ActionButton>
      </Group>

      <Group label="Nuke">
        <DangerButton onClick={wipeWithConfirm}>Wipe all data</DangerButton>
      </Group>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mb-1 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: ASH }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-95"
      style={{ borderColor: GREEN, color: GREEN }}
    >
      {children}
    </button>
  );
}

function StateButton({
  onClick,
  children,
  active,
  cohortColor,
}: {
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  cohortColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-95"
      style={{
        borderColor: active && cohortColor ? cohortColor : BLUE,
        color: active && cohortColor ? cohortColor : BLUE,
      }}
    >
      {children}
    </button>
  );
}

function DangerButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 active:scale-95"
      style={{ borderColor: CLAY, color: CLAY }}
    >
      {children}
    </button>
  );
}
