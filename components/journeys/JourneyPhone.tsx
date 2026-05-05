"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { Mascot } from "@/components/mascots/Mascot";
import MirrorPoster from "@/components/posters/MirrorPoster";
import FunnelPoster from "@/components/posters/FunnelPoster";
import CourtPoster from "@/components/posters/CourtPoster";
import ReflectionPoster from "@/components/posters/ReflectionPoster";

type ParticipantRow = { participant_id: string; name: string };

const ASH = "#8B8680";

const CARD_STYLE: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.08)",
  backgroundColor: "rgba(21,17,15,0.85)",
};

export default function JourneyPhone({ cohort }: { cohort: string }) {
  const theme = useTheme(cohort);
  const cohortColor = theme.primary;
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);

  useEffect(() => {
    if (!cohort) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("participants")
        .select("participant_id, name, joined_at")
        .eq("cohort", cohort)
        .order("joined_at", { ascending: true });
      if (alive && data) {
        setParticipants(
          data.map((d) => ({ participant_id: d.participant_id, name: d.name }))
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [cohort]);

  const builtBy = participants.map((p) => p.name).join(", ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex w-full flex-1 flex-col"
    >
      <div className="flex flex-col items-center text-center">
        <Mascot cohort={cohort} size={40} />
        <div
          className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: ASH }}
        >
          Session complete · The poster is yours
        </div>
        <h1
          className="mt-1 text-3xl font-bold uppercase tracking-wider"
          style={{ color: cohortColor }}
        >
          {cohort}
        </h1>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 landscape:grid-cols-2 landscape:auto-rows-fr">
        <div className="h-44 rounded-md border p-3" style={CARD_STYLE}>
          <MirrorPoster cohort={cohort} locked />
        </div>
        <div className="h-44 rounded-md border p-3" style={CARD_STYLE}>
          <FunnelPoster cohort={cohort} locked />
        </div>
        <div className="h-44 rounded-md border p-3" style={CARD_STYLE}>
          <CourtPoster cohort={cohort} locked />
        </div>
        <div className="h-44 rounded-md border p-3" style={CARD_STYLE}>
          <ReflectionPoster cohort={cohort} locked />
        </div>
      </div>

      <div className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: ASH }}>
        <span>Built by: </span>
        <span style={{ color: cohortColor }}>{builtBy || "—"}</span>
      </div>

      <a
        href={`/insights/${cohort}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border-2 py-3 text-base font-semibold transition-colors"
        style={{ borderColor: cohortColor, color: cohortColor }}
      >
        → View insights
      </a>

      <p
        className="mt-3 text-center text-[10px]"
        style={{ color: ASH }}
      >
        📸 Screenshot this · The Action Gap · HHL Leipzig MBA
      </p>
    </motion.div>
  );
}
