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

const COHORT_SINGULAR: Record<string, string> = {
  Dolphins: "Dolphin",
  Foxes: "Fox",
  Elephants: "Elephant",
};

const STAGE_LABELS = [
  "Concerned",
  "Believe behavior matters",
  "Will change in 2026",
  "Sustained change 6+ months",
] as const;

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";
const TEAL = "#5BA89D";
const BAR_BG = "#1A1714";

type FunnelData = {
  stage1: boolean;
  stage2: boolean;
  stage3: boolean;
  stage4: boolean;
};

type ResponseRow = {
  id: string;
  cohort: string;
  round: string;
  participant_id: string;
  data: FunnelData;
};

type ParticipantRow = {
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

export default function FunnelPoster({
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

  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!cohort) return;

    const { data: rows } = await supabase
      .from("responses")
      .select("id, cohort, round, participant_id, data")
      .eq("cohort", cohort)
      .eq("round", "funnel");
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
      .channel(`funnel-${cohort}-${channelId}`)
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
          if (row.round !== "funnel") return;
          setResponses((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [...prev, row]
          );
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

  const [showSignature, setShowSignature] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const prevPunchlineRef = useRef(false);
  const prevInsightPunchlineRef = useRef(false);

  const stats = useMemo(() => {
    const N = responses.length;
    const stageCounts = [0, 0, 0, 0];
    for (const r of responses) {
      if (r.data?.stage1) stageCounts[0]++;
      if (r.data?.stage2) stageCounts[1]++;
      if (r.data?.stage3) stageCounts[2]++;
      if (r.data?.stage4) stageCounts[3]++;
    }
    const stagePct = stageCounts.map((c) => (N > 0 ? Math.round((c / N) * 100) : 0));
    const stage1Count = stageCounts[0];
    const barWidthPct = stageCounts.map((c, i) => {
      if (i === 0) return N > 0 ? 100 : 0;
      return stage1Count > 0 ? (c / stage1Count) * 100 : 0;
    });
    return { N, stageCounts, stagePct, barWidthPct };
  }, [responses]);

  const submittedSet = useMemo(
    () => new Set(responses.map((r) => r.participant_id)),
    [responses]
  );
  const Y = participants.length;
  const X = useMemo(
    () =>
      participants.filter((p) => submittedSet.has(p.participant_id)).length,
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

  const punchlineActive = allIn && stats.stageCounts[0] > 0;

  useEffect(() => {
    const prev = prevPunchlineRef.current;
    prevPunchlineRef.current = punchlineActive;

    if (punchlineActive && !prev) {
      const t = setTimeout(() => setShowSignature(true), 1000);
      return () => clearTimeout(t);
    }

    if (!punchlineActive && showSignature) {
      setShowSignature(false);
    }
  }, [punchlineActive, showSignature]);

  useEffect(() => {
    const prev = prevInsightPunchlineRef.current;
    prevInsightPunchlineRef.current = punchlineActive;

    if (punchlineActive && !prev && !locked) {
      const onTimer = setTimeout(() => setShowInsight(true), 2000);
      const offTimer = setTimeout(() => setShowInsight(false), 10000);
      return () => {
        clearTimeout(onTimer);
        clearTimeout(offTimer);
      };
    }

    if (!punchlineActive && showInsight) {
      setShowInsight(false);
    }
  }, [punchlineActive, showInsight, locked]);

  const inner = (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-12 py-6">
      <h1 className="text-6xl font-bold tracking-tight">THE FUNNEL</h1>
      <p className="mt-2 text-lg" style={{ color: ASH }}>
        How many of us make it from concern to action?
      </p>

      <div className="mt-6 flex w-full max-w-5xl flex-col gap-3">
        {STAGE_LABELS.map((label, i) => {
          const width = stats.barWidthPct[i];
          const count = stats.stageCounts[i];
          const pct = stats.stagePct[i];
          return (
            <div
              key={label}
              className="relative h-14 w-full overflow-hidden rounded-md"
              style={{ backgroundColor: BAR_BG }}
            >
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${width}%`,
                  backgroundColor: cohortColor,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-6">
                <span
                  className="text-lg font-semibold"
                  style={{ color: BONE }}
                >
                  {label}
                </span>
                <span
                  className="text-lg font-semibold tabular-nums"
                  style={{ color: BONE }}
                >
                  {count} · {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex-shrink-0 text-center">
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
        <AnimatePresence>
          {allIn && stats.stageCounts[0] > 0 && (
            <motion.p
              key="punchline"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6 text-2xl font-medium"
              style={{ color: BONE }}
            >
              Drop-off:{" "}
              <span
                className="font-bold tabular-nums"
                style={{ color: cohortColor }}
              >
                {Math.max(0, stats.stagePct[0] - stats.stagePct[3])}%
              </span>{" "}
              from concern to sustained action
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (locked || compact) {
    return (
      <div className="flex h-full w-full flex-col text-white">
        <div
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: cohortColor }}
        >
          02 · The Funnel
        </div>

        {stats.N === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm italic" style={{ color: ASH }}>
              No data captured
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-1 flex-col justify-center gap-2">
            {STAGE_LABELS.map((label, i) => {
              const width = stats.barWidthPct[i];
              const count = stats.stageCounts[i];
              const pct = stats.stagePct[i];
              return (
                <div
                  key={label}
                  className="relative h-7 w-full overflow-hidden rounded-sm"
                  style={{ backgroundColor: BAR_BG }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${width}%`,
                      backgroundColor: cohortColor,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span
                      className="text-xs font-medium"
                      style={{ color: BONE }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs font-medium tabular-nums"
                      style={{ color: BONE }}
                    >
                      {count} · {pct}%
                    </span>
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
          Drop-off from concern to action
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
    <ResearchInsight round="funnel" show={showInsight} />
  ) : null;

  if (embedded) {
    return (
      <>
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
