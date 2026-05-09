"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

const ASH = "#8B8680";
const BONE = "#F5F1E8";
const CLAY = "#C66B5C";
const HAIRLINE = "#3A3835";
const MAX_LEN = 160;

export default function ReflectionPhone({ cohort }: { cohort: string }) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;

  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [pidChecked, setPidChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!cohort) return;
    const pid = localStorage.getItem(`pid_${cohort}`);
    const savedName = localStorage.getItem(`name_${cohort}`);
    setParticipantId(pid);
    setName(savedName ?? "");
    setPidChecked(true);
  }, [cohort]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || submitting || !participantId) return;
    setSubmitting(true);
    setErrorMsg(null);
    const { error } = await supabase.from("responses").insert({
      cohort,
      round: "reflection",
      participant_id: participantId,
      data: { text: trimmed },
    });
    if (error) {
      console.error(error);
      if (error.code === "23505") {
        setAlreadySubmitted(true);
      } else {
        setErrorMsg("Couldn't submit — tap to retry.");
      }
      setSubmitting(false);
      return;
    }
    setDone(true);
    setSubmitting(false);
  }

  if (alreadySubmitted) {
    return (
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-6 h-2 w-2 animate-pulse rounded-full"
          style={{ backgroundColor: cohortColor }}
        />
        <h1 className="text-3xl font-semibold">You&rsquo;ve already submitted.</h1>
        <p className="mt-4 text-base" style={{ color: ASH }}>
          Watch the screen for the reveal.
        </p>
      </div>
    );
  }

  if (pidChecked && !participantId) {
    return (
      <div className="flex w-full max-w-md flex-1 flex-col justify-center text-center">
        <h1 className="text-2xl font-semibold">Please rejoin via /phone/{cohort}</h1>
        <p className="mt-3 text-sm" style={{ color: ASH }}>
          We couldn&rsquo;t find your participant ID on this device.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-6 h-2 w-2 animate-pulse rounded-full"
          style={{ backgroundColor: cohortColor }}
        />
        <h1
          className="text-4xl font-semibold leading-tight"
          style={{ color: cohortColor }}
        >
          Thanks, {name || "friend"}.
        </h1>
        <p
          className="mt-4 text-2xl font-medium"
          style={{ color: cohortColor }}
        >
          The poster is yours.
        </p>
      </div>
    );
  }

  const counterColor = text.length >= MAX_LEN - 10 ? CLAY : ASH;

  return (
    <div className="relative flex w-full max-w-md flex-1 flex-col">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-2 select-none text-3xl"
        animate={{ y: [0, -6, 0], rotate: [-4, 4, -4] }}
        transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
      >
        🐉
      </motion.div>

      <h1
        className="text-3xl font-semibold leading-tight sm:text-4xl"
        style={{ color: cohortColor }}
      >
        Name the dragon.
      </h1>
      <p className="mt-1 text-xs italic" style={{ color: ASH }}>
        Gifford&rsquo;s 7 dragons of inaction &middot; the barriers inside us
      </p>

      <div
        className="mt-3 rounded-md border-l-2 pl-3 text-[11px] leading-relaxed"
        style={{ borderColor: cohortColor, color: ASH }}
      >
        <p>
          <span style={{ color: cohortColor, fontWeight: 600 }}>The mirror</span>{" "}
          said we underestimate each other.
        </p>
        <p>
          <span style={{ color: cohortColor, fontWeight: 600 }}>The funnel</span>{" "}
          said most of us drop off before action.
        </p>
        <p>
          <span style={{ color: cohortColor, fontWeight: 600 }}>The court</span>{" "}
          said greenwash mostly works.
        </p>
      </div>

      <p className="mt-5 text-base font-semibold" style={{ color: BONE }}>
        So — what&rsquo;s the <span style={{ color: cohortColor }}>ONE thing</span>{" "}
        you&rsquo;ll start in the next{" "}
        <span style={{ color: cohortColor }}>30 days</span>?
      </p>
      <p className="mt-1 text-xs italic" style={{ color: ASH }}>
        Specific action. A real date. Small enough that you&rsquo;ll actually do it.
      </p>

      <div
        className="relative mt-5 rounded-xl p-4"
        style={{
          backgroundColor: "rgba(255,255,255,0.04)",
          border: `1px solid ${HAIRLINE}`,
        }}
      >
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          maxLength={MAX_LEN}
          rows={4}
          inputMode="text"
          autoCapitalize="sentences"
          enterKeyHint="done"
          placeholder="e.g., Switch my bank by Dec 1 — book the appointment tomorrow."
          className="w-full resize-none bg-transparent text-base font-medium leading-relaxed outline-none placeholder:text-zinc-700 sm:text-lg"
          style={{ color: BONE }}
        />
        <div
          className="mt-2 text-right text-xs tabular-nums"
          style={{ color: counterColor }}
        >
          {text.length} / {MAX_LEN}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={!text.trim() || submitting}
        className="mt-10 min-h-[64px] w-full rounded-2xl text-xl font-semibold transition-transform active:scale-95 disabled:opacity-30"
        style={{ backgroundColor: BONE, color: "#0A0908" }}
      >
        {submitting ? "Submitting..." : "Pin it to the wall"}
      </button>

      {errorMsg && (
        <p className="mt-4 text-center text-sm" style={{ color: CLAY }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
