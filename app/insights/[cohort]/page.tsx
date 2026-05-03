"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { Mascot } from "@/components/mascots/Mascot";
import {
  generatePanels,
  PAIR_NAMES,
  type Panel,
  type MirrorData,
  type FunnelData,
  type CourtData,
  type ReflectionData,
  type ParticipantRow,
  type ResponseRow,
} from "@/lib/insights/generatePanels";

const INK = "#0A0908";
const BONE = "#F5F1E8";
const ASH = "#8B8680";
const TEAL = "#5BA89D";
const CLAY = "#C66B5C";
const CARD_BG = "#FAF6EC";
const CARD_INK = "#1A1A1A";
const CARD_HAIR = "rgba(26,26,26,0.12)";

export default function InsightsPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  const theme = useTheme(cohort);

  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!cohort) return;
    const { data: parts } = await supabase
      .from("participants")
      .select("participant_id, name, active")
      .eq("cohort", cohort)
      .order("joined_at", { ascending: true });
    if (parts) setParticipants(parts as ParticipantRow[]);

    const { data: rows } = await supabase
      .from("responses")
      .select("id, cohort, round, participant_id, data")
      .eq("cohort", cohort);
    if (rows) setResponses(rows as ResponseRow[]);
  }, [cohort]);

  useEffect(() => {
    if (!cohort) return;
    fetchData();
    const channelId = Math.random().toString(36).slice(2, 10);
    const channel = supabase
      .channel(`insights-panels-${cohort}-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `cohort=eq.${cohort}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants", filter: `cohort=eq.${cohort}` },
        () => fetchData()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohort, fetchData]);

  useVisibilityRefetch(fetchData);

  const panels = useMemo(
    () => generatePanels(participants, responses),
    [participants, responses]
  );

  const [openPanel, setOpenPanel] = useState<Panel | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPanel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-screen" style={{ backgroundColor: BONE, color: CARD_INK }}>
      <header
        className="flex items-center justify-between border-b px-12 py-6"
        style={{ borderColor: CARD_HAIR, backgroundColor: BONE }}
      >
        <div className="flex items-center gap-4">
          <Mascot cohort={cohort} size={40} />
          <div>
            <div
              className="text-xs font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.primary }}
            >
              Insights briefing
            </div>
            <h1 className="text-3xl font-bold uppercase tracking-wider" style={{ color: CARD_INK }}>
              {cohort}
            </h1>
          </div>
        </div>
        <span className="text-sm italic" style={{ color: "#5A5650" }}>
          {theme.tagline}
        </span>
      </header>

      <motion.section
        className="mx-auto max-w-7xl px-8 py-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {panels.length === 0 ? (
          <div className="py-32 text-center">
            <p
              className="font-serif text-3xl italic"
              style={{
                color: ASH,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              Insights will appear when the session ends.
            </p>
            <p className="mt-4 text-sm" style={{ color: "#5A5650" }}>
              The {cohort} are still on the trail.
            </p>
          </div>
        ) : (
          <MagazineGrid
            panels={panels}
            accent={theme.primary}
            onOpen={(p) => setOpenPanel(p)}
          />
        )}
      </motion.section>

      <AnimatePresence>
        {openPanel && (
          <PanelModal
            panel={openPanel}
            accent={theme.primary}
            participants={participants}
            responses={responses}
            onClose={() => setOpenPanel(null)}
          />
        )}
      </AnimatePresence>

      <footer
        className="border-t px-12 py-6 text-xs"
        style={{ borderColor: CARD_HAIR, color: "#5A5650" }}
      >
        The Action Gap · {cohort} · HHL Leipzig MBA
      </footer>
    </main>
  );
}

function MagazineGrid({
  panels,
  accent,
  onOpen,
}: {
  panels: Panel[];
  accent: string;
  onOpen: (p: Panel) => void;
}) {
  const find = <T extends Panel["type"]>(t: T) =>
    panels.find((p) => p.type === t) as Extract<Panel, { type: T }> | undefined;

  const gap = find("gap");
  const dragons = find("dragons");
  const court = find("court");
  const funnel = find("funnel");
  const outlier = find("outlier");
  const alignment = find("alignment");
  const resilience = find("resilience");

  const secondHero: Panel | undefined = dragons ?? court ?? funnel;
  const tertiary: Panel[] = (
    [court, funnel, outlier, alignment, resilience] as (Panel | undefined)[]
  ).filter((p): p is Panel => !!p && p !== secondHero);

  function clickable(p: Panel, hero = false) {
    return (
      <button
        type="button"
        onClick={() => onOpen(p)}
        className="group block h-full w-full cursor-pointer text-left transition-all duration-200 hover:-translate-y-1"
        style={{ filter: "drop-shadow(0 0 0 transparent)" }}
      >
        <div
          className="h-full transition-shadow duration-200"
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px ${accent}55`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
          }}
        >
          <PanelCard panel={p} accent={accent} hero={hero} />
        </div>
      </button>
    );
  }

  const clickableHero = (p: Panel) => clickable(p, true);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      {gap && <div className="md:col-span-12">{clickableHero(gap)}</div>}
      {secondHero && <div className="md:col-span-7">{clickableHero(secondHero)}</div>}
      {tertiary[0] && <div className="md:col-span-5">{clickable(tertiary[0])}</div>}
      {tertiary[1] && <div className="md:col-span-5">{clickable(tertiary[1])}</div>}
      {tertiary[2] && <div className="md:col-span-7">{clickable(tertiary[2])}</div>}
      {tertiary.slice(3).map((p, i) => (
        <div key={`tail-${i}`} className="md:col-span-6">
          {clickable(p)}
        </div>
      ))}
    </div>
  );
}

function PanelCard({
  panel,
  accent,
  hero,
}: {
  panel: Panel;
  accent: string;
  hero?: boolean;
}) {
  switch (panel.type) {
    case "gap":
      return <GapPanel panel={panel} accent={accent} hero />;
    case "funnel":
      return <FunnelPanel panel={panel} accent={accent} hero={hero} />;
    case "court":
      return <CourtPanel panel={panel} accent={accent} hero={hero} />;
    case "dragons":
      return <DragonsPanel panel={panel} accent={accent} hero={hero} />;
    case "outlier":
      return <OutlierPanel panel={panel} accent={accent} />;
    case "alignment":
      return <AlignmentPanel panel={panel} accent={accent} />;
    case "resilience":
      return <ResiliencePanel panel={panel} accent={accent} />;
  }
}

function PanelShell({
  eyebrow,
  headline,
  question,
  accent,
  children,
  hero = false,
}: {
  eyebrow: string;
  headline: string;
  question: string;
  accent: string;
  children: React.ReactNode;
  hero?: boolean;
}) {
  return (
    <article
      className="rounded-lg border p-8"
      style={{
        backgroundColor: CARD_BG,
        borderColor: CARD_HAIR,
        boxShadow: hero
          ? `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${accent}33`
          : "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="text-xs font-bold uppercase tracking-[0.3em]"
        style={{ color: accent }}
      >
        {eyebrow}
      </div>
      <h2
        className="mt-2 font-serif leading-tight"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: hero ? "2.75rem" : "2rem",
          color: CARD_INK,
        }}
      >
        {headline}
      </h2>
      <div className="mt-6">{children}</div>
      <p
        className="mt-6 border-t pt-4 text-sm italic"
        style={{ color: "#5A5650", borderColor: CARD_HAIR }}
      >
        {question}
      </p>
    </article>
  );
}

function GapPanel({
  panel,
  accent,
}: {
  panel: Extract<Panel, { type: "gap" }>;
  accent: string;
  hero?: boolean;
}) {
  const direction =
    panel.direction === "match"
      ? "Match"
      : panel.direction === "under"
        ? "Underestimated"
        : "Overestimated";
  return (
    <PanelShell
      hero
      eyebrow="01 · The Mirror"
      headline="The Gap"
      question="If we underestimated each other by this much in 60 seconds — what else are we underestimating?"
      accent={accent}
    >
      <div className="flex items-end justify-around gap-6">
        <Stat label="Predicted" value={`${panel.predictedAvg}%`} dim />
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5A5650" }}>
            Gap
          </div>
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: accent }}
          >
            {panel.delta}%
          </div>
          <div className="text-xs uppercase" style={{ color: "#5A5650" }}>
            {direction}
          </div>
        </div>
        <Stat label="Actual" value={`${panel.actualPct}%`} bold />
      </div>
    </PanelShell>
  );
}

function FunnelPanel({
  panel,
  accent,
  hero,
}: {
  panel: Extract<Panel, { type: "funnel" }>;
  accent: string;
  hero?: boolean;
}) {
  const labels = ["Concerned", "Believe matters", "Will change", "Sustained 6mo"];
  return (
    <PanelShell
      hero={hero}
      eyebrow="02 · The Funnel"
      headline={`Drop-off: ${panel.dropoffPct}%`}
      question="Where does intention turn into something else? What did we lose between believing and doing?"
      accent={accent}
    >
      <div className="flex flex-col gap-2">
        {labels.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-44 text-sm" style={{ color: "#5A5650" }}>
              {label}
            </div>
            <div
              className="relative h-6 flex-1 overflow-hidden rounded-sm"
              style={{ backgroundColor: "rgba(26,26,26,0.06)" }}
            >
              <div
                className="h-full"
                style={{
                  width: `${panel.stagePct[i]}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <div
              className="w-16 text-right text-sm font-semibold tabular-nums"
              style={{ color: CARD_INK }}
            >
              {panel.stageCount[i]} · {panel.stagePct[i]}%
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

function CourtPanel({
  panel,
  accent,
  hero,
}: {
  panel: Extract<Panel, { type: "court" }>;
  accent: string;
  hero?: boolean;
}) {
  return (
    <PanelShell
      hero={hero}
      eyebrow="03 · The Court"
      headline={`${panel.greenwashPct}% greenwash verdicts`}
      question="When 5 random executives all say the same things, are they all lying — or is the system rewarding the same lie?"
      accent={accent}
    >
      <div className="flex flex-col gap-2">
        {panel.perCompany.map((row) => {
          const verdictColor =
            row.verdict === "Greenwash"
              ? CLAY
              : row.verdict === "Real progress"
                ? TEAL
                : "#5A5650";
          return (
            <div
              key={row.pairId}
              className="flex items-center gap-4"
            >
              <div
                className="w-28 text-sm font-bold uppercase tracking-wider"
                style={{ color: CARD_INK }}
              >
                {row.company}
              </div>
              <div
                className="relative h-4 flex-1 overflow-hidden rounded-sm"
                style={{ backgroundColor: "rgba(26,26,26,0.06)" }}
              >
                {row.totalVotes > 0 && (
                  <div className="flex h-full">
                    <div
                      style={{ width: `${row.greenwashPct}%`, backgroundColor: CLAY }}
                    />
                    <div
                      style={{ width: `${row.realPct}%`, backgroundColor: TEAL }}
                    />
                  </div>
                )}
              </div>
              <div
                className="w-32 text-sm font-semibold uppercase tracking-wider"
                style={{ color: verdictColor }}
              >
                {row.verdict}
              </div>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

function DragonsPanel({
  panel,
  accent,
  hero,
}: {
  panel: Extract<Panel, { type: "dragons" }>;
  accent: string;
  hero?: boolean;
}) {
  return (
    <PanelShell
      hero={hero}
      eyebrow="04 · Reflection"
      headline="The dragons we're taking home"
      question="Whose dragon names yours? What did you almost write but didn't?"
      accent={accent}
    >
      <div className="flex flex-wrap gap-2">
        {panel.themes.map((t) => (
          <span
            key={t.word}
            className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: `${accent}22`,
              color: accent,
            }}
          >
            {t.word} · {t.count}
          </span>
        ))}
      </div>
      <ul className="mt-6 flex flex-col gap-3">
        {panel.quotes.map((q, i) => (
          <li key={i} className="text-base italic" style={{ color: CARD_INK }}>
            &ldquo;{q.text}&rdquo;{" "}
            <span className="not-italic text-xs" style={{ color: "#5A5650" }}>
              — {q.name}
            </span>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

function OutlierPanel({
  panel,
  accent,
}: {
  panel: Extract<Panel, { type: "outlier" }>;
  accent: string;
}) {
  return (
    <PanelShell
      eyebrow="The outlier"
      headline={`${panel.participantName} read the room differently`}
      question="What did this person see that the rest of the cohort missed? Or vice versa?"
      accent={accent}
    >
      <div className="flex items-baseline gap-8">
        <Stat label="Their guess" value={`${panel.predicted}%`} dim />
        <Stat label="Cohort actual" value={`${panel.actualPct}%`} bold />
        <Stat label="Gap" value={`${panel.gap}%`} accent={accent} />
      </div>
    </PanelShell>
  );
}

function AlignmentPanel({
  panel,
  accent,
}: {
  panel: Extract<Panel, { type: "alignment" }>;
  accent: string;
}) {
  return (
    <PanelShell
      eyebrow="Where we agreed and split"
      headline={`We agreed most on ${panel.mostAgreed.company}`}
      question="What does the consensus tell us about how this cohort reads corporate climate claims?"
      accent={accent}
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5A5650" }}>
            Most agreed
          </div>
          <div className="mt-1 text-xl font-bold" style={{ color: CARD_INK }}>
            {panel.mostAgreed.company}
          </div>
          <div className="text-sm" style={{ color: accent }}>
            {panel.mostAgreed.pct}% voted{" "}
            {panel.mostAgreed.vote === "greenwash" ? "Greenwash" : "Real progress"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest" style={{ color: "#5A5650" }}>
            Most split
          </div>
          <div className="mt-1 text-xl font-bold" style={{ color: CARD_INK }}>
            {panel.mostSplit.company}
          </div>
          <div className="text-sm" style={{ color: "#5A5650" }}>
            {panel.mostSplit.greenwashPct}% / {panel.mostSplit.realPct}% split
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function ResiliencePanel({
  panel,
  accent,
}: {
  panel: Extract<Panel, { type: "resilience" }>;
  accent: string;
}) {
  return (
    <PanelShell
      eyebrow="Resilience"
      headline={`${panel.sustained} of ${panel.total} have already done it`}
      question="What did the sustainers know that the rest of us didn't? Or what did they have access to?"
      accent={accent}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums" style={{ color: accent }}>
          {panel.pct}%
        </span>
        <span className="text-sm" style={{ color: "#5A5650" }}>
          sustained a major behavior change for 6+ months
        </span>
      </div>
    </PanelShell>
  );
}

function PanelModal({
  panel,
  accent,
  participants,
  responses,
  onClose,
}: {
  panel: Panel;
  accent: string;
  participants: ParticipantRow[];
  responses: ResponseRow[];
  onClose: () => void;
}) {
  const nameByPid = new Map(participants.map((p) => [p.participant_id, p.name]));

  function detailFor(panel: Panel): React.ReactNode {
    switch (panel.type) {
      case "gap": {
        const mirror = responses.filter((r) => r.round === "mirror");
        return (
          <div>
            <p className="mb-4 text-sm" style={{ color: "#5A5650" }}>
              Each participant&rsquo;s prediction next to their personal
              belief. The gap is the distance between what we thought and
              what we said.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: "#5A5650" }}>
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-right">Prediction</th>
                  <th className="py-2 text-right">Belief</th>
                </tr>
              </thead>
              <tbody>
                {mirror.map((r) => {
                  const d = r.data as MirrorData;
                  return (
                    <tr key={r.id} className="border-t" style={{ borderColor: CARD_HAIR }}>
                      <td className="py-2 font-semibold">
                        {nameByPid.get(r.participant_id) ?? "—"}
                      </td>
                      <td className="py-2 text-right tabular-nums">{d.prediction}%</td>
                      <td
                        className="py-2 text-right font-semibold"
                        style={{ color: d.belief ? TEAL : CLAY }}
                      >
                        {d.belief ? "Yes" : "No"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
      case "funnel": {
        const funnel = responses.filter((r) => r.round === "funnel");
        return (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: "#5A5650" }}>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-center">Concerned</th>
                <th className="py-2 text-center">Believes</th>
                <th className="py-2 text-center">Will change</th>
                <th className="py-2 text-center">Sustained</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((r) => {
                const d = r.data as FunnelData;
                const cell = (v: boolean) => (
                  <td
                    className="py-2 text-center font-semibold"
                    style={{ color: v ? TEAL : CLAY }}
                  >
                    {v ? "✓" : "✕"}
                  </td>
                );
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: CARD_HAIR }}>
                    <td className="py-2 font-semibold">
                      {nameByPid.get(r.participant_id) ?? "—"}
                    </td>
                    {cell(d.stage1)}
                    {cell(d.stage2)}
                    {cell(d.stage3)}
                    {cell(d.stage4)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      }
      case "court": {
        const court = responses.filter((r) => r.round === "court");
        return (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ color: "#5A5650" }}>
                <th className="py-2 text-left">Name</th>
                {Object.values(PAIR_NAMES).map((c) => (
                  <th key={c} className="py-2 text-center">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {court.map((r) => {
                const d = r.data as CourtData;
                return (
                  <tr key={r.id} className="border-t" style={{ borderColor: CARD_HAIR }}>
                    <td className="py-2 font-semibold">
                      {nameByPid.get(r.participant_id) ?? "—"}
                    </td>
                    {[1, 2, 3, 4, 5].map((pid) => {
                      const v = d.verdicts?.find((x) => x.pairId === pid);
                      const color = v?.vote === "greenwash" ? CLAY : v?.vote === "real" ? TEAL : "#8B8680";
                      return (
                        <td
                          key={pid}
                          className="py-2 text-center font-semibold"
                          style={{ color }}
                        >
                          {v ? (v.vote === "greenwash" ? "G" : "R") : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      }
      case "dragons": {
        const reflections = responses.filter((r) => r.round === "reflection");
        return (
          <ul className="flex flex-col gap-3">
            {reflections.map((r) => (
              <li key={r.id} className="rounded-md p-3" style={{ backgroundColor: "#F0EBDD" }}>
                <p className="text-sm italic">
                  &ldquo;{(r.data as ReflectionData).text}&rdquo;
                </p>
                <p className="mt-1 text-xs" style={{ color: "#5A5650" }}>
                  — {nameByPid.get(r.participant_id) ?? "Anonymous"}
                </p>
              </li>
            ))}
          </ul>
        );
      }
      case "outlier":
        return (
          <p className="text-sm" style={{ color: "#5A5650" }}>
            <strong>{panel.participantName}</strong> predicted{" "}
            <strong style={{ color: accent }}>{panel.predicted}%</strong> while
            the cohort actually came in at{" "}
            <strong style={{ color: accent }}>{panel.actualPct}%</strong>. A{" "}
            {panel.gap}-point gap.
          </p>
        );
      case "alignment":
        return (
          <p className="text-sm" style={{ color: "#5A5650" }}>
            Strongest consensus: <strong>{panel.mostAgreed.company}</strong> at{" "}
            {panel.mostAgreed.pct}% agreement on{" "}
            {panel.mostAgreed.vote === "greenwash" ? "Greenwash" : "Real progress"}
            . Most-contested: <strong>{panel.mostSplit.company}</strong>{" "}
            ({panel.mostSplit.greenwashPct}% / {panel.mostSplit.realPct}%).
          </p>
        );
      case "resilience":
        return (
          <p className="text-sm" style={{ color: "#5A5650" }}>
            <strong>{panel.sustained}</strong> of <strong>{panel.total}</strong>{" "}
            participants said they have already sustained a major behavior
            change for 6+ months. That&rsquo;s{" "}
            <strong style={{ color: accent }}>{panel.pct}%</strong>.
          </p>
        );
    }
  }

  const headlineByType: Record<Panel["type"], string> = {
    gap: "The Gap — full breakdown",
    funnel: "The Funnel — per-participant",
    court: "The Court — verdict matrix",
    dragons: "Reflection — every dragon",
    outlier: "The Outlier",
    alignment: "Where we agreed and split",
    resilience: "Resilience",
  };

  const followups: Record<Panel["type"], string[]> = {
    gap: [
      "What did the people who underestimated have in common?",
      "Did anyone overestimate? What might they have known that the rest didn't?",
      "If we corrected for the gap, what's the right policy ask we'd land on?",
    ],
    funnel: [
      "Which stage's drop-off surprised you?",
      "Were the sustainers different in any visible way at the start?",
      "What would unlock the stage you personally fell off at?",
    ],
    court: [
      "Which company did this cohort give the most benefit of the doubt to? Why?",
      "If the verdict changes when the data appears, is the verdict honest?",
      "Where are we mistaking polish for proof?",
    ],
    dragons: [
      "Whose dragon names yours?",
      "What did you almost write but didn't?",
      "Which one would a year-from-now you regret leaving on the page?",
    ],
    outlier: [
      "What did this person see?",
      "What might they be missing that the cohort caught?",
      "Is this person a leading or trailing indicator?",
    ],
    alignment: [
      "Why did this cohort agree most about that one?",
      "What does the split say about how we read the others?",
    ],
    resilience: [
      "What did the sustainers have access to?",
      "Do the rest of us know who to ask?",
    ],
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(10,9,8,0.7)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg p-8"
        style={{ backgroundColor: CARD_BG, color: CARD_INK }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-2xl leading-none"
          style={{ color: "#5A5650" }}
        >
          ×
        </button>
        <div
          className="text-xs font-bold uppercase tracking-[0.3em]"
          style={{ color: accent }}
        >
          Drill-down
        </div>
        <h2
          className="mt-2 font-serif text-3xl"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {headlineByType[panel.type]}
        </h2>

        <div className="mt-6">{detailFor(panel)}</div>

        <div className="mt-8 border-t pt-6" style={{ borderColor: CARD_HAIR }}>
          <div
            className="text-xs font-bold uppercase tracking-[0.3em]"
            style={{ color: accent }}
          >
            Discussion prompts
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm" style={{ color: CARD_INK }}>
            {followups[panel.type].map((q, i) => (
              <li key={i}>· {q}</li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-xs" style={{ color: "#5A5650" }}>
          Press <kbd className="rounded border px-1">Esc</kbd> or click outside to close.
        </p>
      </motion.div>
    </motion.div>
  );
}

function Stat({
  label,
  value,
  dim,
  bold,
  accent,
}: {
  label: string;
  value: string;
  dim?: boolean;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-widest" style={{ color: "#5A5650" }}>
        {label}
      </div>
      <div
        className="mt-1 tabular-nums"
        style={{
          fontSize: bold ? "3.5rem" : "2.5rem",
          fontWeight: bold ? 700 : 500,
          color: accent ?? (dim ? "#8B8680" : CARD_INK),
        }}
      >
        {value}
      </div>
    </div>
  );
}
