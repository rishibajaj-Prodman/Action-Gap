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
          width="60"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 10 Q 15 0 30 10 T 60 10"
            fill="none"
            stroke={color}
            strokeWidth="1"
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
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="1" />
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
          width="120"
          height="120"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 0 30 Q 30 18 60 30 T 120 30"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
          <path
            d="M 0 60 Q 30 72 60 60 T 120 60"
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
          <path
            d="M 0 90 Q 30 78 60 90 T 120 90"
            fill="none"
            stroke={color}
            strokeWidth="1"
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
