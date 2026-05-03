"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

type Step = "predict" | "belief" | "done";

export default function MirrorPhone({ cohort }: { cohort: string }) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;
  const [step, setStep] = useState<Step>("predict");
  const [prediction, setPrediction] = useState(50);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [pidChecked, setPidChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!cohort) return;
    const pid = localStorage.getItem(`pid_${cohort}`);
    setParticipantId(pid);
    setPidChecked(true);
  }, [cohort]);

  async function submit(belief: boolean) {
    if (!participantId || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    const { error } = await supabase.from("responses").insert({
      cohort,
      round: "mirror",
      participant_id: participantId,
      data: { prediction, belief },
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
    setStep("done");
  }

  if (alreadySubmitted) {
    return (
      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <span
          className="mb-6 h-2 w-2 animate-pulse rounded-full"
          style={{ backgroundColor: cohortColor }}
        />
        <h1 className="text-3xl font-semibold">You&rsquo;ve already submitted.</h1>
        <p className="mt-4 text-base" style={{ color: "#8B8680" }}>
          Watch the screen for the reveal.
        </p>
      </div>
    );
  }

  if (pidChecked && !participantId) {
    return (
      <div className="flex w-full max-w-md flex-1 flex-col justify-center text-center">
        <h1 className="text-2xl font-semibold">Please rejoin via /phone/{cohort}</h1>
        <p className="mt-3 text-sm" style={{ color: "#8B8680" }}>
          We couldn&rsquo;t find your participant ID on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-1 flex-col">
      <div className="text-xs uppercase tracking-widest" style={{ color: "#8B8680" }}>
        Cohort: {cohort}
      </div>

      <div className="mt-12 flex flex-1 flex-col">
        {step === "predict" && (
          <>
            <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">
              What % of this cohort thinks climate action is urgent?
            </h1>
            <div className="mt-12 text-center text-6xl font-bold leading-none tabular-nums sm:text-7xl">
              {prediction}%
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={prediction}
              onChange={(e) => setPrediction(Number(e.target.value))}
              aria-label="Prediction percentage"
              className="mt-8 w-full"
            />
            <button
              onClick={() => setStep("belief")}
              className="mt-12 min-h-[64px] w-full rounded-2xl bg-white text-xl font-semibold text-black active:scale-95 transition-transform"
            >
              Next
            </button>
          </>
        )}

        {step === "belief" && (
          <>
            <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">
              Do YOU think climate action is urgent?
            </h1>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={() => submit(true)}
                disabled={submitting}
                className="min-h-[120px] rounded-2xl bg-emerald-500 text-2xl font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[140px] sm:text-3xl"
              >
                Yes
              </button>
              <button
                onClick={() => submit(false)}
                disabled={submitting}
                className="min-h-[120px] rounded-2xl bg-rose-500 text-2xl font-bold text-black active:scale-95 transition-transform disabled:opacity-50 sm:min-h-[140px] sm:text-3xl"
              >
                No
              </button>
            </div>
            {errorMsg && (
              <p
                className="mt-4 text-center text-sm"
                style={{ color: "#C66B5C" }}
              >
                {errorMsg}
              </p>
            )}
          </>
        )}

        {step === "done" && (
          <div className="mt-24 flex flex-col items-center text-center">
            <span
              className="mb-6 h-2 w-2 animate-pulse rounded-full"
              style={{ backgroundColor: cohortColor }}
            />
            <h1 className="text-3xl font-semibold">Submitted</h1>
            <p className="mt-4" style={{ color: "#8B8680" }}>
              Waiting for the others...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
