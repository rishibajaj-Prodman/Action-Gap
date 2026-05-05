"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { useTheme } from "@/lib/theme";
import MirrorPoster from "@/components/posters/MirrorPoster";
import FunnelPoster from "@/components/posters/FunnelPoster";
import CourtPoster from "@/components/posters/CourtPoster";
import ReflectionPoster from "@/components/posters/ReflectionPoster";
import { Mascot } from "@/components/mascots/Mascot";
import { LiveMascot } from "@/components/mascots/LiveMascot";
import { CohortPattern } from "@/components/patterns/CohortPattern";
import { Avatar } from "@/components/Avatar";
import { TrailCanvas, type TrailRound } from "@/components/TrailCanvas";

const COHORT_SINGULAR: Record<string, string> = {
  Dolphins: "Dolphin",
  Foxes: "Fox",
  Elephants: "Elephant",
};

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";

type SessionRow = {
  cohort: string;
  current_round: string | null;
  reveal_state: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type ParticipantRow = {
  participant_id: string;
  name: string;
  joined_at: string;
  active: boolean;
};

type Status = "not_started" | "live" | "ended";

function deriveStatus(s: SessionRow | null): Status {
  if (!s || !s.started_at) return "not_started";
  if (!s.ended_at) return "live";
  return "ended";
}

export default function PosterPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;
  const singular = COHORT_SINGULAR[cohort] ?? cohort;

  const [session, setSession] = useState<SessionRow | null>(null);
  const [allParticipants, setAllParticipants] = useState<ParticipantRow[]>([]);
  const [origin, setOrigin] = useState<string>("");
  const [showRevealFlash, setShowRevealFlash] = useState(false);
  const prevRevealStateRef = useRef<string | null | undefined>(undefined);

  const participants = useMemo(
    () => allParticipants.filter((p) => p.active),
    [allParticipants]
  );

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const fetchData = useCallback(async () => {
    if (!cohort) return;

    const { data: sess } = await supabase
      .from("sessions")
      .select("cohort, current_round, reveal_state, started_at, ended_at")
      .eq("cohort", cohort)
      .single();
    setSession((sess as SessionRow) ?? null);

    const { data: parts } = await supabase
      .from("participants")
      .select("participant_id, name, joined_at, active")
      .eq("cohort", cohort)
      .order("joined_at", { ascending: true });
    if (parts) setAllParticipants(parts as ParticipantRow[]);
  }, [cohort]);

  useEffect(() => {
    if (!cohort) return;
    let active = true;

    async function loadParticipants() {
      const { data } = await supabase
        .from("participants")
        .select("participant_id, name, joined_at, active")
        .eq("cohort", cohort)
        .order("joined_at", { ascending: true });
      if (active && data) setAllParticipants(data as ParticipantRow[]);
    }

    fetchData();

    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`poster-${cohort}-${channelId}`)
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
          setAllParticipants((prev) =>
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
  }, [cohort, fetchData]);

  useVisibilityRefetch(fetchData);

  useEffect(() => {
    const prev = prevRevealStateRef.current;
    const current = session?.reveal_state;
    prevRevealStateRef.current = current;

    if (prev === undefined) return;
    if (current !== "reveal" || prev === "reveal") return;

    setShowRevealFlash(true);
    const t = setTimeout(() => setShowRevealFlash(false), 1200);
    return () => clearTimeout(t);
  }, [session?.reveal_state]);

  const status = deriveStatus(session);
  const currentRound = session?.current_round ?? "idle";
  const namesList = useMemo(
    () => participants.map((p) => p.name).join(", "),
    [participants]
  );
  const phoneUrl = origin ? `${origin}/phone/${cohort}` : "";

  const isActiveRound =
    status === "live" &&
    (currentRound === "mirror" ||
      currentRound === "funnel" ||
      currentRound === "court" ||
      currentRound === "reflection");
  const isCompleteLayout =
    status === "ended" || currentRound === "complete";
  const isIdleLayout = !isActiveRound && !isCompleteLayout;

  const showSmallQR = isActiveRound;

  return (
    <main
      className="relative flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: INK, color: BONE }}
    >
      <CohortPattern cohort={cohort} opacity={0.11} />

      <AnimatePresence>
        {showRevealFlash && (
          <motion.div
            key="poster-reveal-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{
              backgroundColor: "rgba(10, 9, 8, 0.92)",
              backdropFilter: "blur(8px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center"
            >
              <LiveMascot cohort={cohort} size={120} intensity="active" />
              <div
                className="mt-5 text-xs font-bold uppercase tracking-[0.5em]"
                style={{ color: cohortColor }}
              >
                Revealing
              </div>
              <div
                className="mt-3 text-7xl font-bold uppercase tracking-wider"
                style={{
                  color: BONE,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                {cohort}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isCompleteLayout && (
      <header
        className="relative z-10 flex flex-shrink-0 items-start justify-between gap-6 border-b px-12 py-5"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <LiveMascot cohort={cohort} size={64} />
            <h1
              className="text-5xl font-bold uppercase tracking-wider"
              style={{ color: cohortColor }}
            >
              {cohort}
            </h1>
          </div>
          <span className="text-sm italic" style={{ color: ASH }}>
            {theme.tagline}
          </span>
          {participants.length === 0 ? (
            <span className="mt-1 text-sm italic" style={{ color: ASH }}>
              Waiting for the first {singular}...
            </span>
          ) : (
            <div className="mt-2 flex items-center gap-1">
              {participants.slice(0, 8).map((p) => (
                <Avatar
                  key={p.participant_id}
                  name={p.name}
                  size={32}
                  className="ring-2"
                />
              ))}
              {participants.length > 8 && (
                <span
                  className="ml-2 text-sm font-medium"
                  style={{ color: ASH }}
                >
                  +{participants.length - 8} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-2">
          {status === "not_started" && (
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: ASH }}
            >
              Session not started
            </span>
          )}
          {status === "live" && (
            <span
              className="animate-pulse text-xs font-bold uppercase tracking-widest"
              style={{ color: cohortColor }}
            >
              ● Live
            </span>
          )}
        </div>
      </header>
      )}

      {isIdleLayout && status === "not_started" && (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-12 py-6 text-center">
          <p className="text-3xl italic" style={{ color: ASH }}>
            Session starts soon...
          </p>
          <p className="mt-2 text-lg italic" style={{ color: ASH }}>
            {theme.tagline}
          </p>
          <div className="mt-6 h-32 w-full max-w-5xl">
            <TrailCanvas
              cohort={cohort}
              currentRound="idle"
            />
          </div>
        </section>
      )}

      {isIdleLayout && status !== "not_started" && (
        <section className="relative min-h-0 flex-1 overflow-hidden px-12 py-8">
          {phoneUrl && (
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
              <span
                className="text-xl font-bold"
                style={{ color: cohortColor }}
              >
                Scan to join the {cohort}
              </span>
              <div className="rounded-md bg-white p-4">
                <QRCodeSVG value={phoneUrl} size={260} />
              </div>
            </div>
          )}
          <div className="h-full w-full opacity-50">
            <TrailCanvas cohort={cohort} currentRound="idle" />
          </div>
        </section>
      )}

      {isActiveRound && (
        <>
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {currentRound === "mirror" && (
              <MirrorPoster cohort={cohort} embedded />
            )}
            {currentRound === "funnel" && (
              <FunnelPoster cohort={cohort} embedded />
            )}
            {currentRound === "court" && (
              <CourtPoster cohort={cohort} embedded />
            )}
            {currentRound === "reflection" && (
              <ReflectionPoster cohort={cohort} embedded />
            )}
          </section>

          <div
            className="flex-shrink-0 overflow-hidden border-t px-12 py-4"
            style={{
              borderColor: "rgba(255,255,255,0.1)",
              height: "120px",
            }}
          >
            <TrailCanvas
              cohort={cohort}
              currentRound={currentRound as TrailRound}
              participantNames={participants.map((p) => p.name)}
            />
          </div>
        </>
      )}

      {isCompleteLayout && (
        <FinalPoster
          cohort={cohort}
          cohortColor={cohortColor}
          allParticipants={allParticipants}
        />
      )}

      {showSmallQR && phoneUrl && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3">
          <span className="text-xs" style={{ color: ASH }}>
            Latecomers can still join
          </span>
          <div className="rounded-md bg-white p-2">
            <QRCodeSVG value={phoneUrl} size={140} />
          </div>
        </div>
      )}

    </main>
  );
}


function FinalPoster({
  cohort,
  cohortColor,
  allParticipants,
}: {
  cohort: string;
  cohortColor: string;
  allParticipants: ParticipantRow[];
}) {
  const names = allParticipants.map((p) => p.name);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-shrink-0 items-end justify-between gap-6 px-12 pt-8 pb-4"
      >
        <div className="flex items-center gap-5">
          <LiveMascot cohort={cohort} size={80} />
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.4em]"
              style={{ color: ASH }}
            >
              Session complete
            </div>
            <h1
              className="text-7xl font-bold leading-none tracking-tight"
              style={{
                color: cohortColor,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              {cohort}
            </h1>
          </div>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="text-xs italic"
          style={{ color: ASH }}
        >
          The Action Gap · HHL Leipzig MBA
        </motion.span>
      </motion.header>

      <section className="relative min-h-0 flex-1 overflow-hidden px-8 pb-2">
        <TrailCanvas
          cohort={cohort}
          currentRound="complete"
          showLabels={false}
          renderCheckpoint={(cp) => {
            const W = 320;
            const H = 280;
            const cpDelay =
              { mirror: 0.6, funnel: 1.0, court: 1.4, reflection: 1.8 }[
                cp.id as "mirror" | "funnel" | "court" | "reflection"
              ] ?? 0.6;
            return (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: cpDelay,
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-3 overflow-hidden rounded-md border"
                style={{
                  width: W,
                  height: H,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(21,17,15,0.85)",
                  padding: "12px 14px",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
                }}
              >
                {cp.id === "mirror" && (
                  <MirrorPoster cohort={cohort} locked />
                )}
                {cp.id === "funnel" && (
                  <FunnelPoster cohort={cohort} locked />
                )}
                {cp.id === "court" && (
                  <CourtPoster cohort={cohort} locked />
                )}
                {cp.id === "reflection" && (
                  <ReflectionPoster cohort={cohort} locked />
                )}
              </motion.div>
            );
          }}
        />
      </section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4, duration: 0.6 }}
        className="flex flex-shrink-0 justify-center px-12 py-3"
      >
        <a
          href={`/insights/${cohort}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border-2 px-7 py-2.5 text-base font-semibold transition-colors hover:bg-white/5"
          style={{ borderColor: cohortColor, color: cohortColor }}
        >
          → View cohort insights
        </a>
      </motion.div>

      <footer
        className="flex flex-shrink-0 flex-col gap-2 border-t px-12 py-4 text-xs"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span style={{ color: ASH }}>Built by:</span>
          {names.length === 0 ? (
            <span className="italic" style={{ color: ASH }}>
              no participants
            </span>
          ) : (
            names.map((n, i) => (
              <motion.span
                key={`${n}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.7 + i * 0.04, duration: 0.3 }}
                style={{ color: cohortColor }}
              >
                {n}
                {i < names.length - 1 && (
                  <span style={{ color: ASH }} className="mx-1">·</span>
                )}
              </motion.span>
            ))
          )}
        </div>
        <div className="flex justify-end" style={{ color: ASH }}>
          📸 Screenshot this
        </div>
      </footer>
    </>
  );
}

