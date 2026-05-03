"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import MirrorPhone from "@/components/phones/MirrorPhone";
import FunnelPhone from "@/components/phones/FunnelPhone";
import CourtPhone from "@/components/phones/CourtPhone";
import ReflectionPhone from "@/components/phones/ReflectionPhone";
import { Mascot } from "@/components/mascots/Mascot";
import { CohortPattern } from "@/components/patterns/CohortPattern";
import { Avatar } from "@/components/Avatar";

const ROUND_INTRO: Record<
  string,
  { num: string; checkpoint: string; title: string; description: string }
> = {
  mirror: { num: "ROUND 1", checkpoint: "CHECKPOINT 1 OF 4", title: "THE MIRROR", description: "What we think the room thinks" },
  funnel: { num: "ROUND 2", checkpoint: "CHECKPOINT 2 OF 4", title: "THE FUNNEL", description: "How far we make it" },
  court: { num: "ROUND 3", checkpoint: "CHECKPOINT 3 OF 4", title: "THE COURT", description: "Greenwash or real?" },
  reflection: { num: "ROUND 4", checkpoint: "CHECKPOINT 4 OF 4", title: "REFLECTION", description: "What we take home" },
};

const ROUND_INTRO_KEYS = new Set(Object.keys(ROUND_INTRO));

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

type Mode = "loading" | "join" | "joined";

export default function PhoneCohortPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = titleCase(decodeURIComponent(params?.cohort ?? ""));
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;

  const [mode, setMode] = useState<Mode>("loading");
  const [name, setName] = useState("");
  const [storedName, setStoredName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentRound, setCurrentRound] = useState<string | null | undefined>(undefined);
  const [revealState, setRevealState] = useState<string | null | undefined>(undefined);
  const [roundIntro, setRoundIntro] = useState<string | null>(null);
  const [showRevealFlash, setShowRevealFlash] = useState(false);
  const prevRoundRef = useRef<string | null | undefined>(undefined);
  const prevRevealStateRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!cohort) return;
    let cancelled = false;

    (async () => {
      const pid = localStorage.getItem(`pid_${cohort}`);
      const savedName = localStorage.getItem(`name_${cohort}`);

      if (!pid || !savedName) {
        if (!cancelled) setMode("join");
        return;
      }

      const { data } = await supabase
        .from("participants")
        .select("active")
        .eq("cohort", cohort)
        .eq("participant_id", pid)
        .maybeSingle();

      if (cancelled) return;

      if (!data || data.active === false) {
        console.log("Stale participant detected, clearing localStorage");
        localStorage.removeItem(`pid_${cohort}`);
        localStorage.removeItem(`name_${cohort}`);
        setMode("join");
        return;
      }

      setStoredName(savedName);
      setMode("joined");
    })();

    return () => {
      cancelled = true;
    };
  }, [cohort]);

  useEffect(() => {
    if (mode !== "joined" || !cohort) return;
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("current_round, reveal_state")
        .eq("cohort", cohort)
        .single();
      if (active) {
        setCurrentRound((data?.current_round as string | null) ?? null);
        setRevealState((data?.reveal_state as string | null) ?? null);
      }
    })();

    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`phone-session-${cohort}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `cohort=eq.${cohort}`,
        },
        (payload) => {
          const row = payload.new as {
            current_round?: string | null;
            reveal_state?: string | null;
          };
          setCurrentRound(row?.current_round ?? null);
          setRevealState(row?.reveal_state ?? null);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [mode, cohort]);

  useEffect(() => {
    const prev = prevRoundRef.current;
    prevRoundRef.current = currentRound ?? null;

    if (prev === undefined) return;
    if (prev === currentRound) return;
    if (!currentRound || !ROUND_INTRO_KEYS.has(currentRound)) return;

    setRoundIntro(currentRound);
    const t = setTimeout(() => setRoundIntro(null), 1600);
    return () => clearTimeout(t);
  }, [currentRound]);

  useEffect(() => {
    const prev = prevRevealStateRef.current;
    prevRevealStateRef.current = revealState ?? null;

    if (prev === undefined) return;
    if (revealState !== "reveal" || prev === "reveal") return;

    setShowRevealFlash(true);
    const t = setTimeout(() => setShowRevealFlash(false), 2200);
    return () => clearTimeout(t);
  }, [revealState]);

  async function handleJoin() {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    const normalizedName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    setSubmitting(true);
    setErrorMsg("");

    const participantId = `pid_${crypto.randomUUID()}`;

    const { error } = await supabase.from("participants").insert({
      cohort,
      participant_id: participantId,
      name: normalizedName,
    });

    if (error) {
      console.error(error);
      setErrorMsg("Couldn't join. Try again.");
      setSubmitting(false);
      return;
    }

    localStorage.setItem(`pid_${cohort}`, participantId);
    localStorage.setItem(`name_${cohort}`, normalizedName);
    setStoredName(normalizedName);
    setSubmitting(false);
    setMode("joined");
  }

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-x-hidden px-6"
      style={{
        backgroundColor: "#0A0908",
        color: "#F5F1E8",
        paddingTop: "max(env(safe-area-inset-top), 3rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 3rem)",
      }}
    >
      <CohortPattern cohort={cohort} opacity={0.03} />
      <AnimatePresence>
        {showRevealFlash && (
          <motion.div
            key="reveal-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
            style={{
              backgroundColor: "#0A0908",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div
              className="text-sm font-bold uppercase tracking-[0.3em]"
              style={{ color: "#5BA89D" }}
            >
              ✨ Result revealed
            </div>
            <p className="mt-6 text-4xl font-bold" style={{ color: "#F5F1E8" }}>
              Watch the screen.
            </p>
            <p className="mt-2 text-sm" style={{ color: "#8B8680" }}>
              The {cohort} are seeing it now.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {roundIntro && ROUND_INTRO[roundIntro] && (
          <motion.div
            key={roundIntro}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
            style={{
              backgroundColor: "#0A0908",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: "#8B8680" }}
            >
              {ROUND_INTRO[roundIntro].checkpoint}
            </div>
            <div
              className="mt-2 text-xs font-bold uppercase tracking-[0.3em] sm:text-sm"
              style={{ color: cohortColor }}
            >
              {ROUND_INTRO[roundIntro].num}
            </div>
            <h1
              className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: "#F5F1E8" }}
            >
              {ROUND_INTRO[roundIntro].title}
            </h1>
            <p className="mt-3 text-base" style={{ color: "#8B8680" }}>
              {ROUND_INTRO[roundIntro].description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {mode === "joined" && storedName && (
        <div
          className="pointer-events-none fixed right-4 top-4 z-20 flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
          style={{
            backgroundColor: "rgba(245,241,232,0.05)",
            borderColor: "rgba(245,241,232,0.1)",
            paddingTop: "max(env(safe-area-inset-top), 4px)",
          }}
        >
          <Avatar name={storedName} size={22} />
          <span style={{ color: cohortColor }}>{storedName}</span>
        </div>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col">
        {mode === "loading" && null}

        {mode === "join" && (
          <div className="flex flex-1 flex-col">
            <Mascot cohort={cohort} size={64} />
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Welcome to the {cohort}.
            </h1>
            <p className="mt-2 text-sm italic" style={{ color: "#8B8680" }}>
              {theme.tagline}
            </p>
            <p className="mt-6 text-lg" style={{ color: "#8B8680" }}>
              What&rsquo;s your first name?
            </p>

            <input
              type="text"
              autoFocus
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
              inputMode="text"
              autoComplete="given-name"
              autoCapitalize="words"
              spellCheck={false}
              enterKeyHint="go"
              className="mt-10 w-full border-b bg-transparent pb-3 text-3xl font-medium outline-none placeholder:text-zinc-700"
              style={{
                color: "#F5F1E8",
                borderColor: "#3A3835",
              }}
              placeholder="Your name"
            />

            <p className="mt-3 text-sm" style={{ color: "#8B8680" }}>
              Your name will appear on the cohort poster, which we&rsquo;ll share with the class.
            </p>

            {errorMsg && (
              <p className="mt-4 text-sm" style={{ color: "#C66B5C" }}>
                {errorMsg}
              </p>
            )}

            <button
              onClick={handleJoin}
              disabled={!name.trim() || submitting}
              className="mt-12 min-h-[64px] w-full rounded-2xl text-xl font-semibold transition-transform active:scale-95 disabled:opacity-30"
              style={{
                backgroundColor: "#F5F1E8",
                color: "#0A0908",
              }}
            >
              {submitting ? "Joining..." : `Join the ${cohort}`}
            </button>
          </div>
        )}

        {mode === "joined" && (
          <>
            {currentRound === undefined && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p style={{ color: "#8B8680" }}>Loading...</p>
              </div>
            )}

            {currentRound === null || currentRound === "idle" ? (
              <div className="flex flex-1 flex-col justify-center">
                <h1 className="text-5xl font-semibold leading-tight">
                  You&rsquo;re in.
                </h1>
                <p
                  className="mt-4 text-2xl font-medium"
                  style={{ color: cohortColor }}
                >
                  Welcome, {storedName}.
                </p>
                <div className="mt-8 flex items-center gap-3">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full"
                    style={{ backgroundColor: cohortColor }}
                  />
                  <p className="text-base" style={{ color: "#8B8680" }}>
                    Watch the screen. The session will start soon.
                  </p>
                </div>
              </div>
            ) : currentRound === "mirror" ? (
              <MirrorPhone cohort={cohort} />
            ) : currentRound === "funnel" ? (
              <FunnelPhone cohort={cohort} />
            ) : currentRound === "court" ? (
              <CourtPhone cohort={cohort} />
            ) : currentRound === "reflection" ? (
              <ReflectionPhone cohort={cohort} />
            ) : currentRound === "complete" ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <h1
                  className="text-5xl font-semibold leading-tight"
                  style={{ color: cohortColor }}
                >
                  Thanks, {storedName}.
                </h1>
                <p
                  className="mt-4 text-3xl font-medium"
                  style={{ color: cohortColor }}
                >
                  The poster is yours.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
