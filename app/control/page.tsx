"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { getTheme } from "@/lib/theme";

const COHORTS = ["Dolphins", "Foxes", "Elephants"] as const;
type Cohort = (typeof COHORTS)[number];

const ROUND_KEYS = ["idle", "mirror", "funnel", "court", "reflection"] as const;
const ROUND_LABEL: Record<string, string> = {
  idle: "Idle",
  mirror: "Mirror",
  funnel: "Funnel",
  court: "Court",
  reflection: "Reflection",
};

const TEAL = "#5BA89D";
const ASH = "#8B8680";
const BONE = "#F5F1E8";
const INK = "#0A0908";
const CLAY = "#C66B5C";
const HAIRLINE = "#3A3835";
const CARD_BG = "#15110F";

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ParticipantRow = {
  cohort: string;
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

type ResponseRow = {
  id: string;
  cohort: string;
  round: string;
  participant_id: string;
};

type Status = "not_started" | "live" | "ended";

type ModalState =
  | { type: "end"; cohort: Cohort }
  | { type: "reset"; cohort: Cohort }
  | { type: "force_reveal"; cohort: Cohort; missing: string[] }
  | null;

function deriveStatus(s?: SessionRow): Status {
  if (!s || !s.started_at) return "not_started";
  if (!s.ended_at) return "live";
  return "ended";
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    return `${h}:${pad2(m % 60)}:${pad2(s)}`;
  }
  return `${pad2(m)}:${pad2(s)}`;
}

function formatTimeOfDay(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function ControlPage() {
  const [sessions, setSessions] = useState<Record<string, SessionRow>>({});
  const [participants, setParticipants] = useState<Record<string, ParticipantRow[]>>({});
  const [responses, setResponses] = useState<Record<string, ResponseRow[]>>({});
  const [now, setNow] = useState<number>(() => Date.now());
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchData = useCallback(async () => {
    const [sessRes, partRes, respRes] = await Promise.all([
      supabase.from("sessions").select("*").in("cohort", [...COHORTS]),
      supabase.from("participants").select("*").in("cohort", [...COHORTS]),
      supabase.from("responses").select("id, cohort, round, participant_id").in("cohort", [...COHORTS]),
    ]);

    const s: Record<string, SessionRow> = {};
    for (const row of (sessRes.data ?? []) as SessionRow[]) s[row.cohort] = row;
    setSessions(s);

    const p: Record<string, ParticipantRow[]> = {};
    for (const row of (partRes.data ?? []) as ParticipantRow[]) {
      (p[row.cohort] ??= []).push(row);
    }
    for (const c of COHORTS) {
      (p[c] ??= []).sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    }
    setParticipants(p);

    const r: Record<string, ResponseRow[]> = {};
    for (const row of (respRes.data ?? []) as ResponseRow[]) {
      (r[row.cohort] ??= []).push(row);
    }
    setResponses(r);
  }, []);

  useEffect(() => {
    fetchData();

    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`control-all-${channelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions" },
        (payload) => {
          const row = payload.new as SessionRow;
          setSessions((prev) => ({ ...prev, [row.cohort]: row }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "participants" },
        (payload) => {
          const row = payload.new as ParticipantRow;
          setParticipants((prev) => {
            const list = prev[row.cohort] ?? [];
            if (list.some((p) => p.participant_id === row.participant_id)) return prev;
            return { ...prev, [row.cohort]: [...list, row] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participants" },
        (payload) => {
          const row = payload.new as ParticipantRow;
          setParticipants((prev) => ({
            ...prev,
            [row.cohort]: (prev[row.cohort] ?? []).map((p) =>
              p.participant_id === row.participant_id ? row : p
            ),
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "responses" },
        (payload) => {
          const row = payload.new as ResponseRow;
          setResponses((prev) => {
            const list = prev[row.cohort] ?? [];
            if (list.some((r) => r.id === row.id)) return prev;
            return { ...prev, [row.cohort]: [...list, row] };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  useVisibilityRefetch(fetchData);

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
      .update({
        ended_at: iso,
        current_round: "complete",
        updated_at: iso,
      })
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
    setResponses((prev) => ({ ...prev, [cohort]: [] }));
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

  async function triggerReveal(cohort: Cohort) {
    const iso = new Date().toISOString();
    await supabase
      .from("sessions")
      .update({ reveal_state: "reveal", updated_at: iso })
      .eq("cohort", cohort);
  }

  async function setParticipantActive(cohort: Cohort, pid: string, active: boolean) {
    await supabase
      .from("participants")
      .update({ active })
      .match({ cohort, participant_id: pid });
  }

  function openAllPosters() {
    for (const c of COHORTS) {
      window.open(`/presenter/${c}/mirror`, "_blank");
    }
  }

  function openAllInsights() {
    for (const c of COHORTS) {
      window.open(`/insights/${c}`, "_blank");
    }
  }

  return (
    <main
      className="min-h-screen w-full px-8 py-6"
      style={{ backgroundColor: INK, color: BONE }}
    >
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: HAIRLINE }}>
        <div className="w-56" />
        <h1 className="flex-1 text-center text-2xl font-bold tracking-widest">
          ACTION GAP · CONTROL
        </h1>
        <div className="flex w-56 flex-col items-end gap-1 text-sm">
          <button
            onClick={openAllPosters}
            className="hover:underline"
            style={{ color: ASH }}
          >
            Open all 3 posters ↗
          </button>
          <button
            onClick={openAllInsights}
            className="hover:underline"
            style={{ color: ASH }}
          >
            Open all 3 insights ↗
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {COHORTS.map((cohort) => (
          <CohortColumn
            key={cohort}
            cohort={cohort}
            session={sessions[cohort]}
            allParticipants={participants[cohort] ?? []}
            cohortResponses={responses[cohort] ?? []}
            now={now}
            onStart={() => startSession(cohort)}
            onSetRound={(r) => setRound(cohort, r)}
            onReveal={() => triggerReveal(cohort)}
            onForceReveal={(missing) => setModal({ type: "force_reveal", cohort, missing })}
            onAskEnd={() => setModal({ type: "end", cohort })}
            onAskReset={() => setModal({ type: "reset", cohort })}
            onToggleParticipant={(pid, active) => setParticipantActive(cohort, pid, active)}
          />
        ))}
      </div>

      {modal?.type === "end" && (
        <Modal
          title={`End the ${modal.cohort} session?`}
          message="This marks the game as complete and clears the roster. Use Reset Session if you want to replay with the same people."
          destructive
          confirmLabel="End Session"
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await endSession(modal.cohort);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "reset" && (
        <Modal
          title={`Reset ${modal.cohort}?`}
          message="This rewinds the game (clears all round data) but keeps the current roster. Use End Session for a clean game-over."
          destructive
          confirmLabel="Reset Session"
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await resetSession(modal.cohort);
            setModal(null);
          }}
        />
      )}

      {modal?.type === "force_reveal" && (
        <Modal
          title={`${modal.missing.length} ${modal.missing.length === 1 ? "person hasn't" : "people haven't"} submitted`}
          message={
            modal.missing.length > 0
              ? `${modal.missing.join(", ")}. Reveal anyway?`
              : "Reveal anyway?"
          }
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            await triggerReveal(modal.cohort);
            setModal(null);
          }}
        />
      )}
    </main>
  );
}

function CohortColumn({
  cohort,
  session,
  allParticipants,
  cohortResponses,
  now,
  onStart,
  onSetRound,
  onReveal,
  onForceReveal,
  onAskEnd,
  onAskReset,
  onToggleParticipant,
}: {
  cohort: Cohort;
  session?: SessionRow;
  allParticipants: ParticipantRow[];
  cohortResponses: ResponseRow[];
  now: number;
  onStart: () => void;
  onSetRound: (round: string) => void;
  onReveal: () => void;
  onForceReveal: (missing: string[]) => void;
  onAskEnd: () => void;
  onAskReset: () => void;
  onToggleParticipant: (pid: string, active: boolean) => void;
}) {
  const cohortColor = getTheme(cohort).primary;
  const status = deriveStatus(session);
  const currentRound = session?.current_round ?? "idle";
  const revealState = session?.reveal_state ?? "collecting";

  const activeRoster = useMemo(
    () => allParticipants.filter((p) => p.active),
    [allParticipants]
  );
  const Y = activeRoster.length;

  const submittedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of cohortResponses) {
      if (r.round === currentRound) set.add(r.participant_id);
    }
    return set;
  }, [cohortResponses, currentRound]);

  const X = useMemo(
    () => activeRoster.filter((p) => submittedSet.has(p.participant_id)).length,
    [activeRoster, submittedSet]
  );
  const cappedX = Math.min(X, Y);
  const allIn = Y > 0 && cappedX >= Y;
  const waitingForNames = useMemo(
    () =>
      activeRoster
        .filter((p) => !submittedSet.has(p.participant_id))
        .map((p) => p.name),
    [activeRoster, submittedSet]
  );

  const elapsedMs = useMemo(() => {
    if (!session?.started_at) return 0;
    const start = new Date(session.started_at).getTime();
    const end = session.ended_at ? new Date(session.ended_at).getTime() : now;
    return end - start;
  }, [session?.started_at, session?.ended_at, now]);

  const showWaitingFor =
    !allIn &&
    waitingForNames.length > 0 &&
    currentRound !== "idle" &&
    currentRound !== "complete";
  const isActiveRound =
    currentRound !== "idle" && currentRound !== "complete";
  const revealReady = isActiveRound && revealState === "collecting";

  return (
    <section
      className="flex flex-col gap-5 rounded-lg p-5"
      style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}
    >
      <div className="flex items-center gap-3">
        {status === "not_started" && (
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: ASH }}
          >
            NOT STARTED
          </span>
        )}
        {status === "live" && (
          <span
            className="animate-pulse text-xs font-bold uppercase tracking-widest"
            style={{ color: cohortColor }}
          >
            ● LIVE
          </span>
        )}
        {status === "ended" && (
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: ASH }}
          >
            ENDED
          </span>
        )}

        {status === "live" && (
          <span className="text-sm tabular-nums" style={{ color: BONE }}>
            {formatElapsed(elapsedMs)}
          </span>
        )}
        {status === "ended" && session?.started_at && session?.ended_at && (
          <span className="text-sm tabular-nums" style={{ color: ASH }}>
            Ran for {formatElapsed(elapsedMs)}
          </span>
        )}
      </div>

      <h2
        className="text-3xl font-bold uppercase tracking-wider"
        style={{ color: cohortColor }}
      >
        {cohort}
      </h2>

      <div>
        <div className="text-xs uppercase tracking-wider" style={{ color: ASH }}>
          Roster ({Y})
        </div>
        {allParticipants.length === 0 ? (
          <p className="mt-2 text-sm italic" style={{ color: ASH }}>
            No one joined yet
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
            {allParticipants.map((p) => (
              <span
                key={p.participant_id}
                className="inline-flex items-center gap-1"
                style={{ color: p.active ? BONE : "#5A5650" }}
              >
                <span className={p.active ? "" : "line-through"}>{p.name}</span>
                <button
                  onClick={() => onToggleParticipant(p.participant_id, !p.active)}
                  className="text-xs hover:opacity-100"
                  style={{ color: ASH, opacity: 0.6 }}
                  title={p.active ? "Deactivate" : "Reactivate"}
                >
                  {p.active ? "✕" : "↺"}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {(status === "live" || status === "ended") && (
        <div className="text-sm">
          <div style={{ color: ASH }}>
            Round:{" "}
            <span style={{ color: BONE }}>{currentRound}</span>{" "}
            · State:{" "}
            <span style={{ color: BONE }}>{revealState}</span>
          </div>
          <div
            className="mt-1 font-medium tabular-nums"
            style={{ color: allIn ? TEAL : BONE }}
          >
            {cappedX} of {Y} submitted
          </div>
          {showWaitingFor && (
            <div className="mt-1 text-xs" style={{ color: ASH }}>
              Waiting for: {waitingForNames.join(", ")}
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {status === "not_started" && (
          <>
            <button
              onClick={onStart}
              className="rounded-md px-4 py-2 font-bold transition-transform active:scale-95"
              style={{ backgroundColor: BONE, color: INK }}
            >
              Start Session
            </button>
            <p className="text-xs italic" style={{ color: ASH }}>
              Click to begin the {cohort} session
            </p>
          </>
        )}

        {status === "live" && (
          <>
            <div className="grid grid-cols-5 gap-1.5">
              {ROUND_KEYS.map((r) => {
                const isCurrent = currentRound === r;
                return (
                  <button
                    key={r}
                    onClick={() => onSetRound(r)}
                    className="rounded-md border px-2 py-1.5 text-xs transition-colors"
                    style={{
                      borderColor: isCurrent ? cohortColor : HAIRLINE,
                      color: isCurrent ? cohortColor : BONE,
                      backgroundColor: "transparent",
                    }}
                  >
                    {ROUND_LABEL[r]}
                  </button>
                );
              })}
            </div>

            {revealReady && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onReveal}
                  disabled={!allIn}
                  title={!allIn ? `Waiting for ${Y - cappedX} ${Y - cappedX === 1 ? "person" : "people"}` : undefined}
                  className="flex-1 rounded-md px-4 py-2 font-bold transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ backgroundColor: BONE, color: INK }}
                >
                  Reveal
                </button>
                <button
                  onClick={() => onForceReveal(waitingForNames)}
                  className="rounded-md border px-3 py-2 text-xs transition-colors"
                  style={{ borderColor: HAIRLINE, color: ASH }}
                >
                  Force
                </button>
              </div>
            )}

            <button
              onClick={onAskEnd}
              className="rounded-md border px-4 py-2 text-sm transition-colors"
              style={{ borderColor: HAIRLINE, color: ASH }}
            >
              End Session
            </button>

            <div className="flex justify-center gap-4 text-center text-xs">
              <a
                href={`/presenter/${cohort}/mirror`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                style={{ color: ASH }}
              >
                Open poster ↗
              </a>
              <a
                href={`/insights/${cohort}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                style={{ color: ASH }}
              >
                Insights ↗
              </a>
            </div>
          </>
        )}

        {status === "ended" && (
          <>
            {session?.ended_at && (
              <p className="text-sm" style={{ color: BONE }}>
                Session ended at {formatTimeOfDay(session.ended_at)}
              </p>
            )}
            <p className="text-sm" style={{ color: ASH }}>
              Final round was:{" "}
              <span style={{ color: BONE }}>{currentRound}</span>
            </p>
            <div className="flex flex-col gap-1.5 text-sm">
              <a
                href={`/presenter/${cohort}/mirror`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                style={{ color: cohortColor }}
              >
                View final poster ↗
              </a>
              <a
                href={`/insights/${cohort}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
                style={{ color: cohortColor }}
              >
                View insights ↗
              </a>
            </div>
            <button
              onClick={onAskReset}
              className="text-left text-xs hover:underline"
              style={{ color: ASH }}
            >
              Reset Session
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Modal({
  title,
  message,
  onCancel,
  onConfirm,
  destructive,
  confirmLabel = "Confirm",
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
  confirmLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg p-6"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${HAIRLINE}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold" style={{ color: BONE }}>
          {title}
        </h2>
        <p className="mt-3 text-sm" style={{ color: ASH }}>
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm"
            style={{ color: ASH }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md px-4 py-2 text-sm font-bold transition-transform active:scale-95"
            style={{
              backgroundColor: destructive ? CLAY : BONE,
              color: INK,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
