"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { useTheme } from "@/lib/theme";
import { Mascot } from "@/components/mascots/Mascot";
import { LiveMascot } from "@/components/mascots/LiveMascot";
import { Signature } from "@/components/signatures/Signature";
import { Avatar } from "@/components/Avatar";
import { ResearchInsight } from "@/components/ResearchInsight";
import ceoPairs from "@/content/ceo-pairs.json";

const COHORT_SINGULAR: Record<string, string> = {
  Dolphins: "Dolphin",
  Foxes: "Fox",
  Elephants: "Elephant",
};

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";
const TEAL = "#5BA89D";
const CLAY = "#C66B5C";
const CARD_BG = "#15110F";

type Vote = "greenwash" | "real";
type Verdict = { pairId: number; vote: Vote };

type Pair = {
  id: number;
  company: string;
  year: number;
  quote: string;
  reality: string;
};

const PAIRS: Pair[] = (ceoPairs as { pairs: Pair[] }).pairs;

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
};

type ResponseRow = {
  id: string;
  cohort: string;
  round: string;
  participant_id: string;
  data: { verdicts: Verdict[] };
};

type ParticipantRow = {
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

export default function CourtPoster({
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
      .select("id, cohort, round, participant_id, data")
      .eq("cohort", cohort)
      .eq("round", "court");
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
      .channel(`court-${cohort}-${channelId}`)
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
          if (row.round !== "court") return;
          setResponses((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row]
          );
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
      const t = setTimeout(() => setShowSignature(true), 1500);
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
      const onTimer = setTimeout(() => setShowInsight(true), 2800);
      return () => clearTimeout(onTimer);
    }

    if (current !== "reveal" && showInsight) {
      setShowInsight(false);
    }
  }, [session?.reveal_state, showInsight, locked]);

  const pairStats = useMemo(() => {
    return PAIRS.map((pair) => {
      let g = 0;
      let r = 0;
      for (const resp of responses) {
        const v = resp.data?.verdicts?.find((x) => x.pairId === pair.id);
        if (v?.vote === "greenwash") g++;
        else if (v?.vote === "real") r++;
      }
      const total = g + r;
      const greenwashPct = total > 0 ? Math.round((g / total) * 100) : 0;
      const realPct = total > 0 ? 100 - greenwashPct : 0;
      const verdict =
        total === 0
          ? "No data"
          : g > r
            ? "Greenwash"
            : r > g
              ? "Real progress"
              : "Split";
      return {
        pair,
        greenwashCount: g,
        realCount: r,
        totalVotes: total,
        greenwashPct,
        realPct,
        verdict,
      };
    });
  }, [responses]);

  const submittedSet = useMemo(
    () => new Set(responses.map((r) => r.participant_id)),
    [responses]
  );
  const Y = participants.length;
  const X = useMemo(
    () => participants.filter((p) => submittedSet.has(p.participant_id)).length,
    [participants, submittedSet]
  );
  const cappedX = Math.min(X, Y);
  const allIn = Y > 0 && cappedX >= Y;
  const waitingForNames = useMemo(
    () =>
      participants
        .filter((p) => !submittedSet.has(p.participant_id))
        .map((p) => p.name),
    [participants, submittedSet]
  );
  const namesList = useMemo(
    () => participants.map((p) => p.name).join(", "),
    [participants]
  );

  const revealState = session?.reveal_state ?? "collecting";
  const isRevealing = revealState === "reveal";

  const inner = (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-12 py-6">
      <h1 className="text-6xl font-bold tracking-tight">THE COURT</h1>
      <p className="mt-2 text-lg" style={{ color: ASH }}>
        Greenwash, or the real thing?
      </p>
      {!isRevealing && (
        <p className="mt-1 text-xs italic" style={{ color: ASH }}>
          Cards visible on phones · Watch the reveal
        </p>
      )}

      <div className="mt-6 w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {!isRevealing ? (
            <motion.div
              key="collecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.94, y: -28 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-3"
            >
              <div className="flex justify-center pb-2">
                <LiveMascot cohort={cohort} size={110} className="opacity-90" />
              </div>
              {pairStats.map((s) => {
                const allVoted = Y > 0 && s.totalVotes >= Y;
                return (
                  <div
                    key={s.pair.id}
                    className="flex items-center justify-between rounded-md px-5 py-3"
                    style={{
                      backgroundColor: CARD_BG,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span
                        className="text-2xl font-bold uppercase tracking-wider"
                        style={{ color: cohortColor }}
                      >
                        {s.pair.company}
                      </span>
                      <span className="text-xs" style={{ color: ASH }}>
                        {s.pair.year}
                      </span>
                    </div>
                    <span
                      className="text-base font-semibold tabular-nums"
                      style={{ color: allVoted ? TEAL : BONE }}
                    >
                      {s.totalVotes} {s.totalVotes === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4"
            >
              {pairStats.map((s, i) => {
                const verdictColor =
                  s.verdict === "Greenwash"
                    ? CLAY
                    : s.verdict === "Real progress"
                      ? TEAL
                      : ASH;
                const stampDelay = i * 0.32;
                return (
                  <motion.div
                    key={s.pair.id}
                    initial={{ opacity: 0, scale: 0.65, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: stampDelay,
                      duration: 0.55,
                      ease: [0.34, 1.56, 0.64, 1],
                    }}
                    className="flex items-center gap-6"
                  >
                    <div
                      className="w-44 text-right text-xl font-bold uppercase tracking-wider"
                      style={{
                        color: BONE,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                      }}
                    >
                      {s.pair.company}
                    </div>

                    <div
                      className="relative h-16 flex-1 overflow-hidden rounded-md"
                      style={{
                        backgroundColor: CARD_BG,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                      }}
                    >
                      {s.totalVotes === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: ASH }}>
                          —
                        </div>
                      ) : (
                        <div className="flex h-full">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.greenwashPct}%` }}
                            transition={{
                              delay: stampDelay + 0.25,
                              duration: 0.85,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{ backgroundColor: CLAY }}
                            className="flex items-center justify-start pl-4 text-base font-bold tabular-nums text-black"
                          >
                            {s.greenwashPct >= 12 ? `${s.greenwashCount}` : ""}
                          </motion.div>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${s.realPct}%` }}
                            transition={{
                              delay: stampDelay + 0.25,
                              duration: 0.85,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            style={{ backgroundColor: TEAL }}
                            className="flex items-center justify-end pr-4 text-base font-bold tabular-nums text-black"
                          >
                            {s.realPct >= 12 ? `${s.realCount}` : ""}
                          </motion.div>
                        </div>
                      )}
                    </div>

                    <div className="flex w-44 items-center gap-2">
                      <motion.span
                        aria-hidden
                        className="select-none text-2xl"
                        initial={{ opacity: 0, rotate: -45, x: -8 }}
                        animate={{
                          opacity: [0, 1, 1, 0.6],
                          rotate: [-45, 8, -8, 0],
                          x: [-8, 2, -2, 0],
                        }}
                        transition={{
                          delay: stampDelay + 0.95,
                          duration: 0.55,
                          times: [0, 0.4, 0.7, 1],
                          ease: "easeOut",
                        }}
                      >
                        🔨
                      </motion.span>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: stampDelay + 1.05,
                          duration: 0.4,
                          ease: [0.34, 1.56, 0.64, 1],
                        }}
                        className="text-left text-xl font-bold uppercase tracking-wider"
                        style={{
                          color: verdictColor,
                          fontFamily: 'Georgia, "Times New Roman", serif',
                        }}
                      >
                        {s.verdict}
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-10 text-center">
        <div
          className="text-2xl font-semibold tabular-nums transition-colors"
          style={{ color: allIn ? TEAL : BONE }}
        >
          {cappedX} of {Y} submitted
        </div>
        {!allIn && waitingForNames.length > 0 && Y > 0 && (
          <div className="mt-2 text-sm" style={{ color: ASH }}>
            Waiting for: {waitingForNames.join(", ")}
          </div>
        )}
      </div>
    </div>
  );

  if (locked || compact) {
    const totalResponses = responses.length;
    return (
      <div className="flex h-full w-full flex-col text-white">
        <div
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: cohortColor }}
        >
          03 · The Court
        </div>

        {totalResponses === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm italic" style={{ color: ASH }}>
              No data captured
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
            {pairStats.map((s) => {
              const verdictColor =
                s.verdict === "Greenwash"
                  ? CLAY
                  : s.verdict === "Real progress"
                    ? TEAL
                    : ASH;
              return (
                <div
                  key={s.pair.id}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-20 text-right text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: BONE }}
                  >
                    {s.pair.company}
                  </div>
                  <div
                    className="relative h-3 flex-1 overflow-hidden rounded-sm"
                    style={{ backgroundColor: CARD_BG }}
                  >
                    {s.totalVotes > 0 && (
                      <div className="flex h-full">
                        <div
                          style={{
                            width: `${s.greenwashPct}%`,
                            backgroundColor: CLAY,
                          }}
                        />
                        <div
                          style={{
                            width: `${s.realPct}%`,
                            backgroundColor: TEAL,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div
                    className="w-24 text-left text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: verdictColor }}
                  >
                    {s.verdict === "Real progress" ? "Real" : s.verdict}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p
          className="mt-3 text-center text-xs italic"
          style={{ color: ASH }}
        >
          Cohort verdicts on real CEO climate claims
        </p>
      </div>
    );
  }

  const signatureEl = (
    <Signature
      cohort={cohort}
      trigger={showSignature && !locked}
      onComplete={() => setShowSignature(false)}
    />
  );

  const insightEl = !locked ? (
    <ResearchInsight round="court" show={showInsight} />
  ) : null;

  const statusPill = !locked && !compact ? (
    <div
      className="pointer-events-none fixed left-1/2 top-32 z-40 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur"
      style={{
        backgroundColor:
          isRevealing
            ? "rgba(91, 168, 157, 0.18)"
            : `${cohortColor}22`,
        borderColor:
          isRevealing
            ? "rgba(91, 168, 157, 0.5)"
            : `${cohortColor}66`,
        color: isRevealing ? TEAL : cohortColor,
      }}
    >
      {isRevealing ? "● Revealed" : `● Collecting · ${cappedX} / ${Y}`}
    </div>
  ) : null;

  if (embedded) {
    return (
      <>
        {statusPill}
        {signatureEl}
        {insightEl}
        {inner}
      </>
    );
  }

  return (
    <main
      className="relative flex min-h-screen w-screen flex-col"
      style={{ backgroundColor: INK, color: BONE }}
    >
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
      {inner}
    </main>
  );
}
