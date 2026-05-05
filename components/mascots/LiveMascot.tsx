"use client";

import { motion, type Transition } from "framer-motion";
import { Mascot } from "./Mascot";
import { useTheme } from "@/lib/theme";

interface LiveMascotProps {
  cohort: string;
  size?: number;
  className?: string;
  intensity?: "ambient" | "active";
}

type MotionConfig = {
  animate: Record<string, number[]>;
  transition: Transition;
};

const MOTION: Record<"dolphin" | "fox" | "elephant", MotionConfig> = {
  dolphin: {
    animate: {
      y: [0, -14, 0, 6, 0],
      rotate: [0, -4, 0, 3, 0],
    },
    transition: { duration: 4.6, ease: "easeInOut", repeat: Infinity },
  },
  fox: {
    animate: {
      x: [0, 8, 0, -4, 0],
      y: [0, -3, 0, -2, 0],
      rotate: [0, 2, 0, -2, 0],
    },
    transition: { duration: 5.2, ease: "easeInOut", repeat: Infinity },
  },
  elephant: {
    animate: {
      rotate: [-1.5, 1.5, -1.5],
      y: [0, -4, 0],
    },
    transition: { duration: 6.4, ease: "easeInOut", repeat: Infinity },
  },
};

export function LiveMascot({
  cohort,
  size = 120,
  className = "",
  intensity = "ambient",
}: LiveMascotProps) {
  const theme = useTheme(cohort);
  const base = MOTION[theme.mascot] ?? MOTION.dolphin;

  const animate =
    intensity === "active"
      ? Object.fromEntries(
          Object.entries(base.animate).map(([k, vals]) => [
            k,
            (vals as number[]).map((v) => v * 1.4),
          ])
        )
      : base.animate;

  return (
    <motion.div
      animate={animate}
      transition={base.transition}
      className={`inline-block ${className}`}
      aria-hidden
    >
      <Mascot cohort={cohort} size={size} />
    </motion.div>
  );
}
