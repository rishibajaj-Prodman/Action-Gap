"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { useTheme } from "@/lib/theme";
import { Mascot } from "@/components/mascots/Mascot";
import { Avatar } from "@/components/Avatar";
import { ResearchInsight } from "@/components/ResearchInsight";

const COHORT_SINGULAR: Record<string, string> = {
  Dolphins: "Dolphin",
  Foxes: "Fox",
  Elephants: "Elephant",
};

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";
const TEAL = "#5BA89D";

type ResponseRow = {
  id: string;
  cohort: string;
  round: string;
  participant_id: string;
  data: { text: string };
};

type ParticipantRow = {
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

function tiltFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return (hash % 7) - 3;
}

export default function ReflectionPoster({
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
  const [showInsight, setShowInsight] = useState(false);
  const prevHadResponseRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!cohort) return;

    const { data: rows } = await supabase
      .from("responses")
      .select("id, cohort, round, participant_id, data")
      .eq("cohort", cohort)
      .eq("round", "reflection")
      .order("created_at", { ascending: true });
    if (rows) setResponses(rows as ResponseRow[]);

    let query = supabase
      .from("participants")
      .select("participant_id, name, joined_at, active")
      .eq("cohort", cohort);
    if (!locked) {
      query = query.eq("active", true);
    }
    const { data: parts } = await query.order("joined_at", { ascending: true });
    if (parts) setParticipants(parts as ParticipantRow[]);
  }, [cohort, locked]);

  useEffect(() => {
    if (!cohort) return;
    let active = true;

    async function loadParticipants() {
      let query = supabase
        .from("participants")
        .select("participant_id, name, joined_at, active")
        .eq("cohort", cohort);
      if (!locked) {
        query = query.eq("active", true);
      }
      const { data } = await query.order("joined_at", { ascending: true });
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
      .channel(`reflection-${cohort}-${channelId}`)
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
          if (row.round !== "reflection") return;
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

  useEffect(() => {
    const prev = prevHadResponseRef.current;
    const hasResponse = responses.length > 0;
    prevHadResponseRef.current = hasResponse;

    if (hasResponse && !prev && !locked) {
      const onTimer = setTimeout(() => setShowInsight(true), 2000);
      const offTimer = setTimeout(() => setShowInsight(false), 10000);
      return () => {
        clearTimeout(onTimer);
        clearTimeout(offTimer);
      };
    }

    if (!hasResponse && showInsight) {
      setShowInsight(false);
    }
  }, [responses.length, showInsight, locked]);

  const nameByPid = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) map.set(p.participant_id, p.name);
    return map;
  }, [participants]);

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
  const namesList = useMemo(
    () => participants.map((p) => p.name).join(", "),
    [participants]
  );

  const MAX_VISIBLE = 24;
  const visibleResponses = responses.slice(-MAX_VISIBLE);
  const overflowCount = Math.max(0, responses.length - MAX_VISIBLE);

  const inner = (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-12 py-6">
      <h1 className="text-6xl font-bold tracking-tight">REFLECTION</h1>
      <p className="mt-2 text-lg" style={{ color: ASH }}>
        The dragons we&rsquo;re taking home.
      </p>
      {overflowCount > 0 && (
        <p className="mt-1 text-xs italic" style={{ color: ASH }}>
          Recent reflections (+{overflowCount} more)
        </p>
      )}

      <div className="mt-4 min-h-0 w-full max-w-7xl flex-1 overflow-hidden">
        {responses.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-xl italic" style={{ color: ASH }}>
              Waiting for the first reflection...
            </p>
          </div>
        ) : (
          <div className="flex h-full flex-wrap content-start justify-center gap-3 overflow-hidden">
            <AnimatePresence>
              {visibleResponses.map((r) => {
                const tilt = tiltFor(r.id);
                const name = nameByPid.get(r.participant_id) ?? "Anonymous";
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 60, rotate: tilt - 5 }}
                    animate={{ opacity: 1, y: 0, rotate: tilt }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 15,
                    }}
                    className="flex flex-col rounded-sm p-3"
                    style={{
                      backgroundColor: BONE,
                      color: "#1A1A1A",
                      width: "clamp(120px, 14vw, 200px)",
                      minHeight: "clamp(80px, 10vh, 120px)",
                      boxShadow:
                        "0 6px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.35)",
                    }}
                  >
                    <p className="flex-1 text-sm font-medium leading-snug">
                      {r.data?.text ?? ""}
                    </p>
                    <div
                      className="mt-2 flex items-center justify-end gap-1.5 text-[10px]"
                      style={{ color: "#5A5A5A" }}
                    >
                      <Avatar name={name} size={18} />
                      <span>— {name}</span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="mt-4 flex-shrink-0 text-center">
        <div
          className="text-xl font-semibold tabular-nums transition-colors"
          style={{ color: allIn ? TEAL : BONE }}
        >
          {cappedX} of {Y} submitted
        </div>
      </div>
    </div>
  );

  if (locked || compact) {
    const MAX_NOTES = 6;
    const visibleNotes = responses.slice(0, MAX_NOTES);
    const overflow = Math.max(0, responses.length - MAX_NOTES);

    return (
      <div className="flex h-full w-full flex-col text-white">
        <div
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: cohortColor }}
        >
          04 · Reflection
        </div>

        {responses.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm italic" style={{ color: ASH }}>
              No data captured
            </p>
          </div>
        ) : (
          <div className="mt-3 flex flex-1 flex-wrap items-center justify-center gap-2 overflow-hidden">
            {visibleNotes.map((r) => {
              const tilt = tiltFor(r.id);
              const name = nameByPid.get(r.participant_id) ?? "Anonymous";
              return (
                <div
                  key={r.id}
                  className="flex flex-col rounded-sm p-1.5"
                  style={{
                    backgroundColor: BONE,
                    color: "#1A1A1A",
                    width: 130,
                    minHeight: 70,
                    maxHeight: 80,
                    transform: `rotate(${tilt}deg)`,
                    boxShadow:
                      "0 3px 8px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  <p className="flex-1 overflow-hidden text-[10px] font-medium leading-tight">
                    {r.data?.text ?? ""}
                  </p>
                  <p
                    className="mt-0.5 text-right text-[8px]"
                    style={{ color: "#5A5A5A" }}
                  >
                    — {name}
                  </p>
                </div>
              );
            })}
            {overflow > 0 && (
              <div
                className="text-xs italic"
                style={{ color: ASH }}
              >
                ...and {overflow} more
              </div>
            )}
          </div>
        )}

        <p
          className="mt-3 text-center text-xs italic"
          style={{ color: ASH }}
        >
          The dragons we&rsquo;re taking home
        </p>
      </div>
    );
  }

  const insightEl = !locked ? (
    <ResearchInsight round="reflection" show={showInsight} />
  ) : null;

  if (embedded) {
    return (
      <>
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
