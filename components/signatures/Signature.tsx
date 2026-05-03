"use client";

import { useTheme } from "@/lib/theme";
import { RipplesSignature } from "./RipplesSignature";
import { GlintSignature } from "./GlintSignature";
import { HorizonSignature } from "./HorizonSignature";

export type ParsedEasing = [number, number, number, number] | "easeOut";

export function parseEasing(easing: string): ParsedEasing {
  const match = easing.match(
    /cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/
  );
  if (!match) return "easeOut";
  return [
    parseFloat(match[1]),
    parseFloat(match[2]),
    parseFloat(match[3]),
    parseFloat(match[4]),
  ];
}

interface SignatureProps {
  cohort: string;
  trigger: boolean;
  delay?: number;
  onComplete?: () => void;
}

export function Signature({
  cohort,
  trigger,
  delay = 0,
  onComplete,
}: SignatureProps) {
  const theme = useTheme(cohort);

  if (!trigger) return null;

  const easing = parseEasing(theme.easing);
  const shared = {
    color: theme.primary,
    timing: theme.timing,
    easing,
    delay,
    onComplete,
  };

  switch (theme.signature) {
    case "ripples":
      return <RipplesSignature {...shared} />;
    case "glint":
      return <GlintSignature {...shared} />;
    case "horizon":
      return <HorizonSignature {...shared} />;
    default:
      return null;
  }
}
