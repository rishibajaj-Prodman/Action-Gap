"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { useTheme } from "@/lib/theme";
import MirrorPoster from "@/components/posters/MirrorPoster";
import FunnelPoster from "@/components/posters/FunnelPoster";
import CourtPoster from "@/components/posters/CourtPoster";
import ReflectionPoster from "@/components/posters/ReflectionPoster";
import { Mascot } from "@/components/mascots/Mascot";
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
      <CohortPattern cohort={cohort} opacity={0.05} />
      {!isCompleteLayout && (
      <header
        className="relative z-10 flex flex-shrink-0 items-start justify-between gap-6 border-b px-12 py-5"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <Mascot cohort={cohort} size={48} />
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
  const builtBy = allParticipants.map((p) => p.name).join(", ");

  return (
    <>
      <header className="flex flex-shrink-0 items-center justify-between gap-6 px-12 pt-6 pb-3">
        <div className="flex items-center gap-4">
          <Mascot cohort={cohort} size={48} />
          <h1
            className="text-5xl font-bold uppercase tracking-wider"
            style={{ color: cohortColor }}
          >
            {cohort}
          </h1>
        </div>
        <span
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: ASH }}
        >
          Session complete
        </span>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden px-8 pb-2">
        <TrailCanvas
          cohort={cohort}
          currentRound="complete"
          showLabels={false}
          renderCheckpoint={(cp) => {
            const W = 320;
            const H = 280;
            return (
              <div
                className="mt-3 overflow-hidden rounded-md border"
                style={{
                  width: W,
                  height: H,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(21,17,15,0.85)",
                  padding: "12px 14px",
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
              </div>
            );
          }}
        />
      </section>

      <div className="flex flex-shrink-0 justify-center px-12 py-3">
        <a
          href={`/insights/${cohort}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border-2 px-6 py-2 text-sm font-semibold transition-colors hover:bg-white/5"
          style={{ borderColor: cohortColor, color: cohortColor }}
        >
          → View cohort insights
        </a>
      </div>

      <footer
        className="flex flex-shrink-0 items-baseline justify-between gap-6 border-t px-12 py-3 text-xs"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex-1">
          <span style={{ color: ASH }}>Built by: </span>
          {allParticipants.length > 0 ? (
            <span style={{ color: cohortColor }}>{builtBy}</span>
          ) : (
            <span className="italic" style={{ color: ASH }}>
              no participants
            </span>
          )}
        </div>
        <div style={{ color: ASH }}>
          📸 Screenshot this · The Action Gap · HHL Leipzig MBA
        </div>
      </footer>
    </>
  );
}

