import { useTheme } from "@/lib/theme";

interface CohortPatternProps {
  cohort: string;
  opacity?: number;
  className?: string;
}

interface PatternProps {
  color: string;
  opacity: number;
  className?: string;
  patternId: string;
}

function SineWavePattern({ color, opacity, className, patternId }: PatternProps) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="80"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 16 Q 20 0 40 16 T 80 16"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M 0 24 Q 20 14 40 24 T 80 24"
            fill="none"
            stroke={color}
            strokeWidth="0.7"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function DiagonalHatchPattern({ color, opacity, className, patternId }: PatternProps) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="18" stroke={color} strokeWidth="1.6" />
          <line
            x1="9"
            y1="0"
            x2="9"
            y2="18"
            stroke={color}
            strokeWidth="0.6"
            strokeOpacity="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function TopoCurvePattern({ color, opacity, className, patternId }: PatternProps) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="140"
          height="140"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 30 Q 35 14 70 30 T 140 30"
            fill="none"
            stroke={color}
            strokeWidth="1.6"
          />
          <path
            d="M 0 60 Q 35 76 70 60 T 140 60"
            fill="none"
            stroke={color}
            strokeWidth="1.4"
          />
          <path
            d="M 0 90 Q 35 74 70 90 T 140 90"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
          />
          <path
            d="M 0 120 Q 35 132 70 120 T 140 120"
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

export function CohortPattern({
  cohort,
  opacity = 0.04,
  className = "",
}: CohortPatternProps) {
  const theme = useTheme(cohort);
  const patternId = `cohort-pattern-${theme.pattern}-${theme.name}`;

  switch (theme.pattern) {
    case "sine-waves":
      return (
        <SineWavePattern
          color={theme.primary}
          opacity={opacity}
          className={className}
          patternId={patternId}
        />
      );
    case "diagonal-hatch":
      return (
        <DiagonalHatchPattern
          color={theme.primary}
          opacity={opacity}
          className={className}
          patternId={patternId}
        />
      );
    case "topo-curves":
      return (
        <TopoCurvePattern
          color={theme.primary}
          opacity={opacity}
          className={className}
          patternId={patternId}
        />
      );
    default:
      return null;
  }
}
