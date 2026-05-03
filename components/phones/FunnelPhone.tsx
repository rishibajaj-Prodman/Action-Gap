"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

const QUESTIONS = [
  "Are you concerned about climate change?",
  "Do you believe your own behavior matters?",
  "Will you change a major behavior in 2026?",
  "Have you sustained a major behavior change for 6+ months already?",
] as const;

const TEAL = "#5BA89D";
const CLAY = "#C66B5C";
const ASH = "#8B8680";

export default function FunnelPhone({ cohort }: { cohort: string }) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;
  const [stageIdx, setStageIdx] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([null, null, null, null]);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [pidChecked, setPidChecked] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!cohort) return;
    const pid = localStorage.getItem(`pid_${cohort}`);
    setParticipantId(pid);
    setPidChecked(true);
  }, [cohort]);

  async function answer(value: boolean) {
    if (submitting || !participantId) return;
    const newAnswers = [...answers];
    newAnswers[stageIdx] = value;
    setAnswers(newAnswers);

    if (stageIdx < 3) {
      setStageIdx(stageIdx + 1);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const { error } = await supabase.from("responses").insert({
      cohort,
      round: "funnel",
      participant_id: participantId,
      data: {
        stage1: newAnswers[0],
        stage2: newAnswers[1],
        stage3: newAnswers[2],
        stage4: newAnswers[3],
      },
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
        <h1 className="text-3xl font-semibold">Submitted.</h1>
        <p className="mt-4 text-base" style={{ color: ASH }}>
          Watch the screen.
        </p>
      </div>
    );
  }

  const question = QUESTIONS[stageIdx];

  return (
    <div className="flex w-full max-w-md flex-1 flex-col">
      <div className="text-xs uppercase tracking-widest" style={{ color: ASH }}>
        {stageIdx + 1} / 4
      </div>

      <div className="mt-12 flex flex-1 flex-col justify-center sm:mt-16">
        <h1 className="text-center text-2xl font-semibold leading-snug sm:text-3xl">
          {question}
        </h1>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-12 sm:gap-4">
          <button
            onClick={() => answer(true)}
            disabled={submitting}
            className="min-h-[120px] rounded-2xl text-2xl font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[140px] sm:text-3xl"
            style={{ backgroundColor: TEAL }}
          >
            Yes
          </button>
          <button
            onClick={() => answer(false)}
            disabled={submitting}
            className="min-h-[120px] rounded-2xl text-2xl font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[140px] sm:text-3xl"
            style={{ backgroundColor: CLAY }}
          >
            No
          </button>
        </div>

        {errorMsg && (
          <p
            className="mt-4 text-center text-sm"
            style={{ color: CLAY }}
          >
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
