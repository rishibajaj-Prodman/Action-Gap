"use client";

import { motion } from "framer-motion";
import type { ParsedEasing } from "./Signature";

interface SigProps {
  color: string;
  timing: number;
  easing: ParsedEasing;
  delay?: number;
  onComplete?: () => void;
}

export function HorizonSignature({
  color,
  timing,
  easing,
  delay = 0,
  onComplete,
}: SigProps) {
  const duration = timing / 1000;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <motion.div
        className="absolute left-0 right-0"
        style={{
          height: "2px",
          backgroundColor: color,
          top: 0,
          boxShadow: `0 0 12px ${color}88`,
        }}
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: "50vh", opacity: [0, 1, 1, 0] }}
        transition={{
          y: { duration, ease: easing, delay: delay / 1000 },
          opacity: {
            duration,
            times: [0, 0.15, 0.85, 1],
            delay: delay / 1000,
          },
        }}
        onAnimationComplete={onComplete}
      />
    </div>
  );
}
