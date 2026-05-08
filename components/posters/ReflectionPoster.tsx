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

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
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

  const [session, setSession] = useState<SessionRow | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [showInsight, setShowInsight] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const prevRevealStateRef = useRef<string | null | undefined>(undefined);
  const prevSignatureRevealRef = useRef<string | null | undefined>(undefined);

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

    if (current === "reveal" && prev && prev !== "reveal" && !locked) {
      const onTimer = setTimeout(() => setShowInsight(true), 2500);
      return () => clearTimeout(onTimer);
    }

    if (current !== "reveal" && showInsight) {
      setShowInsight(false);
    }
  }, [session?.reveal_state, showInsight, locked]);

  useEffect(() => {
    const prev = prevSignatureRevealRef.current;
    const current = session?.reveal_state;
    prevSignatureRevealRef.current = current;

    if (current === "reveal" && prev && prev !== "reveal") {
      const t = setTimeout(() => setShowSignature(true), 1200);
      return () => clearTimeout(t);
    }

    if (current !== "reveal" && showSignature) {
      setShowSignature(false);
    }
  }, [session?.reveal_state, showSignature]);

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
  const waitingFor = useMemo(
    () => participants.filter((p) => !submittedSet.has(p.participant_id)),
    [participants, submittedSet]
  );
  const namesList = useMemo(
    () => participants.map((p) => p.name).join(", "),
    [participants]
  );

  const revealState = session?.reveal_state ?? "collecting";
  const isRevealing = revealState === "reveal";

  const MAX_VISIBLE = 24;
  const visibleResponses = responses.slice(-MAX_VISIBLE);
  const overflowCount = Math.max(0, responses.length - MAX_VISIBLE);

  const inner = (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-12 py-6">
      <h1 className="text-6xl font-bold tracking-tight">REFLECTION</h1>
      <p className="mt-2 text-lg" style={{ color: ASH }}>
        The dragons we&rsquo;re taking home.
      </p>
      {isRevealing && overflowCount > 0 && (
        <p className="mt-1 text-xs italic" style={{ color: ASH }}>
          Recent reflections (+{overflowCount} more)
        </p>
      )}

      <AnimatePresence mode="wait">
        {!isRevealing ? (
          <motion.div
            key="collecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.92, y: -28 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-4"
          >
            <CollectingCard
              cohort={cohort}
              count={X}
              total={Y}
              label="dragons named"
              waitingFor={waitingFor}
              prompt={
                <>
                  <div
                    className="max-w-2xl text-2xl font-medium leading-snug"
                    style={{ color: BONE }}
                  >
                    We saw the gap. The drop-off. The greenwash.
                    <br />
                    So — what&rsquo;s{" "}
                    <span style={{ color: cohortColor, fontWeight: 700 }}>
                      ONE thing
                    </span>{" "}
                    you&rsquo;ll start in the next{" "}
                    <span style={{ color: cohortColor, fontWeight: 700 }}>
                      30 days
                    </span>
                    ?
                  </div>
                  <p
                    className="mt-3 text-sm italic"
                    style={{ color: ASH }}
                  >
                    Specific. Dated. Small enough that it&rsquo;ll actually
                    happen.
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
            className="relative mt-4 min-h-0 w-full max-w-7xl flex-1 overflow-hidden"
          >
            {responses.length > 0 && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute z-20 select-none text-5xl"
                initial={{ x: "-12vw", y: "20vh", rotate: -8, opacity: 0 }}
                animate={{
                  x: "110vw",
                  y: ["20vh", "8vh", "28vh", "12vh"],
                  rotate: [-8, 4, -6, 2],
                  opacity: [0, 1, 1, 0.9, 0],
                }}
                transition={{
                  duration: 7,
                  delay: 0.8,
                  times: [0, 0.15, 0.45, 0.75, 1],
                  ease: "easeInOut",
                }}
              >
                🐉
              </motion.div>
            )}
            {responses.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <p className="text-xl italic" style={{ color: ASH }}>
                  No reflections were submitted.
                </p>
              </div>
            ) : (
              <div className="flex h-full flex-wrap content-start justify-center gap-4 overflow-hidden">
                <AnimatePresence>
                  {visibleResponses.map((r, i) => {
                    const tilt = tiltFor(r.id);
                    const name = nameByPid.get(r.participant_id) ?? "Anonymous";
                    const dropDelay = Math.min(i * 0.09, 1.8);
                    const isLong = (r.data?.text?.length ?? 0) > 90;
                    return (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: -120, rotate: tilt - 8, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
                        exit={{ opacity: 0, y: 30 }}
                        transition={{
                          type: "spring",
                          stiffness: 110,
                          damping: 13,
                          delay: dropDelay,
                        }}
                        className="flex flex-col rounded-sm p-4"
                        style={{
                          backgroundColor: BONE,
                          color: "#1A1A1A",
                          width: isLong ? "clamp(180px, 20vw, 260px)" : "clamp(140px, 15vw, 220px)",
                          minHeight: isLong ? "clamp(120px, 13vh, 160px)" : "clamp(90px, 10vh, 130px)",
                          boxShadow:
                            "0 12px 28px rgba(0,0,0,0.50), 0 4px 8px rgba(0,0,0,0.40)",
                        }}
                      >
                        <p
                          className="flex-1 leading-snug"
                          style={{
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontStyle: "italic",
                            fontSize: isLong ? "1rem" : "0.9rem",
                          }}
                        >
                          &ldquo;{r.data?.text ?? ""}&rdquo;
                        </p>
                        <div
                          className="mt-3 flex items-center justify-end gap-1.5 text-[10px]"
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
          </motion.div>
        )}
      </AnimatePresence>

      {isRevealing && (
        <div className="mt-4 flex-shrink-0 text-center">
          <div
            className="text-xl font-semibold tabular-nums"
            style={{ color: TEAL }}
          >
            {cappedX} of {Y} reflections
          </div>
        </div>
      )}
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

  const signatureEl = (
    <Signature
      cohort={cohort}
      trigger={showSignature && !locked}
      onComplete={() => setShowSignature(false)}
    />
  );

  const statusPill = !locked && !compact ? (
    <StatusPill
      cohortColor={cohortColor}
      state={isRevealing ? "reveal" : "collecting"}
      submitted={cappedX}
      total={Y}
    />
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
