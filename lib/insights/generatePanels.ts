export type Vote = "greenwash" | "real";
export type Verdict = { pairId: number; vote: Vote };

export type MirrorData = { prediction: number; belief: boolean };
export type FunnelData = {
  stage1: boolean;
  stage2: boolean;
  stage3: boolean;
  stage4: boolean;
};
export type CourtData = { verdicts: Verdict[] };
export type ReflectionData = { text: string };

export type ResponseRow = {
  id: string;
  cohort: string;
  round: "mirror" | "funnel" | "court" | "reflection" | string;
  participant_id: string;
  data: MirrorData | FunnelData | CourtData | ReflectionData;
};

export type ParticipantRow = {
  participant_id: string;
  name: string;
  active: boolean;
};

export const PAIR_NAMES: Record<number, string> = {
  1: "BP",
  2: "Microsoft",
  3: "Unilever",
  4: "BASF",
  5: "Volkswagen",
};

export type Panel =
  | {
      type: "gap";
      n: number;
      predictedAvg: number;
      actualPct: number;
      delta: number;
      direction: "under" | "over" | "match";
    }
  | {
      type: "funnel";
      n: number;
      stagePct: [number, number, number, number];
      stageCount: [number, number, number, number];
      dropoffPct: number;
    }
  | {
      type: "court";
      n: number;
      greenwashTotal: number;
      realTotal: number;
      greenwashPct: number;
      perCompany: Array<{
        pairId: number;
        company: string;
        greenwashPct: number;
        realPct: number;
        totalVotes: number;
        verdict: "Greenwash" | "Real progress" | "Split" | "No data";
      }>;
    }
  | {
      type: "dragons";
      n: number;
      themes: Array<{ word: string; count: number }>;
      quotes: Array<{ name: string; text: string }>;
    }
  | {
      type: "outlier";
      participantName: string;
      predicted: number;
      actualPct: number;
      gap: number;
    }
  | {
      type: "alignment";
      mostAgreed: { company: string; vote: Vote; pct: number; count: number };
      mostSplit: { company: string; greenwashPct: number; realPct: number };
    }
  | {
      type: "resilience";
      sustained: number;
      total: number;
      pct: number;
    };

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "i", "my", "we", "our", "is",
  "are", "was", "were", "be", "been", "being", "and", "or", "but",
  "in", "on", "for", "with", "as", "it", "its", "this", "that",
  "these", "those", "from", "by", "at", "have", "has", "had",
  "will", "would", "could", "should", "do", "does", "did",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()—–-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function nameByPid(participants: ParticipantRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const p of participants) m.set(p.participant_id, p.name);
  return m;
}

function pickResponses(
  responses: ResponseRow[],
  round: string
): ResponseRow[] {
  return responses.filter((r) => r.round === round);
}

function gapPanel(responses: ResponseRow[]): Panel | null {
  const mirror = pickResponses(responses, "mirror");
  const n = mirror.length;
  if (n === 0) return null;
  let predSum = 0;
  let yesCount = 0;
  for (const r of mirror) {
    const d = r.data as MirrorData;
    predSum += d.prediction ?? 0;
    if (d.belief === true) yesCount++;
  }
  const predictedAvg = Math.round(predSum / n);
  const actualPct = Math.round((yesCount / n) * 100);
  const delta = Math.abs(actualPct - predictedAvg);
  const direction =
    actualPct === predictedAvg
      ? "match"
      : actualPct > predictedAvg
        ? "under"
        : "over";
  return { type: "gap", n, predictedAvg, actualPct, delta, direction };
}

function funnelPanel(responses: ResponseRow[]): Panel | null {
  const funnel = pickResponses(responses, "funnel");
  const n = funnel.length;
  if (n === 0) return null;
  const stageCount: [number, number, number, number] = [0, 0, 0, 0];
  for (const r of funnel) {
    const d = r.data as FunnelData;
    if (d.stage1) stageCount[0]++;
    if (d.stage2) stageCount[1]++;
    if (d.stage3) stageCount[2]++;
    if (d.stage4) stageCount[3]++;
  }
  const stagePct = stageCount.map((c) => Math.round((c / n) * 100)) as [
    number,
    number,
    number,
    number,
  ];
  const dropoffPct = Math.max(0, stagePct[0] - stagePct[3]);
  return { type: "funnel", n, stagePct, stageCount, dropoffPct };
}

function courtPanel(responses: ResponseRow[]): Panel | null {
  const court = pickResponses(responses, "court");
  const n = court.length;
  if (n === 0) return null;

  const perPairCounts = new Map<number, { g: number; r: number }>();
  let greenwashTotal = 0;
  let realTotal = 0;
  for (const resp of court) {
    const d = resp.data as CourtData;
    for (const v of d.verdicts ?? []) {
      const cell = perPairCounts.get(v.pairId) ?? { g: 0, r: 0 };
      if (v.vote === "greenwash") {
        cell.g++;
        greenwashTotal++;
      } else if (v.vote === "real") {
        cell.r++;
        realTotal++;
      }
      perPairCounts.set(v.pairId, cell);
    }
  }
  const verdictTotal = greenwashTotal + realTotal;
  const greenwashPct =
    verdictTotal > 0 ? Math.round((greenwashTotal / verdictTotal) * 100) : 0;

  const perCompany = [...perPairCounts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pairId, { g, r }]) => {
      const total = g + r;
      const greenwashPct = total > 0 ? Math.round((g / total) * 100) : 0;
      const realPct = total > 0 ? 100 - greenwashPct : 0;
      const verdict =
        total === 0
          ? ("No data" as const)
          : g > r
            ? ("Greenwash" as const)
            : r > g
              ? ("Real progress" as const)
              : ("Split" as const);
      return {
        pairId,
        company: PAIR_NAMES[pairId] ?? `Pair ${pairId}`,
        greenwashPct,
        realPct,
        totalVotes: total,
        verdict,
      };
    });

  return {
    type: "court",
    n,
    greenwashTotal,
    realTotal,
    greenwashPct,
    perCompany,
  };
}

function dragonsPanel(
  responses: ResponseRow[],
  participants: ParticipantRow[]
): Panel | null {
  const reflections = pickResponses(responses, "reflection");
  const n = reflections.length;
  if (n === 0) return null;

  const counts = new Map<string, number>();
  for (const r of reflections) {
    const d = r.data as ReflectionData;
    const seen = new Set<string>();
    for (const w of tokenize(d.text ?? "")) {
      if (seen.has(w)) continue;
      seen.add(w);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  const themes = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([word, count]) => ({ word, count }));

  const lookup = nameByPid(participants);
  const quotes = reflections
    .slice(0, 5)
    .map((r) => ({
      name: lookup.get(r.participant_id) ?? "Anonymous",
      text: ((r.data as ReflectionData).text ?? "").trim(),
    }))
    .filter((q) => q.text.length > 0);

  return { type: "dragons", n, themes, quotes };
}

function outlierPanel(
  responses: ResponseRow[],
  participants: ParticipantRow[]
): Panel | null {
  const mirror = pickResponses(responses, "mirror");
  const n = mirror.length;
  if (n === 0) return null;
  const yesCount = mirror.filter((r) => (r.data as MirrorData).belief).length;
  const actualPct = Math.round((yesCount / n) * 100);
  const lookup = nameByPid(participants);

  let best: { name: string; predicted: number; gap: number } | null = null;
  for (const r of mirror) {
    const d = r.data as MirrorData;
    const gap = Math.abs((d.prediction ?? 0) - actualPct);
    if (!best || gap > best.gap) {
      best = {
        name: lookup.get(r.participant_id) ?? "Someone",
        predicted: d.prediction ?? 0,
        gap,
      };
    }
  }
  if (!best) return null;
  return {
    type: "outlier",
    participantName: best.name,
    predicted: best.predicted,
    actualPct,
    gap: best.gap,
  };
}

function alignmentPanel(responses: ResponseRow[]): Panel | null {
  const court = courtPanel(responses);
  if (!court || court.type !== "court" || court.perCompany.length === 0)
    return null;

  let mostAgreedRow = court.perCompany[0];
  let mostAgreedScore = Math.max(
    mostAgreedRow.greenwashPct,
    mostAgreedRow.realPct
  );
  for (const row of court.perCompany) {
    const score = Math.max(row.greenwashPct, row.realPct);
    if (score > mostAgreedScore) {
      mostAgreedScore = score;
      mostAgreedRow = row;
    }
  }

  let mostSplitRow = court.perCompany[0];
  let mostSplitDistance = Math.abs(
    mostSplitRow.greenwashPct - mostSplitRow.realPct
  );
  for (const row of court.perCompany) {
    const dist = Math.abs(row.greenwashPct - row.realPct);
    if (dist < mostSplitDistance) {
      mostSplitDistance = dist;
      mostSplitRow = row;
    }
  }

  const dominantVote: Vote =
    mostAgreedRow.greenwashPct >= mostAgreedRow.realPct ? "greenwash" : "real";
  const dominantCount =
    dominantVote === "greenwash"
      ? Math.round((mostAgreedRow.greenwashPct / 100) * mostAgreedRow.totalVotes)
      : Math.round((mostAgreedRow.realPct / 100) * mostAgreedRow.totalVotes);

  return {
    type: "alignment",
    mostAgreed: {
      company: mostAgreedRow.company,
      vote: dominantVote,
      pct: mostAgreedScore,
      count: dominantCount,
    },
    mostSplit: {
      company: mostSplitRow.company,
      greenwashPct: mostSplitRow.greenwashPct,
      realPct: mostSplitRow.realPct,
    },
  };
}

function resiliencePanel(responses: ResponseRow[]): Panel | null {
  const funnel = pickResponses(responses, "funnel");
  const total = funnel.length;
  if (total === 0) return null;
  const sustained = funnel.filter((r) => (r.data as FunnelData).stage4).length;
  const pct = Math.round((sustained / total) * 100);
  return { type: "resilience", sustained, total, pct };
}

/**
 * Generates the per-cohort insight panels from raw response/participant data.
 *
 * Pure function — no side effects. Skips panels whose inputs are missing.
 * Panels are returned in priority order: gap, funnel, court, dragons,
 * outlier, alignment, resilience.
 */
export function generatePanels(
  participants: ParticipantRow[],
  responses: ResponseRow[]
): Panel[] {
  const panels: Panel[] = [];
  const generators: Array<() => Panel | null> = [
    () => gapPanel(responses),
    () => funnelPanel(responses),
    () => courtPanel(responses),
    () => dragonsPanel(responses, participants),
    () => outlierPanel(responses, participants),
    () => alignmentPanel(responses),
    () => resiliencePanel(responses),
  ];
  for (const g of generators) {
    const p = g();
    if (p) panels.push(p);
  }
  return panels;
}
