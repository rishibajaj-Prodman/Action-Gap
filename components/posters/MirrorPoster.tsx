"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { useTheme } from "@/lib/theme";
import { Mascot } from "@/components/mascots/Mascot";
import { Signature } from "@/components/signatures/Signature";
import { Avatar } from "@/components/Avatar";
import { ResearchInsight } from "@/components/ResearchInsight";
import { StatusPill } from "@/components/StatusPill";
import { CollectingCard } from "@/components/CollectingCard";

type ResponseRow = {
  id: string;
  cohort: string;
  round: string;
  participant_id: string;
  data: { prediction: number; belief: boolean };
};

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
};

type ParticipantRow = {
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

type Toast = {
  id: string;
  participantId: string;
};

const COHORT_SINGULAR: Record<string, string> = {
  Dolphins: "Dolphin",
  Foxes: "Fox",
  Elephants: "Elephant",
};

const TEAL_AFFIRMATIVE = "#5BA89D";
const INK = "#0A0908";
const ASH = "#8B8680";
const BONE = "#F5F1E8";

export default function MirrorPoster({
  cohort,
  embedded = false,
  locked = false,
  compact = false,
}: {
  cohort: string;
  embedded?: boolean;
  locked?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;
  const singular = COHORT_SINGULAR[cohort] ?? cohort;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const prevRevealStateRef = useRef<string | null | undefined>(undefined);
  const prevInsightRevealRef = useRef<string | null | undefined>(undefined);

  const fetchData = useCallback(async () => {
    if (!cohort) return;

    const { data: sess } = await supabase
      .from("sessions")
      .select("cohort, current_round, reveal_state")
      .eq("cohort", cohort)
      .single();
    if (sess) setSession(sess);

    const { data: rows } = await supabase
      .from("responses")
      .select("*")
      .eq("cohort", cohort)
      .eq("round", "mirror");
    if (rows) setResponses(rows as ResponseRow[]);

    const { data: parts } = await supabase
      .from("participants")
      .select("participant_id, name, joined_at, active")
      .eq("cohort", cohort)
      .eq("active", true)
      .order("joined_at", { ascending: true });
    if (parts) setParticipants(parts as ParticipantRow[]);
  }, [cohort]);

  useEffect(() => {
    if (!cohort) return;
    let active = true;

    async function loadParticipants() {
      const { data } = await supabase
        .from("participants")
        .select("participant_id, name, joined_at, active")
        .eq("cohort", cohort)
        .eq("active", true)
        .order("joined_at", { ascending: true });
      if (active && data) setParticipants(data as ParticipantRow[]);
    }

    fetchData();

    if (locked) {
      return () => {
        active = false;
      };
    }

    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`mirror-${cohort}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `cohort=eq.${cohort}`,
        },
        (payload) => {
          const row = payload.new as ResponseRow;
          if (row.round !== "mirror") return;
          setResponses((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row]
          );
          const toastId = `${row.id}-${Date.now()}`;
          setToasts((prev) => [
            ...prev,
            { id: toastId, participantId: row.participant_id },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== toastId));
          }, 2000);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `cohort=eq.${cohort}`,
        },
        (payload) => {
          setSession(payload.new as SessionRow);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `cohort=eq.${cohort}`,
        },
        (payload) => {
          const row = payload.new as ParticipantRow;
          if (!row.active) return;
          setParticipants((prev) =>
            prev.some((p) => p.participant_id === row.participant_id)
              ? prev
              : [...prev, row]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "participants",
          filter: `cohort=eq.${cohort}`,
        },
        () => {
          loadParticipants();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [cohort, locked, fetchData]);

  useVisibilityRefetch(fetchData);

  useEffect(() => {
    const prev = prevRevealStateRef.current;
    const current = session?.reveal_state;
    prevRevealStateRef.current = current;

    if (current === "reveal" && prev && prev !== "reveal") {
      const t = setTimeout(() => setShowSignature(true), 7500);
      return () => clearTimeout(t);
    }

    if (current !== "reveal" && showSignature) {
      setShowSignature(false);
    }
  }, [session?.reveal_state, showSignature]);

  useEffect(() => {
    const prev = prevInsightRevealRef.current;
    const current = session?.reveal_state;
    prevInsightRevealRef.current = current;

    if (current === "reveal" && prev && prev !== "reveal" && !locked) {
      const onTimer = setTimeout(() => setShowInsight(true), 12500);
      return () => clearTimeout(onTimer);
    }

    if (current !== "reveal" && showInsight) {
      setShowInsight(false);
    }
  }, [session?.reveal_state, showInsight, locked]);

  const submittedSet = useMemo(
    () => new Set(responses.map((r) => r.participant_id)),
    [responses]
  );

  const totalRoster = participants.length;
  const submittedCount = useMemo(
    () =>
      participants.filter((p) => submittedSet.has(p.participant_id)).length,
    [participants, submittedSet]
  );
  const cappedSubmitted = Math.min(submittedCount, totalRoster);

  const waitingFor = useMemo(
    () =>
      participants.filter((p) => !submittedSet.has(p.participant_id)),
    [participants, submittedSet]
  );

  const { predictedAvg, actualPct, gap } = useMemo(() => {
    const count = responses.length;
    if (count === 0) return { predictedAvg: 0, actualPct: 0, gap: 0 };
    const predSum = responses.reduce((s, r) => s + (r.data?.prediction ?? 0), 0);
    const yesCount = responses.filter((r) => r.data?.belief === true).length;
    const predictedAvg = Math.round(predSum / count);
    const actualPct = Math.round((yesCount / count) * 100);
    return {
      predictedAvg,
      actualPct,
      gap: Math.abs(actualPct - predictedAvg),
    };
  }, [responses]);

  const nameByPid = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) map.set(p.participant_id, p.name);
    return map;
  }, [participants]);

  const state = session?.reveal_state ?? "collecting";
  const namesList = participants.map((p) => p.name).join(", ");

  const statusPill = !locked && !compact ? (
    <StatusPill
      cohortColor={cohortColor}
      state={state === "reveal" ? "reveal" : "collecting"}
      submitted={cappedSubmitted}
      total={totalRoster}
    />
  ) : null;

  const toastsEl = (
    <div className="pointer-events-none fixed top-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((t) => {
          const name = nameByPid.get(t.participantId) ?? "Someone";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="rounded-md border border-white/10 bg-black/60 px-3 py-1.5 text-base font-medium backdrop-blur"
              style={{ color: cohortColor }}
            >
              ✓ {name}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  const content = (
    <div className="flex flex-1 flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {state === "collecting" ? (
          <motion.div
            key="collecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -40 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full"
          >
            <CollectingCard
              cohort={cohort}
              count={submittedCount}
              total={totalRoster}
              waitingFor={waitingFor}
              prompt={
                <>
                  <h1 className="text-7xl font-bold tracking-tight">
                    The Mirror
                  </h1>
                  <p className="mt-4 text-2xl text-zinc-400">
                    How many of you think the room cares?
                  </p>
                </>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex w-full flex-col items-center"
          >
            <div className="relative flex w-full max-w-6xl items-end justify-between gap-8">
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: [0, 1, 1, 0.5], y: [50, 0, 0, 0] }}
                transition={{
                  duration: 4,
                  times: [0, 0.375, 0.75, 1],
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex flex-1 flex-col items-center"
              >
                <div className="text-xs uppercase tracking-[0.4em]" style={{ color: ASH }}>
                  The room said
                </div>
                <div
                  className="mt-3 leading-[0.85] tabular-nums"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "clamp(7rem, 16vw, 14rem)",
                    fontWeight: 300,
                    color: "#5A5650",
                  }}
                >
                  {predictedAvg}%
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 6.5, duration: 0.6, ease: "easeOut" }}
                className="flex flex-col items-center pb-8 text-center"
              >
                <div className="text-[10px] uppercase tracking-[0.4em]" style={{ color: ASH }}>
                  Gap
                </div>
                <div
                  className="mt-2 text-5xl font-bold tabular-nums"
                  style={{ color: cohortColor }}
                >
                  {gap}%
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 3.0,
                  duration: 1.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative flex flex-1 flex-col items-center"
              >
                {actualPct > predictedAvg && (
                  <div className="pointer-events-none absolute inset-0 -top-8">
                    {["🌿", "✨", "🌱", "✨", "🌿"].map((e, i) => (
                      <motion.span
                        key={i}
                        aria-hidden
                        className="absolute select-none text-3xl"
                        style={{ left: `${15 + i * 17}%`, bottom: 0 }}
                        initial={{ opacity: 0, y: 0, rotate: 0 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: -260,
                          rotate: i % 2 === 0 ? 18 : -18,
                        }}
                        transition={{
                          delay: 4.7 + i * 0.12,
                          duration: 2.6,
                          times: [0, 0.18, 0.7, 1],
                          ease: "easeOut",
                        }}
                      >
                        {e}
                      </motion.span>
                    ))}
                  </div>
                )}
                <div
                  className="text-xs uppercase tracking-[0.4em]"
                  style={{ color: cohortColor }}
                >
                  Actually
                </div>
                <div
                  className="mt-3 leading-[0.85] tabular-nums"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "clamp(9rem, 20vw, 18rem)",
                    fontWeight: 700,
                    color: BONE,
                  }}
                >
                  {actualPct}%
                </div>
              </motion.div>

              <motion.svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 30"
                preserveAspectRatio="none"
              >
                <motion.path
                  d="M 22 22 Q 50 4, 78 14"
                  stroke={cohortColor}
                  strokeWidth="0.25"
                  fill="none"
                  strokeDasharray="1.5 1.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ delay: 6.0, duration: 1.0, ease: "easeOut" }}
                />
              </motion.svg>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 9.0, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="mt-16 max-w-3xl text-center text-3xl font-semibold leading-tight md:text-4xl"
              style={{ color: BONE, fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {actualPct > predictedAvg
                ? "The room cares more than the room thinks."
                : actualPct < predictedAvg
                  ? "The room thinks it cares more than it does."
                  : "The room read itself exactly right."}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 12.0, duration: 0.6 }}
              className="mt-4 text-xs uppercase tracking-[0.3em]"
              style={{ color: ASH }}
            >
              Pluralistic ignorance · Andre et al., Nature Climate Change, 2024
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const signatureEl = (
    <Signature
      cohort={cohort}
      trigger={showSignature && !locked}
      onComplete={() => setShowSignature(false)}
    />
  );

  const insightEl = !locked ? (
    <ResearchInsight round="mirror" show={showInsight} />
  ) : null;

  if (locked || compact) {
    const direction =
      responses.length === 0
        ? null
        : actualPct === predictedAvg
          ? "Match"
          : actualPct > predictedAvg
            ? "Underestimate"
            : "Overestimate";

    return (
      <div className="flex h-full w-full flex-col text-white">
        <div
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: cohortColor }}
        >
          01 · The Mirror
        </div>

        {responses.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm italic" style={{ color: ASH }}>
              No data captured
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="flex w-full items-center justify-around gap-4">
              <div className="text-center">
                <div
                  className="text-xs uppercase tracking-widest"
                  style={{ color: ASH }}
                >
                  Predicted
                </div>
                <div
                  className="mt-1 text-5xl font-bold tabular-nums"
                  style={{ color: BONE, opacity: 0.7 }}
                >
                  {predictedAvg}%
                </div>
              </div>
              <div className="text-center">
                <div
                  className="text-xs uppercase tracking-widest"
                  style={{ color: ASH }}
                >
                  Actual
                </div>
                <div
                  className="mt-1 text-6xl font-bold tabular-nums"
                  style={{ color: BONE }}
                >
                  {actualPct}%
                </div>
              </div>
            </div>
            <p
              className="mt-5 text-base font-medium"
              style={{ color: cohortColor }}
            >
              {direction} · gap of {gap}%
            </p>
          </div>
        )}

        <p
          className="mt-3 text-center text-xs italic"
          style={{ color: ASH }}
        >
          Pluralistic ignorance
        </p>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-12 py-6 text-white">
        {statusPill}
        {toastsEl}
        {signatureEl}
        {insightEl}
        {content}
      </div>
    );
  }

  return (
    <main
      className="relative flex min-h-screen w-screen flex-col text-white"
      style={{ backgroundColor: INK }}
    >
      {toastsEl}
      {signatureEl}
      {insightEl}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/10 px-8 py-4">
        <div className="flex items-center gap-2">
          <Mascot cohort={cohort} size={24} />
          <span
            className="text-base font-bold uppercase tracking-wider"
            style={{ color: cohortColor }}
          >
            {cohort}
          </span>
        </div>
        {participants.length === 0 ? (
          <span className="text-sm italic" style={{ color: ASH }}>
            Waiting for the first {singular}...
          </span>
        ) : (
          <div className="flex items-center gap-1">
            {participants.slice(0, 8).map((p) => (
              <Avatar key={p.participant_id} name={p.name} size={28} />
            ))}
            {participants.length > 8 && (
              <span className="ml-1 text-xs" style={{ color: ASH }}>
                +{participants.length - 8}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col px-12 py-10">
        <div className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
          {cohort}
        </div>
        {content}
      </div>
    </main>
  );
}
