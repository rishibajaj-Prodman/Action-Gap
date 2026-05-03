"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/lib/theme";
import { Avatar } from "@/components/Avatar";

export type TrailRound =
  | "idle"
  | "mirror"
  | "funnel"
  | "court"
  | "reflection"
  | "complete";

export type CheckpointStatus = "pending" | "active" | "locked";

export interface CheckpointDef {
  id: "mirror" | "funnel" | "court" | "reflection";
  label: string;
  num: string;
  x: number;
  y: number;
}

export const TRAIL_CHECKPOINTS: readonly CheckpointDef[] = [
  { id: "mirror", label: "THE MIRROR", num: "01", x: 12, y: 50 },
  { id: "funnel", label: "THE FUNNEL", num: "02", x: 37, y: 30 },
  { id: "court", label: "THE COURT", num: "03", x: 63, y: 65 },
  { id: "reflection", label: "REFLECTION", num: "04", x: 88, y: 35 },
] as const;

const ORDER: TrailRound[] = ["mirror", "funnel", "court", "reflection"];

export function getCheckpointStatus(
  idx: number,
  currentRound: TrailRound
): CheckpointStatus {
  if (currentRound === "complete") return "locked";
  const currentIndex = ORDER.indexOf(currentRound);
  if (currentIndex < 0) return "pending";
  if (idx < currentIndex) return "locked";
  if (idx === currentIndex) return "active";
  return "pending";
}

interface TrailCanvasProps {
  cohort: string;
  currentRound: TrailRound;
  participantNames?: string[];
  renderCheckpoint?: (cp: CheckpointDef, status: CheckpointStatus) => ReactNode;
  renderOverlay?: () => ReactNode;
  className?: string;
  /**
   * When false, suppresses the small "01 · THE MIRROR" label below each dot.
   * Useful when the rendered checkpoint content card already shows the heading.
   * Defaults to true.
   */
  showLabels?: boolean;
}

export function TrailCanvas({
  cohort,
  currentRound,
  participantNames = [],
  renderCheckpoint,
  renderOverlay,
  className = "",
  showLabels = true,
}: TrailCanvasProps) {
  const theme = useTheme(cohort);
  const currentIndex = ORDER.indexOf(currentRound);

  const fullPath = buildPath(currentIndex >= 0 ? 4 : 4, true);
  const solidPath = currentIndex >= 0 ? buildPath(currentIndex, false) : "";

  const activeCheckpoint =
    currentIndex >= 0 && currentIndex < TRAIL_CHECKPOINTS.length
      ? TRAIL_CHECKPOINTS[currentIndex]
      : null;

  const prevCheckpointRef = useRef<CheckpointDef | null>(null);
  const [walkFrom, setWalkFrom] = useState<CheckpointDef | null>(null);

  useEffect(() => {
    const prev = prevCheckpointRef.current;
    if (activeCheckpoint && prev && prev.id !== activeCheckpoint.id) {
      setWalkFrom(prev);
      const t = setTimeout(() => setWalkFrom(null), 1300);
      prevCheckpointRef.current = activeCheckpoint;
      return () => clearTimeout(t);
    }
    prevCheckpointRef.current = activeCheckpoint;
  }, [activeCheckpoint]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d={fullPath}
          stroke={theme.primary}
          strokeWidth="0.5"
          strokeOpacity="0.3"
          strokeDasharray="2,1"
          fill="none"
        />
        {currentIndex > 0 && (
          <path
            d={solidPath}
            stroke={theme.primary}
            strokeWidth="0.7"
            strokeOpacity="0.85"
            fill="none"
          />
        )}
      </svg>

      {TRAIL_CHECKPOINTS.map((cp, idx) => {
        const status = getCheckpointStatus(idx, currentRound);
        const filled = status === "active" || status === "locked";
        return (
          <div
            key={cp.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${cp.x}%`, top: `${cp.y}%` }}
          >
            <div
              className="h-4 w-4 rounded-full border-2 transition-all"
              style={{
                borderColor: theme.primary,
                backgroundColor: filled ? theme.primary : "transparent",
                opacity: status === "pending" ? 0.4 : 1,
                boxShadow:
                  status === "active" ? `0 0 16px ${theme.primary}` : "none",
              }}
            />
            {showLabels && (
              <div
                className="mt-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color: status === "active" ? theme.primary : "#8B8680",
                  opacity: status === "pending" ? 0.6 : 1,
                }}
              >
                {cp.num} · {cp.label}
              </div>
            )}
            {renderCheckpoint && (
              <div className="absolute left-1/2 top-full -translate-x-1/2">
                {renderCheckpoint(cp, status)}
              </div>
            )}
          </div>
        );
      })}

      {activeCheckpoint && participantNames.length > 0 && (
        <AnimatePresence>
          <motion.div
            key={activeCheckpoint.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            initial={
              walkFrom
                ? { left: `${walkFrom.x}%`, top: `${walkFrom.y}%` }
                : false
            }
            animate={{
              left: `${activeCheckpoint.x}%`,
              top: `${activeCheckpoint.y - 14}%`,
            }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              left: `${activeCheckpoint.x}%`,
              top: `${activeCheckpoint.y - 14}%`,
            }}
          >
            <div className="flex -space-x-2">
              {participantNames.slice(0, 5).map((name) => (
                <Avatar key={name} name={name} size={26} className="ring-2" />
              ))}
              {participantNames.length > 5 && (
                <div
                  className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10px] font-bold ring-2"
                  style={{
                    backgroundColor: "rgba(245,241,232,0.1)",
                    color: "#F5F1E8",
                  }}
                >
                  +{participantNames.length - 5}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {renderOverlay && renderOverlay()}
    </div>
  );
}

function buildPath(uptoIndex: number, full: boolean): string {
  if (uptoIndex < 0) return "";
  const cps = TRAIL_CHECKPOINTS;
  let d = `M ${cps[0].x} ${cps[0].y}`;
  if (full || uptoIndex >= 1)
    d += ` Q ${(cps[0].x + cps[1].x) / 2} ${cps[0].y - 20}, ${cps[1].x} ${cps[1].y}`;
  if (full || uptoIndex >= 2) d += ` T ${cps[2].x} ${cps[2].y}`;
  if (full || uptoIndex >= 3) d += ` T ${cps[3].x} ${cps[3].y}`;
  return d;
}
