"use client";

import { motion, AnimatePresence } from "framer-motion";
import insightsData from "@/content/research-insights.json";

type RoundKey = "mirror" | "funnel" | "court" | "reflection";

type Insight = {
  headline: string;
  claim: string;
  longClaim?: string;
  whyItMatters?: string;
  actionFraming?: string;
  citation: string;
};

const insights = insightsData as Record<RoundKey, Insight>;

interface ResearchInsightProps {
  round: RoundKey;
  show: boolean;
}

const GOLD = "#F4C95D";
const BONE = "#F5F1E8";
const ASH = "#8B8680";

export function ResearchInsight({ round, show }: ResearchInsightProps) {
  const insight = insights[round];
  if (!insight) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={round}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed bottom-32 left-1/2 z-30 -translate-x-1/2"
          style={{ width: "min(820px, calc(100% - 4rem))" }}
        >
          <div
            className="relative rounded-xl border px-7 py-5 backdrop-blur-md"
            style={{
              backgroundColor: "rgba(20, 16, 12, 0.85)",
              borderColor: "rgba(244, 201, 93, 0.45)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.45em]"
              style={{ color: GOLD }}
            >
              🔬 The theory · why this happens
            </div>
            <div
              className="mt-2 text-2xl font-bold leading-tight"
              style={{
                color: BONE,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              {insight.headline}
            </div>

            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "rgba(245, 241, 232, 0.92)" }}
            >
              {insight.longClaim ?? insight.claim}
            </p>

            {(insight.whyItMatters || insight.actionFraming) && (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {insight.whyItMatters && (
                  <div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.3em]"
                      style={{ color: GOLD }}
                    >
                      Why it matters
                    </div>
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: "rgba(245, 241, 232, 0.85)" }}
                    >
                      {insight.whyItMatters}
                    </p>
                  </div>
                )}
                {insight.actionFraming && (
                  <div>
                    <div
                      className="text-[10px] font-bold uppercase tracking-[0.3em]"
                      style={{ color: GOLD }}
                    >
                      → What to do with this
                    </div>
                    <p
                      className="mt-1 text-xs leading-relaxed"
                      style={{ color: "rgba(245, 241, 232, 0.92)" }}
                    >
                      {insight.actionFraming}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div
              className="mt-4 border-t pt-3 text-[10px] italic uppercase tracking-[0.2em]"
              style={{ color: ASH, borderColor: "rgba(244, 201, 93, 0.18)" }}
            >
              {insight.citation}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
