"use client";

interface StatusPillProps {
  cohortColor: string;
  state: "collecting" | "reveal";
  submitted: number;
  total: number;
}

const TEAL = "#5BA89D";

export function StatusPill({
  cohortColor,
  state,
  submitted,
  total,
}: StatusPillProps) {
  const isRevealed = state === "reveal";
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-32 z-40 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur"
      style={{
        backgroundColor: isRevealed
          ? "rgba(91, 168, 157, 0.18)"
          : `${cohortColor}22`,
        borderColor: isRevealed
          ? "rgba(91, 168, 157, 0.5)"
          : `${cohortColor}66`,
        color: isRevealed ? TEAL : cohortColor,
      }}
    >
      {isRevealed
        ? "● Revealed"
        : `● Collecting · ${submitted} / ${total}`}
    </div>
  );
}
