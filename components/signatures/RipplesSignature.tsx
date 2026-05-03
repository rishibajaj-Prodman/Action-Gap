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

export function RipplesSignature({
  color,
  timing,
  easing,
  delay = 0,
  onComplete,
}: SigProps) {
  const duration = timing / 1000;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: 200,
            height: 200,
            marginTop: -100,
            marginLeft: -100,
            borderRadius: "9999px",
            border: `2px solid ${color}`,
            boxShadow: `0 0 24px ${color}66`,
          }}
          initial={{ scale: 0.1, opacity: 0.6 }}
          animate={{ scale: 8, opacity: 0 }}
          transition={{
            duration,
            ease: easing,
            delay: delay / 1000 + i * 0.2,
          }}
          onAnimationComplete={() => {
            if (i === 2 && onComplete) onComplete();
          }}
        />
      ))}
    </div>
  );
}
