"use client";

import { motion, type Transition } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Mascot } from "./mascots/Mascot";

interface RoamingMascotProps {
  cohort: string;
  size?: number;
  bandHeight?: number;
}

type Roam = {
  animate: Record<string, (string | number)[] | number>;
  transition: Transition;
  opacity: number;
};

const ROAM: Record<"dolphin" | "fox" | "elephant", Roam> = {
  // Porpoises across — peaks above the water line, dives below, body rotates
  // along the path tangent (nose up rising, nose down descending).
  dolphin: {
    animate: {
      x: [-820, -410, 0, 410, 820],
      y: [0, -55, 0, 55, 0],
      rotate: [-22, 0, 22, 0, -22],
    },
    transition: {
      duration: 9,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
    opacity: 0.55,
  },
  // Dart-pause-dart-pause across the band; pauses are head-tilt "looking
  // around" beats, darts are sharp ease-out moves.
  fox: {
    animate: {
      x: [-820, -300, -300, 60, 60, 380, 380, 820],
      rotate: [0, 0, -9, 0, 7, 0, -5, 0],
      y: [0, -2, -2, -2, -2, -2, -2, 0],
    },
    transition: {
      duration: 9,
      times: [0, 0.08, 0.32, 0.42, 0.66, 0.74, 0.92, 1],
      ease: [
        "easeOut",
        "easeInOut",
        "easeOut",
        "easeInOut",
        "easeOut",
        "easeInOut",
        "easeOut",
        "easeOut",
      ],
      repeat: Infinity,
      repeatType: "loop",
    },
    opacity: 0.95,
  },
  // Slow lumbering walk across the band; reverses direction at the edges so
  // the herd member feels present, not just transiting. Body sway and step
  // bounce run on independent tempos so the rhythm is unmistakable.
  elephant: {
    animate: {
      x: [-560, 560],
      rotate: [-1.8, 1.8],
      y: [0, -3],
    },
    transition: {
      x: {
        duration: 16,
        ease: [0.45, 0, 0.55, 1],
        repeat: Infinity,
        repeatType: "reverse",
      },
      rotate: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      },
      y: {
        duration: 0.75,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      },
    },
    opacity: 0.95,
  },
};

export function RoamingMascot({
  cohort,
  size = 130,
  bandHeight = 220,
}: RoamingMascotProps) {
  const theme = useTheme(cohort);
  const config = ROAM[theme.mascot] ?? ROAM.dolphin;

  return (
    <div
      className="pointer-events-none relative w-full overflow-hidden"
      style={{ height: bandHeight }}
      aria-hidden
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={config.animate}
          transition={config.transition}
          style={{ opacity: config.opacity }}
        >
          <Mascot cohort={cohort} size={size} />
        </motion.div>
      </div>
    </div>
  );
}
