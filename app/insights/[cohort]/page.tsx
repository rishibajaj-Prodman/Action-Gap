"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useTheme, type CohortTheme } from "@/lib/theme";
import { useVisibilityRefetch } from "@/lib/useVisibilityRefetch";
import { Mascot } from "@/components/mascots/Mascot";
import { Avatar } from "@/components/Avatar";
import {
  generatePanels,
  type Panel,
  type ParticipantRow,
  type ResponseRow,
} from "@/lib/insights/generatePanels";

const PAPER = "#F5F1E8";
const INK = "#1A1A1A";
const ASH = "#5A5650";
const HAIR = "rgba(26,26,26,0.12)";
const TEAL = "#5BA89D";
const CLAY = "#C66B5C";

const SERIF = 'Georgia, "Times New Roman", serif';

const SPREAD_EMOJI: Record<string, string> = {
  cover: "✦",
  gap: "🪞",
  funnel: "🌀",
  court: "⚖️",
  dragons: "🐉",
  credits: "📸",
};

export default function InsightsPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  const theme = useTheme(cohort);
  const containerRef = useRef<HTMLDivElement>(null);

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
      .channel(`insights-zine-${cohort}-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "responses",
          filter: `cohort=eq.${cohort}`,
        },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `cohort=eq.${cohort}`,
        },
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
  const find = useMemo(
    () =>
      <T extends Panel["type"]>(t: T) =>
        panels.find((p) => p.type === t) as
          | Extract<Panel, { type: T }>
          | undefined,
    [panels]
  );

  const gap = find("gap");
  const funnel = find("funnel");
  const court = find("court");
  const dragons = find("dragons");
  const outlier = find("outlier");
  const alignment = find("alignment");
  const resilience = find("resilience");

  const builtBy = participants.map((p) => p.name).filter(Boolean);

  const { scrollYProgress } = useScroll({ target: containerRef });
  const urgencyWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  if (panels.length === 0) {
    return <EmptyState cohort={cohort} theme={theme} />;
  }

  return (
    <main
      ref={containerRef}
      className="relative min-h-screen overflow-x-hidden"
      style={{ backgroundColor: PAPER, color: INK }}
    >
      <UrgencyBar width={urgencyWidth} accent={theme.primary} />
      <CohortPattern theme={theme} />

      <CoverSpread cohort={cohort} theme={theme} />
      {gap && (
        <GapSpread
          panel={gap}
          outlier={outlier}
          theme={theme}
        />
      )}
      {funnel && (
        <FunnelSpread
          panel={funnel}
          resilience={resilience}
          theme={theme}
        />
      )}
      {court && (
        <CourtSpread
          panel={court}
          alignment={alignment}
          theme={theme}
        />
      )}
      {dragons && <DragonsSpread panel={dragons} theme={theme} />}
      <CreditsSpread cohort={cohort} theme={theme} builtBy={builtBy} />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Chrome                                                             */
/* ------------------------------------------------------------------ */

function UrgencyBar({
  width,
  accent,
}: {
  width: MotionValue<string>;
  accent: string;
}) {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 h-1"
      style={{ backgroundColor: "rgba(26,26,26,0.05)" }}
    >
      <motion.div
        className="h-full"
        style={{
          width,
          background: `linear-gradient(90deg, ${accent} 0%, #E8964F 60%, #C24232 100%)`,
        }}
      />
    </div>
  );
}

function CohortPattern({ theme }: { theme: CohortTheme }) {
  if (theme.pattern === "sine-waves") {
    return (
      <svg
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 w-full opacity-[0.06]"
        viewBox="0 0 800 120"
        preserveAspectRatio="none"
        height="240"
      >
        <path
          d="M0 60 Q 100 20, 200 60 T 400 60 T 600 60 T 800 60"
          stroke={theme.deep}
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M0 80 Q 100 40, 200 80 T 400 80 T 600 80 T 800 80"
          stroke={theme.deep}
          strokeWidth="2"
          fill="none"
        />
      </svg>
    );
  }
  if (theme.pattern === "diagonal-hatch") {
    return (
      <svg
        className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.04]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width="22"
            height="22"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="22" stroke={theme.deep} strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hatch)" />
      </svg>
    );
  }
  return (
    <svg
      className="pointer-events-none fixed inset-x-0 top-0 z-0 w-full opacity-[0.05]"
      viewBox="0 0 800 200"
      preserveAspectRatio="none"
      height="320"
    >
      {[20, 50, 80, 110, 140, 170].map((y) => (
        <path
          key={y}
          d={`M0 ${y} Q 200 ${y - 14}, 400 ${y} T 800 ${y}`}
          stroke={theme.deep}
          strokeWidth="1.2"
          fill="none"
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Spreads                                                            */
/* ------------------------------------------------------------------ */

function SpreadFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-8 py-24 md:px-12 ${className}`}
    >
      {children}
    </section>
  );
}

function Eyebrow({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-[0.4em]"
      style={{ color: accent }}
    >
      {children}
    </div>
  );
}

function PullQuote({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <p
      className="font-serif text-base italic leading-relaxed"
      style={{ fontFamily: SERIF, color: ASH, borderLeft: `3px solid ${accent}` }}
    >
      <span className="block pl-4">{children}</span>
    </p>
  );
}

function SpreadCorner({
  spread,
  rotate = 0,
}: {
  spread: keyof typeof SPREAD_EMOJI;
  rotate?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute right-6 top-6 select-none text-3xl md:right-12 md:top-12 md:text-4xl"
      initial={{ opacity: 0, rotate: rotate - 12 }}
      whileInView={{ opacity: 0.85, rotate }}
      viewport={{ once: false, margin: "-25%" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {SPREAD_EMOJI[spread]}
    </motion.div>
  );
}

/* ---- Cover ------------------------------------------------------- */

function CoverSpread({ cohort, theme }: { cohort: string; theme: CohortTheme }) {
  return (
    <SpreadFrame className="items-center text-center">
      <SpreadCorner spread="cover" rotate={0} />
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="select-none text-[10rem] leading-none md:text-[12rem]"
      >
        {theme.emoji}
      </motion.div>
      <Eyebrow accent={theme.primary}>The Action Gap · Insights</Eyebrow>
      <h1
        className="mt-3 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        style={{ fontFamily: SERIF, color: INK }}
      >
        {cohort}
      </h1>
      <p
        className="mt-5 max-w-2xl text-base italic md:text-lg"
        style={{ color: ASH, fontFamily: SERIF }}
      >
        {theme.tagline}.
      </p>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        className="mt-16 text-xs uppercase tracking-[0.4em]"
        style={{ color: ASH }}
      >
        ↓ &nbsp; scroll &nbsp; ↓
      </motion.div>
    </SpreadFrame>
  );
}

/* ---- Gap --------------------------------------------------------- */

function GapSpread({
  panel,
  outlier,
  theme,
}: {
  panel: Extract<Panel, { type: "gap" }>;
  outlier: Extract<Panel, { type: "outlier" }> | undefined;
  theme: CohortTheme;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30% 0px" });

  const directionLabel =
    panel.direction === "match"
      ? "Match"
      : panel.direction === "under"
        ? "Underestimated"
        : "Overestimated";

  const headline =
    panel.direction === "match"
      ? `We read the room exactly right.`
      : panel.direction === "under"
        ? `The room cared more than the room thought.`
        : `The room cared less than we hoped.`;

  return (
    <SpreadFrame>
      <SpreadCorner spread="gap" rotate={-6} />
      <Eyebrow accent={theme.primary}>01 · The Mirror</Eyebrow>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mt-3 max-w-4xl text-4xl font-bold leading-[1.1] md:text-6xl"
        style={{ fontFamily: SERIF, color: INK }}
      >
        {headline}
      </motion.h2>

      <div ref={ref} className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-12">
        <div className="md:col-span-8">
          <div className="relative">
            <div className="grid grid-cols-2 items-end gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="text-center"
              >
                <div className="text-xs uppercase tracking-widest" style={{ color: ASH }}>
                  We predicted
                </div>
                <div
                  className="mt-2 text-7xl font-light tabular-nums md:text-8xl"
                  style={{ color: ASH, fontFamily: SERIF }}
                >
                  {panel.predictedAvg}%
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: 0.55, duration: 0.7, ease: "easeOut" }}
                className="text-center"
              >
                <div className="text-xs uppercase tracking-widest" style={{ color: theme.primary }}>
                  Actually
                </div>
                <div
                  className="mt-2 text-8xl font-bold tabular-nums md:text-9xl"
                  style={{ color: theme.primary, fontFamily: SERIF }}
                >
                  {panel.actualPct}%
                </div>
              </motion.div>
            </div>

            <motion.svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 30"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 25 18 Q 50 4, 75 12"
                stroke={theme.primary}
                strokeWidth="0.4"
                fill="none"
                strokeDasharray="2 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={inView ? { pathLength: 1, opacity: 0.7 } : {}}
                transition={{ delay: 1.1, duration: 1.2, ease: "easeOut" }}
              />
            </motion.svg>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="mt-10 inline-flex items-baseline gap-3 rounded-full border px-5 py-2"
            style={{
              borderColor: theme.primary,
              backgroundColor: `${theme.primary}11`,
            }}
          >
            <span className="text-xs uppercase tracking-widest" style={{ color: ASH }}>
              {directionLabel} by
            </span>
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: theme.primary }}
            >
              {panel.delta}%
            </span>
          </motion.div>

          <div className="mt-10 max-w-xl">
            <PullQuote accent={theme.primary}>
              Pluralistic ignorance — when private opinion runs ahead of what
              we think the group believes. People underestimate how much
              others care about climate, and the misread itself becomes the
              barrier.
              <span className="not-italic block mt-3 text-xs uppercase tracking-widest" style={{ color: ASH }}>
                Andre et al., <em>Nature Climate Change</em>, 2024
              </span>
            </PullQuote>
          </div>
        </div>

        {outlier && (
          <aside className="md:col-span-4 md:pt-12">
            <div
              className="rounded-md border-l-4 p-5"
              style={{ borderColor: theme.primary, backgroundColor: "#EFE9D8" }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: theme.primary }}
              >
                · marginalia ·
              </div>
              <h3
                className="mt-2 text-xl font-bold leading-tight"
                style={{ fontFamily: SERIF, color: INK }}
              >
                {outlier.participantName} read the room differently.
              </h3>
              <p className="mt-3 text-sm" style={{ color: ASH }}>
                Their guess was{" "}
                <strong style={{ color: INK }}>{outlier.predicted}%</strong>.
                The room landed at{" "}
                <strong style={{ color: INK }}>{outlier.actualPct}%</strong>.
                A{" "}
                <strong style={{ color: theme.primary }}>{outlier.gap}-point</strong>{" "}
                gap.
              </p>
              <p className="mt-4 text-xs italic" style={{ color: ASH }}>
                What did this person see — or miss — that the rest of the cohort didn&rsquo;t?
              </p>
            </div>
          </aside>
        )}
      </div>
    </SpreadFrame>
  );
}

/* ---- Funnel ------------------------------------------------------ */

const STAGE_LABELS = [
  "Concerned",
  "Believe behavior matters",
  "Will change in 2026",
  "Sustained 6+ months",
];

function FunnelSpread({
  panel,
  resilience,
  theme,
}: {
  panel: Extract<Panel, { type: "funnel" }>;
  resilience: Extract<Panel, { type: "resilience" }> | undefined;
  theme: CohortTheme;
}) {
  return (
    <SpreadFrame>
      <SpreadCorner spread="funnel" rotate={4} />
      <Eyebrow accent={theme.primary}>02 · The Funnel</Eyebrow>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mt-3 max-w-4xl text-4xl font-bold leading-[1.1] md:text-6xl"
        style={{ fontFamily: SERIF, color: INK }}
      >
        From concern to action: where we lose ourselves.
      </motion.h2>

      <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-8">
          <div className="flex flex-col gap-3">
            {STAGE_LABELS.map((label, i) => {
              const pct = panel.stagePct[i];
              const count = panel.stageCount[i];
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20%" }}
                  transition={{ delay: i * 0.18, duration: 0.6, ease: "easeOut" }}
                  className="relative h-16 w-full overflow-hidden rounded-md"
                  style={{ backgroundColor: "rgba(26,26,26,0.05)" }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true, margin: "-20%" }}
                    transition={{
                      delay: i * 0.18 + 0.2,
                      duration: 0.9,
                      ease: "easeOut",
                    }}
                    className="h-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-5">
                    <span className="text-base font-semibold" style={{ color: INK }}>
                      {label}
                    </span>
                    <span
                      className="font-serif text-base font-semibold tabular-nums"
                      style={{ color: INK, fontFamily: SERIF }}
                    >
                      {count} · {pct}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{
              delay: STAGE_LABELS.length * 0.18 + 0.4,
              duration: 0.7,
              ease: "easeOut",
            }}
            className="mt-10 flex items-baseline gap-4"
          >
            <span
              className="font-serif text-7xl font-bold tabular-nums md:text-8xl"
              style={{ color: theme.primary, fontFamily: SERIF }}
            >
              {panel.dropoffPct}%
            </span>
            <span className="text-base md:text-lg" style={{ color: ASH }}>
              dropped off between concern and sustained action
            </span>
          </motion.div>
        </div>

        {resilience && (
          <aside className="md:col-span-4 md:pt-8">
            <div
              className="rounded-md border-l-4 p-5"
              style={{ borderColor: TEAL, backgroundColor: "#EFE9D8" }}
            >
              <div
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: TEAL }}
              >
                · resilience ·
              </div>
              <h3
                className="mt-2 text-xl font-bold leading-tight"
                style={{ fontFamily: SERIF, color: INK }}
              >
                {resilience.sustained} of {resilience.total} have already done it.
              </h3>
              <p className="mt-3 text-sm" style={{ color: ASH }}>
                <strong style={{ color: TEAL }}>{resilience.pct}%</strong> say
                they&rsquo;ve sustained a major behavior change for 6+ months.
              </p>
              <p className="mt-4 text-xs italic" style={{ color: ASH }}>
                What did the sustainers have access to that the rest of us didn&rsquo;t?
              </p>
            </div>
          </aside>
        )}
      </div>
    </SpreadFrame>
  );
}

/* ---- Court ------------------------------------------------------- */

function CourtSpread({
  panel,
  alignment,
  theme,
}: {
  panel: Extract<Panel, { type: "court" }>;
  alignment: Extract<Panel, { type: "alignment" }> | undefined;
  theme: CohortTheme;
}) {
  return (
    <SpreadFrame>
      <SpreadCorner spread="court" rotate={-4} />
      <Eyebrow accent={theme.primary}>03 · The Court</Eyebrow>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mt-3 max-w-4xl text-4xl font-bold leading-[1.1] md:text-6xl"
        style={{ fontFamily: SERIF, color: INK }}
      >
        Five CEOs walked into a room.
      </motion.h2>
      <p
        className="mt-4 max-w-2xl text-base italic"
        style={{ color: ASH, fontFamily: SERIF }}
      >
        The {cohortName(theme)} called{" "}
        <strong style={{ color: CLAY }}>{panel.greenwashPct}%</strong>{" "}
        of corporate climate claims as greenwash.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-5">
        {panel.perCompany.map((row, i) => (
          <CompanyVerdictCard key={row.pairId} row={row} delay={i * 0.12} accent={theme.primary} />
        ))}
      </div>

      {alignment && (
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.6 }}
            className="rounded-md border p-5"
            style={{ borderColor: HAIR, backgroundColor: "#FAF6EC" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: theme.primary }}
            >
              · most agreed ·
            </div>
            <div
              className="mt-2 text-2xl font-bold"
              style={{ fontFamily: SERIF, color: INK }}
            >
              {alignment.mostAgreed.company}
            </div>
            <p className="mt-2 text-sm" style={{ color: ASH }}>
              <strong style={{ color: theme.primary }}>
                {alignment.mostAgreed.pct}%
              </strong>{" "}
              voted{" "}
              {alignment.mostAgreed.vote === "greenwash" ? (
                <strong style={{ color: CLAY }}>Greenwash</strong>
              ) : (
                <strong style={{ color: TEAL }}>Real progress</strong>
              )}
              .
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20%" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-md border p-5"
            style={{ borderColor: HAIR, backgroundColor: "#FAF6EC" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-[0.3em]"
              style={{ color: ASH }}
            >
              · most split ·
            </div>
            <div
              className="mt-2 text-2xl font-bold"
              style={{ fontFamily: SERIF, color: INK }}
            >
              {alignment.mostSplit.company}
            </div>
            <p className="mt-2 text-sm" style={{ color: ASH }}>
              <strong style={{ color: CLAY }}>
                {alignment.mostSplit.greenwashPct}%
              </strong>{" "}
              greenwash ·{" "}
              <strong style={{ color: TEAL }}>
                {alignment.mostSplit.realPct}%
              </strong>{" "}
              real
            </p>
          </motion.div>
        </div>
      )}
    </SpreadFrame>
  );
}

function CompanyVerdictCard({
  row,
  delay,
  accent,
}: {
  row: Extract<Panel, { type: "court" }>["perCompany"][number];
  delay: number;
  accent: string;
}) {
  const verdictColor =
    row.verdict === "Greenwash"
      ? CLAY
      : row.verdict === "Real progress"
        ? TEAL
        : row.verdict === "Split"
          ? ASH
          : ASH;
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -25, y: 22 }}
      whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
      viewport={{ once: true, margin: "-20%" }}
      transition={{ delay, duration: 0.6, ease: "easeOut" }}
      style={{ transformPerspective: 800 }}
      className="rounded-md border p-4 text-center"
    >
      <div
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: accent }}
      >
        {row.company}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(26,26,26,0.08)" }}>
        {row.totalVotes > 0 && (
          <div className="flex h-full">
            <div style={{ width: `${row.greenwashPct}%`, backgroundColor: CLAY }} />
            <div style={{ width: `${row.realPct}%`, backgroundColor: TEAL }} />
          </div>
        )}
      </div>
      <div
        className="mt-3 text-sm font-bold uppercase tracking-wider"
        style={{ color: verdictColor }}
      >
        {row.verdict}
      </div>
      <div className="mt-1 text-[10px]" style={{ color: ASH }}>
        {row.totalVotes} {row.totalVotes === 1 ? "vote" : "votes"}
      </div>
    </motion.div>
  );
}

function cohortName(theme: CohortTheme) {
  return theme.name;
}

/* ---- Dragons ----------------------------------------------------- */

function tiltFor(seed: string, range: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff;
  return (h % (range * 2 + 1)) - range;
}

function DragonsSpread({
  panel,
  theme,
}: {
  panel: Extract<Panel, { type: "dragons" }>;
  theme: CohortTheme;
}) {
  return (
    <SpreadFrame>
      <SpreadCorner spread="dragons" rotate={6} />
      <Eyebrow accent={theme.primary}>04 · Reflection</Eyebrow>
      <motion.h2
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="mt-3 max-w-4xl text-4xl font-bold leading-[1.1] md:text-6xl"
        style={{ fontFamily: SERIF, color: INK }}
      >
        The dragons we&rsquo;re taking home.
      </motion.h2>

      {panel.themes.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {panel.themes.map((t, i) => (
            <motion.span
              key={t.word}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${theme.primary}1F`,
                color: theme.primary,
                fontSize: `${0.85 + Math.min(t.count, 6) * 0.07}rem`,
              }}
            >
              {t.word}
            </motion.span>
          ))}
        </div>
      )}

      <div className="relative mt-12 flex flex-wrap justify-center gap-4 md:gap-5">
        {panel.quotes.map((q, i) => {
          const tilt = tiltFor(`${q.name}-${i}`, 4);
          return (
            <motion.div
              key={`${q.name}-${i}`}
              initial={{ opacity: 0, y: 50, rotate: tilt - 6 }}
              whileInView={{ opacity: 1, y: 0, rotate: tilt }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{
                delay: i * 0.12,
                type: "spring",
                stiffness: 90,
                damping: 14,
              }}
              className="flex w-72 flex-col rounded-sm p-4 md:w-80"
              style={{
                backgroundColor: "#FFFCF2",
                color: INK,
                boxShadow:
                  "0 10px 24px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)",
              }}
            >
              <p
                className="font-serif text-base italic leading-snug"
                style={{ fontFamily: SERIF }}
              >
                &ldquo;{q.text}&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-end gap-2 text-xs" style={{ color: ASH }}>
                <Avatar name={q.name} size={20} />
                <span>— {q.name}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {panel.quotes.length === 0 && (
        <p className="mt-12 text-center text-base italic" style={{ color: ASH }}>
          No reflections were shared this round.
        </p>
      )}
    </SpreadFrame>
  );
}

/* ---- Credits ----------------------------------------------------- */

function CreditsSpread({
  cohort,
  theme,
  builtBy,
}: {
  cohort: string;
  theme: CohortTheme;
  builtBy: string[];
}) {
  return (
    <SpreadFrame className="items-center text-center">
      <SpreadCorner spread="credits" rotate={0} />
      <Eyebrow accent={theme.primary}>Built by</Eyebrow>

      <div className="mt-8 flex max-w-3xl flex-wrap justify-center gap-x-3 gap-y-2">
        {builtBy.length === 0 ? (
          <span className="text-base italic" style={{ color: ASH }}>
            no participants
          </span>
        ) : (
          builtBy.map((name, i) => (
            <motion.span
              key={`${name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20%" }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="text-xl font-semibold md:text-2xl"
              style={{ color: theme.primary, fontFamily: SERIF }}
            >
              {name}
              {i < builtBy.length - 1 && (
                <span style={{ color: ASH }} className="ml-3">
                  ·
                </span>
              )}
            </motion.span>
          ))
        )}
      </div>

      <div className="mt-14">
        <Mascot cohort={cohort} size={56} />
      </div>

      <p className="mt-10 text-base italic" style={{ color: ASH, fontFamily: SERIF }}>
        Pluralistic ignorance — Andre et al., <em>Nature Climate Change</em>, 2024
      </p>

      <p
        className="mt-6 text-xs uppercase tracking-[0.4em]"
        style={{ color: ASH }}
      >
        📸 Screenshot this · The Action Gap · HHL Leipzig MBA
      </p>
    </SpreadFrame>
  );
}

/* ---- Empty ------------------------------------------------------- */

function EmptyState({ cohort, theme }: { cohort: string; theme: CohortTheme }) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ backgroundColor: PAPER, color: INK }}
    >
      <div className="select-none text-[7rem] leading-none">{theme.emoji}</div>
      <h1
        className="mt-6 text-3xl font-bold"
        style={{ fontFamily: SERIF, color: INK }}
      >
        {cohort}
      </h1>
      <p className="mt-3 text-base italic" style={{ color: ASH, fontFamily: SERIF }}>
        Insights will appear when the session has data.
      </p>
    </main>
  );
}
