"use client";

import { motion, AnimatePresence } from "framer-motion";
import insightsData from "@/content/research-insights.json";

type RoundKey = "mirror" | "funnel" | "court" | "reflection";

type Insight = { headline: string; claim: string; citation: string };

const insights = insightsData as Record<RoundKey, Insight>;

interface ResearchInsightProps {
  round: RoundKey;
  show: boolean;
}

const GOLD = "#F4C95D";

export function ResearchInsight({ round, show }: ResearchInsightProps) {
  const insight = insights[round];
  if (!insight) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={round}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="pointer-events-none fixed bottom-44 left-1/2 z-30 -translate-x-1/2"
          style={{ maxWidth: "640px", width: "calc(100% - 4rem)" }}
        >
          <div
            className="rounded-lg border px-6 py-4 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(244, 201, 93, 0.10)",
              borderColor: "rgba(244, 201, 93, 0.4)",
            }}
          >
            <div
              className="mb-1 text-xs uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              🔬 Did you know?
            </div>
            <div
              className="mb-1 text-base font-semibold"
              style={{ color: "#F5F1E8" }}
            >
              {insight.headline}
            </div>
            <div
              className="mb-2 text-sm"
              style={{ color: "rgba(245, 241, 232, 0.9)" }}
            >
              {insight.claim}
            </div>
            <div className="text-xs italic" style={{ color: "#8B8680" }}>
              {insight.citation}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
