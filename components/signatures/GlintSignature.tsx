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

export function GlintSignature({
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
        className="absolute"
        style={{
          width: "250vmax",
          height: "120px",
          top: "50%",
          left: "50%",
          marginTop: "-60px",
          marginLeft: "-125vmax",
          background: `linear-gradient(to right, transparent 0%, ${color} 50%, transparent 100%)`,
          opacity: 0.55,
          filter: "blur(2px)",
        }}
        initial={{ x: "-150vmax", y: "-150vmax", rotate: -20 }}
        animate={{ x: "150vmax", y: "150vmax", rotate: -20 }}
        transition={{ duration, ease: easing, delay: delay / 1000 }}
        onAnimationComplete={onComplete}
      />
    </div>
  );
}
