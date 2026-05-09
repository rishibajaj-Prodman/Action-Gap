// Facilitator teleprompter — beat-by-beat script for the live session.
// Cohorts run SEQUENTIALLY: Dolphins → Foxes → Elephants (or whatever order
// each gets started). At any time there is at most ONE active cohort. The
// teleprompter detects which cohort is active (or next up) and surfaces the
// script + a single one-click action that operates on that cohort alone.

export type PrimaryActionId =
  | "start"
  | "to_mirror"
  | "to_funnel"
  | "to_court"
  | "to_reflection"
  | "end";

export type BeatContext = {
  cohort?: string; // active or next-up cohort
  justEnded?: string; // for between_cohorts
};

export type Beat = {
  id: string;
  label: string;
  action: string;
  primaryAction?: PrimaryActionId;
  primaryActionLabel?: string;
  script: string;
  next?: string;
};

// Stage directions in (parens) are inline cues to the facilitator;
// everything else is intended to be spoken.
//
// Templates use {cohort} and {justEnded} placeholders that are filled in by
// renderTemplate() with the active-cohort context at render time.
export const BEATS: Record<string, Beat> = {
  preparing_first: {
    id: "preparing_first",
    label: "Preparing · room filling",
    action: "Walk through arrival → framing → start prompt. Hit the action when ready.",
    primaryAction: "start",
    primaryActionLabel: "▸ Start the {cohort} session",
    script: `(People walking in.)

"Welcome in. We'll run this in three rooms today — Dolphins, then Foxes, then Elephants. Each cohort gets its own session — same shape, different room.

We'll start with {cohort} first. Pick your seat with your cohort. Phones out, but don't scan yet."

(When most are seated, frame the arc:)

"This session is about climate. Not the science — you have that. The behavior. Why people who agree the house is on fire keep watering the lawn.

We're going to experience the gap between what we say and what we do. Four rounds, about fifty minutes."

(When ready to begin {cohort}'s session — hit the action below to put the QR live:)

"Scan the QR on the screen. First name only — it goes on the poster. We move when everyone's in."`,
    next: "After Start: people scan, the {cohort} roster fills. Then begin The Mirror.",
  },

  between_cohorts: {
    id: "between_cohorts",
    label: "Between cohorts · {justEnded} done · {cohort} next",
    action: "Brief transition. Hit Start when {cohort} is ready.",
    primaryAction: "start",
    primaryActionLabel: "▸ Start the {cohort} session",
    script: `({justEnded} just wrapped. Their poster is locked on screen for screenshots.)

"That's {justEnded} done. {cohort} — you're up.

Same shape: four rounds, about fifty minutes. The screen will reset to your cohort.

Phones out. When I hit Start, your QR goes live."`,
    next: "Watch the {cohort} roster fill. Then begin The Mirror.",
  },

  joining: {
    id: "joining",
    label: "{cohort} · roster filling",
    action: "Watch the roster. Begin Round 1 when everyone's in.",
    primaryAction: "to_mirror",
    primaryActionLabel: "▸ Begin The Mirror ({cohort})",
    script: `(QR is up on the {cohort} poster. People are scanning and joining.)

"Names are appearing on the screen. We move once everyone's in."

(Optional, if someone is lagging:)

"We're missing two — take your time."

(When the roster looks full:)

"Round one is The Mirror. I'll explain it as we go."`,
    next: "mirror_collect.",
  },

  mirror_collect: {
    id: "mirror_collect",
    label: "{cohort} · Round 1 · The Mirror · collecting",
    action: "Watch the {cohort} counter. Click Reveal in their column when X = Y.",
    script: `"Round one. The Mirror.

I'm going to ask you what YOU think this room thinks. Then I'll ask what you actually think. Two questions, fifteen seconds."

(Silence — let them submit. Optional nudge by name if a counter stalls.)`,
    next: "When X = Y, hit Reveal in {cohort}'s column. ~13s reveal animation plays.",
  },

  mirror_post: {
    id: "mirror_post",
    label: "{cohort} · Round 1 · The Mirror · revealed",
    action: "Hold ~75s. Land the lesson. Then advance to The Funnel.",
    primaryAction: "to_funnel",
    primaryActionLabel: "▸ Begin The Funnel ({cohort})",
    script: `(Wait through the ~13s reveal animation, then:)

"Look at the gap. You guessed the room cared LESS than it does.

Andre and colleagues, Nature Climate Change 2024 — we systematically underestimate climate concern by 20 to 30 points. The biggest barrier to action might not be apathy. It's the false belief that everyone ELSE is apathetic.

Pluralistic ignorance — live, in this room."`,
    next: "funnel_collect.",
  },

  funnel_collect: {
    id: "funnel_collect",
    label: "{cohort} · Round 2 · The Funnel · collecting",
    action: "Narrate the bars as they narrow. Click Reveal in {cohort}'s column when full.",
    script: `"Round two. The Funnel.

Four yes/no questions. Watch the bars on screen as you answer."

(While bars fill, narrate live:)

"Concerned — full bar. Believe behavior matters — still high. Will change in 2026 — there's the drop. Sustained six months — and there it falls off the cliff."`,
    next: "When X = Y, hit Reveal in {cohort}'s column. ~14s reveal.",
  },

  funnel_post: {
    id: "funnel_post",
    label: "{cohort} · Round 2 · The Funnel · revealed",
    action: "Land the action gap. Then advance to The Court.",
    primaryAction: "to_court",
    primaryActionLabel: "▸ Begin The Court ({cohort})",
    script: `(Wait through reveal, signature, drop-off punchline.)

"Bamberg & Möser, 2007 — intention explains only 27% of behavior. Van Valkengoed & Steg, 2019 — knowledge is a WEAK predictor; self-efficacy is the strong one.

That drop you just saw? That's the action gap. In this room. Right now."`,
    next: "court_collect.",
  },

  court_collect: {
    id: "court_collect",
    label: "{cohort} · Round 3 · The Court · collecting",
    action: "Watch vote counts. Click Reveal in {cohort}'s column when full.",
    script: `"Round three. The Court.

Five real CEO climate quotes paired with what their company actually did. You're the jury — greenwash, or real progress."

(Silence. Occasionally:)

"BP. Microsoft. Unilever. Take a breath on each one."`,
    next: "When X = Y, hit Reveal. ~13s reveal of 5 staggered verdicts + frontline stats.",
  },

  court_post: {
    id: "court_post",
    label: "{cohort} · Round 3 · The Court · revealed",
    action: "Land the corporate say-do gap. Then advance to Reflection.",
    primaryAction: "to_reflection",
    primaryActionLabel: "▸ Begin Reflection ({cohort})",
    script: `(Wait through the staggered verdict reveals + signature + frontline stats.)

"European Commission, 2020 — 42% of green claims false or deceptive. Net Zero Tracker — 63% of the Forbes Global 2000 have net-zero pledges; 7% are credible.

A nine-to-one ratio of announcement to integrity. SBTi delisted 239 companies in 2024 alone.

The corporate say-do gap. Judged by you."`,
    next: "reflection_collect.",
  },

  reflection_collect: {
    id: "reflection_collect",
    label: "{cohort} · Round 4 · Reflection · collecting",
    action: "Read sticky notes aloud as they land. Click Reveal when full.",
    script: `"Last round. Gifford's 'Dragons of Inaction' — 2011, American Psychologist. Seven barriers that live inside us.

Name yours. One sentence. The dragon you're taking home."

(As notes appear on the poster, read 2-3 aloud:)

"Sara — 'I'll stop pretending recycling is enough.' Marcus — 'I keep waiting for someone else.'

That's an Ideologies dragon and a Diffusion-of-Responsibility dragon, named."`,
    next: "When X = Y, hit Reveal in {cohort}'s column.",
  },

  reflection_post: {
    id: "reflection_post",
    label: "{cohort} · Round 4 · Reflection · revealed + provocation",
    action: "Hold the wall of dragons, run the provocation, then end the cohort.",
    primaryAction: "end",
    primaryActionLabel: "▸ End {cohort}'s session",
    script: `(All sticky notes are up. Pause. Let the room read.)

"Two provocations.

One: Companies have updated their values, their reports, and their org charts. They have NOT updated how they make decisions.

Two: Behavioral nudges may be the most successful PR campaign in the history of climate inaction — they make us feel we're acting while keeping the system intact.

Pick a fight. Defend or attack."

(Open discussion. When it tapers, end the cohort to lock the journey poster.)`,
    next: "After discussion: End {cohort} to freeze their journey poster.",
  },

  close: {
    id: "close",
    label: "All three sessions complete · screenshot moment",
    action: "All cohorts done. The room takes their screenshot.",
    script: `(All three posters are locked. Each cohort can see their own journey.)

"Look at all three. Three rooms. Same pattern. That's the lesson — it's not your room. It's every room.

Screenshot your poster. That's yours.

The dragon you named today — that's the one you slay first.

Thanks, all. See you on the other side of the action gap."`,
    next: "Use Clear Roster on each cohort to free them up for the next class.",
  },
};

type SessionState = {
  started_at: string | null;
  ended_at: string | null;
  current_round: string | null;
  reveal_state: string | null;
};

const COHORTS = ["Dolphins", "Foxes", "Elephants"] as const;
type Cohort = (typeof COHORTS)[number];

export type DetectedBeat = {
  beat: Beat;
  ctx: BeatContext;
};

export function detectBeat({
  sessions,
}: {
  sessions: Record<string, SessionState | undefined>;
}): DetectedBeat {
  const states = COHORTS.map((c) => ({
    cohort: c,
    started: !!sessions[c]?.started_at,
    ended: !!sessions[c]?.ended_at,
    round: sessions[c]?.current_round ?? "idle",
    reveal: sessions[c]?.reveal_state ?? "collecting",
    startedAt: sessions[c]?.started_at ?? null,
    endedAt: sessions[c]?.ended_at ?? null,
  }));

  const liveCohort = states.find((s) => s.started && !s.ended);
  const allEnded = states.every((s) => s.ended);
  const noneStarted = states.every((s) => !s.started);

  // All three sessions complete.
  if (allEnded) {
    return { beat: BEATS.close, ctx: {} };
  }

  // No live cohort right now.
  if (!liveCohort) {
    if (noneStarted) {
      // First cohort up — Dolphins by default (first in COHORTS order).
      return {
        beat: BEATS.preparing_first,
        ctx: { cohort: COHORTS[0] },
      };
    }
    // At least one ended, none currently live → between cohorts.
    const justEnded = [...states]
      .filter((s) => s.ended && s.endedAt)
      .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""))[0];
    const nextUp = states.find((s) => !s.started);
    if (nextUp) {
      return {
        beat: BEATS.between_cohorts,
        ctx: {
          cohort: nextUp.cohort,
          justEnded: justEnded?.cohort,
        },
      };
    }
    // Defensive: all cohorts have started but none live — treat as close.
    return { beat: BEATS.close, ctx: {} };
  }

  // One cohort is live. Detect its round + reveal state.
  const round = liveCohort.round;
  const reveal = liveCohort.reveal;
  const ctx: BeatContext = { cohort: liveCohort.cohort };

  if (round === "idle") return { beat: BEATS.joining, ctx };

  // current_round = "complete" only ever happens via End, which also sets
  // ended_at — so the cohort wouldn't be "live" anymore. Defensive fallback:
  if (round === "complete") return { beat: BEATS.reflection_post, ctx };

  const beatKey =
    reveal === "collecting" ? `${round}_collect` : `${round}_post`;
  return { beat: BEATS[beatKey] ?? BEATS.joining, ctx };
}

export function renderTemplate(template: string, ctx: BeatContext): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = ctx[key as keyof BeatContext];
    return value ?? `{${key}}`;
  });
}
