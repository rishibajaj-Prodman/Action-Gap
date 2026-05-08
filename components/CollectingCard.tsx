"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { RoamingMascot } from "@/components/RoamingMascot";

const TEAL = "#5BA89D";
const ASH = "#8B8680";
const BONE = "#F5F1E8";
const DIM = "#3A3835";

export interface WaitingParticipant {
  participant_id: string;
  name: string;
}

interface CollectingCardProps {
  cohort: string;
  count: number;
  total: number;
  label?: string;
  waitingFor: WaitingParticipant[];
  prompt?: ReactNode;
  mascotSize?: number;
  showMascot?: boolean;
}

export function CollectingCard({
  cohort,
  count,
  total,
  label = "submitted",
  waitingFor,
  prompt,
  mascotSize = 130,
  showMascot = true,
}: CollectingCardProps) {
  const cappedCount = Math.min(count, total);
  const allIn = total > 0 && cappedCount >= total;

  return (
    <div className="flex w-full flex-col items-center text-center">
      {showMascot && <RoamingMascot cohort={cohort} size={mascotSize} />}
      {prompt}

      {total === 0 ? (
        <p className="mt-12 text-2xl" style={{ color: ASH }}>
          Waiting for participants to join...
        </p>
      ) : (
        <>
          <div
            className="mt-6 text-8xl font-bold tabular-nums transition-colors"
            style={{ color: allIn ? TEAL : BONE }}
          >
            {cappedCount}
            <span
              className="text-5xl font-medium"
              style={{ color: allIn ? TEAL : DIM }}
            >
              {" / "}
              {total}
            </span>
          </div>
          <p
            className="mt-4 text-xl uppercase tracking-widest"
            style={{ color: allIn ? TEAL : ASH }}
          >
            {label}
          </p>

          <div className="mt-6 h-6 text-sm" style={{ color: ASH }}>
            {!allIn && waitingFor.length > 0 && (
              <span>
                Waiting for:{" "}
                <AnimatePresence mode="popLayout">
                  {waitingFor.map((p, i) => (
                    <motion.span
                      key={p.participant_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="inline-block"
                    >
                      {p.name}
                      {i < waitingFor.length - 1 ? ", " : ""}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </span>
            )}
            {allIn && (
              <span style={{ color: TEAL }}>
                Everyone&rsquo;s in. Reveal from control.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
