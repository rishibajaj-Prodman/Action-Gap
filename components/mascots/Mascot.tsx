import { useTheme } from "@/lib/theme";

interface MascotProps {
  cohort: string;
  size?: number;
  className?: string;
}

interface SvgProps {
  size: number;
  color: string;
  className?: string;
}

function DolphinSVG({ size, color, className }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M58 28 Q60 20 55 20 L51 24 Q43 16 31 18 Q14 20 7 34 Q5 39 10 42 Q22 46 34 42 Q44 38 50 34 Q54 32 58 28 Z" />
      <path d="M28 18 L33 8 L37 20 Z" />
      <path d="M9 36 Q4 38 3 44 Q3 48 7 47 Q10 44 13 42 Z" />
    </svg>
  );
}

function FoxSVG({ size, color, className }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <path d="M14 14 L20 4 L25 16 L39 16 L44 4 L50 14 L52 26 Q52 36 32 40 Q12 36 12 26 Z" />
      <path d="M28 36 L32 52 L36 36 Z" />
      <path d="M48 38 Q60 38 60 50 Q60 58 52 58 Q44 56 44 48 Q44 42 48 38 Z" />
    </svg>
  );
}

function ElephantSVG({ size, color, className }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill={color}
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="36" cy="34" rx="22" ry="14" />
      <ellipse cx="22" cy="28" rx="8" ry="10" />
      <path d="M14 30 Q6 36 6 46 Q6 54 12 54 Q15 54 14 46 Q14 40 20 38 Z" />
      <rect x="22" y="44" width="5" height="12" rx="1" />
      <rect x="44" y="44" width="5" height="12" rx="1" />
    </svg>
  );
}

export function Mascot({ cohort, size = 32, className = "" }: MascotProps) {
  const theme = useTheme(cohort);
  const color = theme.primary;

  switch (theme.mascot) {
    case "dolphin":
      return <DolphinSVG size={size} color={color} className={className} />;
    case "fox":
      return <FoxSVG size={size} color={color} className={className} />;
    case "elephant":
      return <ElephantSVG size={size} color={color} className={className} />;
    default:
      return null;
  }
}
