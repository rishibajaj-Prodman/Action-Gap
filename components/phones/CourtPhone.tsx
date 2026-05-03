"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import ceoPairs from "@/content/ceo-pairs.json";

const TEAL = "#5BA89D";
const CLAY = "#C66B5C";
const ASH = "#8B8680";
const BONE = "#F5F1E8";

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

export default function CourtPhone({ cohort }: { cohort: string }) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;

  const [step, setStep] = useState(0);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
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

  async function vote(choice: Vote) {
    if (submitting || !participantId) return;
    const pair = PAIRS[step];
    if (!pair) return;

    const newVerdicts = [...verdicts, { pairId: pair.id, vote: choice }];
    setVerdicts(newVerdicts);

    if (newVerdicts.length < PAIRS.length) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const { error } = await supabase.from("responses").insert({
      cohort,
      round: "court",
      participant_id: participantId,
      data: { verdicts: newVerdicts },
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

  const pair = PAIRS[step];
  if (!pair) return null;

  return (
    <div className="flex w-full max-w-md flex-1 flex-col">
      <div className="text-xs uppercase tracking-widest" style={{ color: ASH }}>
        Card {step + 1} / {PAIRS.length}
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <div
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: cohortColor }}
        >
          {pair.company} · {pair.year}
        </div>

        <p
          className="mt-4 text-base italic leading-relaxed sm:text-lg"
          style={{ color: BONE }}
        >
          &ldquo;{pair.quote}&rdquo;
        </p>

        <div
          className="mt-5 text-xs uppercase tracking-widest"
          style={{ color: ASH }}
        >
          What actually happened:
        </div>
        <p
          className="mt-2 text-sm leading-relaxed sm:text-base"
          style={{ color: BONE }}
        >
          {pair.reality}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
          <button
            onClick={() => vote("greenwash")}
            disabled={submitting}
            className="min-h-[100px] rounded-2xl text-lg font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[120px] sm:text-xl"
            style={{ backgroundColor: CLAY }}
          >
            Greenwash
          </button>
          <button
            onClick={() => vote("real")}
            disabled={submitting}
            className="min-h-[100px] rounded-2xl text-lg font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[120px] sm:text-xl"
            style={{ backgroundColor: TEAL }}
          >
            Real progress
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
