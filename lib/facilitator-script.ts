// Facilitator teleprompter — beat-by-beat script for the live session.
// The control panel detects the current beat from session state and renders
// the script + primary action below. Edit copy here without touching the page.

export type PrimaryActionId =
  | "start_all"
  | "to_mirror"
  | "to_funnel"
  | "to_court"
  | "to_reflection"
  | "end_all";

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
export const BEATS: Record<string, Beat> = {
  preparing: {
    id: "preparing",
    label: "Preparing · room filling",
    action: "Walk through arrival → framing → start. Hit the action when ready.",
    primaryAction: "start_all",
    primaryActionLabel: "▸ Start all 3 sessions",
    script: `(People walking in.)

"Welcome in. Three cohorts today — Dolphins by the front, Foxes in the middle, Elephants at the back. Sit with your animal. Phones out, but don't scan yet."

(When most are seated, frame the session:)

"Today's session is about climate. Not the science — you have that. The behavior. Why people who agree the house is on fire keep watering the lawn.

We're going to experience the gap between what we say and what we do. Three rooms, four rounds, fifty minutes."

(When ready to begin, hit Start below — QR codes go live on all 3 posters:)

"Scan the QR on your cohort's screen. First name only — it goes on the poster. Watch your name appear up there. We move when everyone's in."`,
    next: "After Start: people scan, the rosters fill. Then begin The Mirror.",
  },

  joining: {
    id: "joining",
    label: "Joining · roster filling",
    action: "Watch the rosters fill. Begin Round 1 when everyone's in.",
    primaryAction: "to_mirror",
    primaryActionLabel: "▸ Begin The Mirror (all 3)",
    script: `(QR codes are up on all 3 posters. People are scanning and joining.)

"Names are appearing on the screens. We move once everyone's in."

(Optional, if a cohort is lagging:)

"Foxes — we're missing two. Dolphins, you can see Sara just joined."

(When all 3 rosters look full:)

"Round one is The Mirror. I'll explain it as we go."`,
    next: "mirror_collect.",
  },

  mirror_collect: {
    id: "mirror_collect",
    label: "Round 1 · The Mirror · collecting",
    action: "Watch counters. Click Reveal in each cohort column when X = Y.",
    script: `"Round one. The Mirror.

I'm going to ask you what YOU think this room thinks. Then I'll ask what you actually think. Two questions, fifteen seconds."

(Silence — let them submit. Optional nudges:)

"Foxes — Lena, take your time. Elephants — we're waiting on Pavel."`,
    next: "When X = Y per cohort, hit Reveal in each column. ~13s reveal animation plays.",
  },

  mirror_post: {
    id: "mirror_post",
    label: "Round 1 · The Mirror · revealed",
    action: "Hold ~75s. Land the lesson. Then advance to The Funnel.",
    primaryAction: "to_funnel",
    primaryActionLabel: "▸ Begin The Funnel (all 3)",
    script: `(Wait through the ~13s reveal animation, then:)

"Look at the gap. You guessed the room cared LESS than it does.

Andre and colleagues, Nature Climate Change 2024 — we systematically underestimate climate concern by 20 to 30 points. The biggest barrier to action might not be apathy. It's the false belief that everyone ELSE is apathetic.

Pluralistic ignorance — live, in this room."`,
    next: "funnel_collect.",
  },

  funnel_collect: {
    id: "funnel_collect",
    label: "Round 2 · The Funnel · collecting",
    action: "Narrate the bars as they narrow. Click Reveal in each column when full.",
    script: `"Round two. The Funnel.

Four yes/no questions. Watch the bars on screen as you answer."

(While bars fill, narrate live:)

"Concerned — full bar. Believe behavior matters — still high. Will change in 2026 — there's the drop. Sustained six months — and there it falls off the cliff."`,
    next: "When X = Y per cohort, hit Reveal. ~14s reveal.",
  },

  funnel_post: {
    id: "funnel_post",
    label: "Round 2 · The Funnel · revealed",
    action: "Land the action gap. Then advance to The Court.",
    primaryAction: "to_court",
    primaryActionLabel: "▸ Begin The Court (all 3)",
    script: `(Wait through reveal, signature, drop-off punchline.)

"Bamberg & Möser, 2007 — intention explains only 27% of behavior. Van Valkengoed & Steg, 2019 — knowledge is a WEAK predictor; self-efficacy is the strong one.

That drop you just saw? That's the action gap. In this room. Right now."`,
    next: "court_collect.",
  },

  court_collect: {
    id: "court_collect",
    label: "Round 3 · The Court · collecting",
    action: "Watch vote counts. Click Reveal in each column when full.",
    script: `"Round three. The Court.

Five real CEO climate quotes paired with what their company actually did. You're the jury — greenwash, or real progress."

(Silence. Occasionally:)

"BP. Microsoft. Unilever. Take a breath on each one."`,
    next: "When X = Y per cohort, hit Reveal. ~13s reveal of 5 staggered verdicts.",
  },

  court_post: {
    id: "court_post",
    label: "Round 3 · The Court · revealed",
    action: "Land the corporate say-do gap. Then advance to Reflection.",
    primaryAction: "to_reflection",
    primaryActionLabel: "▸ Begin Reflection (all 3)",
    script: `(Wait through the staggered verdict reveals + signature.)

"European Commission, 2020 — 42% of green claims false or deceptive. Net Zero Tracker — 63% of the Forbes Global 2000 have net-zero pledges; 7% are credible.

A nine-to-one ratio of announcement to integrity. SBTi delisted 239 companies in 2024 alone.

The corporate say-do gap. Judged by you."`,
    next: "reflection_collect.",
  },

  reflection_collect: {
    id: "reflection_collect",
    label: "Round 4 · Reflection · collecting",
    action: "Read sticky notes aloud as they land. Click Reveal when full.",
    script: `"Last round. Gifford's 'Dragons of Inaction' — 2011, American Psychologist. Seven barriers that live inside us.

Name yours. One sentence. The dragon you're taking home."

(As notes appear on the poster, read 2-3 aloud:)

"Sara — 'I'll stop pretending recycling is enough.' Marcus — 'I keep waiting for someone else.'

That's an Ideologies dragon and a Diffusion-of-Responsibility dragon, named."`,
    next: "When X = Y per cohort, hit Reveal.",
  },

  reflection_post: {
    id: "reflection_post",
    label: "Round 4 · Reflection · revealed",
    action: "Hold the wall of dragons. Move to closing provocation.",
    primaryAction: "end_all",
    primaryActionLabel: "▸ End all 3 sessions",
    script: `(All sticky notes are up. Pause. Let the room read.)

"Two provocations.

One: Companies have updated their values, their reports, and their org charts. They have NOT updated how they make decisions.

Two: Behavioral nudges may be the most successful PR campaign in the history of climate inaction — they make us feel we're acting while keeping the system intact.

Pick a fight. Defend or attack."`,
    next: "Open discussion, then End all 3 sessions to lock the posters.",
  },

  wrap_provocation: {
    id: "wrap_provocation",
    label: "Wrap · provocation hold",
    action: "Discussion is open. End the sessions when ready.",
    primaryAction: "end_all",
    primaryActionLabel: "▸ End all 3 sessions",
    script: `(Discussion is in flight. When it tapers:)

"Look at all three cohorts. Three rooms. Same pattern. That's the lesson — it's not your room. It's every room."`,
    next: "End all 3 sessions to freeze the journey posters.",
  },

  close: {
    id: "close",
    label: "Closed · screenshot moment",
    action: "Posters are locked. The room takes their screenshot.",
    script: `"Screenshot your poster. That's yours.

The dragon you named today — that's the one you slay first.

Thanks, all. See you on the other side of the action gap."`,
    next: "Use Clear Roster on each cohort to free them up for the next class.",
  },

  out_of_sync: {
    id: "out_of_sync",
    label: "⚠ Cohorts out of sync",
    action: "Use the round-jump buttons in each column to align cohorts.",
    script: `(Pause if needed.)

"Hold tight — syncing the screens for a second."

(Cohorts have diverged. Get all 3 to the same round + reveal_state before resuming the script. The teleprompter will jump back automatically once aligned.)`,
    next: "Once aligned, the script jumps back to the right beat automatically.",
  },
};

type BeatInput = {
  sessions: Record<
    string,
    | {
        started_at: string | null;
        ended_at: string | null;
        current_round: string | null;
        reveal_state: string | null;
      }
    | undefined
  >;
};

const COHORTS = ["Dolphins", "Foxes", "Elephants"] as const;

export function detectBeat({ sessions }: BeatInput): Beat {
  const states = COHORTS.map((c) => ({
    cohort: c,
    started: !!sessions[c]?.started_at,
    ended: !!sessions[c]?.ended_at,
    round: sessions[c]?.current_round ?? "idle",
    reveal: sessions[c]?.reveal_state ?? "collecting",
  }));

  // All not_started → preparing (covers arrival → framing → start prompt).
  if (states.every((s) => !s.started)) return BEATS.preparing;

  // All ended → close.
  if (states.every((s) => s.ended)) return BEATS.close;

  // Mixed not_started/started OR mixed live/ended → out of sync.
  const startedCount = states.filter((s) => s.started).length;
  const endedCount = states.filter((s) => s.ended).length;
  if (startedCount !== 0 && startedCount !== 3) return BEATS.out_of_sync;
  if (endedCount !== 0 && endedCount !== 3) return BEATS.out_of_sync;

  // Round divergence within live sessions.
  const rounds = new Set(states.map((s) => s.round));
  if (rounds.size > 1) return BEATS.out_of_sync;
  const round = states[0].round;

  if (round === "idle") return BEATS.joining;
  if (round === "complete") return BEATS.wrap_provocation;

  // Reveal-state divergence within a round.
  const reveals = new Set(states.map((s) => s.reveal));
  if (reveals.size > 1) return BEATS.out_of_sync;
  const reveal = states[0].reveal;

  const beatKey =
    reveal === "collecting" ? `${round}_collect` : `${round}_post`;
  return BEATS[beatKey] ?? BEATS.out_of_sync;
}
