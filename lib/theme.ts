import { useMemo } from "react";

export type CohortName = "Dolphins" | "Foxes" | "Elephants";

export interface CohortTheme {
  name: CohortName;
  emoji: string;
  tagline: string;

  primary: string;
  deep: string;
  highlight: string;

  pattern: "sine-waves" | "diagonal-hatch" | "topo-curves";
  mascot: "dolphin" | "fox" | "elephant";
  signature: "ripples" | "glint" | "horizon";

  timing: number;
  easing: string;

  voice: "plural-inclusive" | "direct-knowing" | "reflective-long-view";
}

export const cohortThemes: Record<CohortName, CohortTheme> = {
  Dolphins: {
    name: "Dolphins",
    emoji: "🐬",
    tagline: "The cohort that moves together",
    primary: "#3D8FCB",
    deep: "#1A4D70",
    highlight: "#A6DAEF",
    pattern: "sine-waves",
    mascot: "dolphin",
    signature: "ripples",
    timing: 1400,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    voice: "plural-inclusive",
  },
  Foxes: {
    name: "Foxes",
    emoji: "🦊",
    tagline: "The cohort that sees the angle",
    primary: "#D87838",
    deep: "#7A3D1F",
    highlight: "#F5C99B",
    pattern: "diagonal-hatch",
    mascot: "fox",
    signature: "glint",
    timing: 700,
    easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    voice: "direct-knowing",
  },
  Elephants: {
    name: "Elephants",
    emoji: "🐘",
    tagline: "The cohort that remembers",
    primary: "#6B8E5C",
    deep: "#3D5736",
    highlight: "#C4D4B5",
    pattern: "topo-curves",
    mascot: "elephant",
    signature: "horizon",
    timing: 1800,
    easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    voice: "reflective-long-view",
  },
};

const DEFAULT_THEME: CohortTheme = cohortThemes.Dolphins;

/**
 * Returns the theme object for a cohort.
 * Defensive against invalid cohort names (returns Dolphins theme as fallback).
 */
export function useTheme(cohort: string | undefined | null): CohortTheme {
  return useMemo(() => {
    if (!cohort) return DEFAULT_THEME;
    return cohortThemes[cohort as CohortName] ?? DEFAULT_THEME;
  }, [cohort]);
}

/**
 * Non-hook version for use outside React components or when looking up
 * multiple cohorts in a single render (e.g., /control with 3 columns).
 */
export function getTheme(cohort: string | undefined | null): CohortTheme {
  if (!cohort) return DEFAULT_THEME;
  return cohortThemes[cohort as CohortName] ?? DEFAULT_THEME;
}
