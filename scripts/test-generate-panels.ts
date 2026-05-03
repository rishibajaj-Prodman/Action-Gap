import {
  generatePanels,
  type ParticipantRow,
  type ResponseRow,
} from "../lib/insights/generatePanels";

function pid(n: number) {
  return `pid_${n.toString().padStart(3, "0")}`;
}

const participants: ParticipantRow[] = [
  { participant_id: pid(1), name: "Sara", active: true },
  { participant_id: pid(2), name: "Marcus", active: true },
  { participant_id: pid(3), name: "Lena", active: true },
  { participant_id: pid(4), name: "Pavel", active: true },
  { participant_id: pid(5), name: "Eva", active: true },
];

const responses: ResponseRow[] = [
  // Mirror — predictions 40,55,60,65,70 (avg 58); 4 of 5 believe → actual 80%
  { id: "m1", cohort: "Dolphins", round: "mirror", participant_id: pid(1), data: { prediction: 40, belief: true } },
  { id: "m2", cohort: "Dolphins", round: "mirror", participant_id: pid(2), data: { prediction: 55, belief: true } },
  { id: "m3", cohort: "Dolphins", round: "mirror", participant_id: pid(3), data: { prediction: 60, belief: true } },
  { id: "m4", cohort: "Dolphins", round: "mirror", participant_id: pid(4), data: { prediction: 65, belief: false } },
  { id: "m5", cohort: "Dolphins", round: "mirror", participant_id: pid(5), data: { prediction: 70, belief: true } },

  // Funnel — drop-off classic: 5 → 4 → 3 → 1
  { id: "f1", cohort: "Dolphins", round: "funnel", participant_id: pid(1), data: { stage1: true, stage2: true, stage3: true, stage4: true } },
  { id: "f2", cohort: "Dolphins", round: "funnel", participant_id: pid(2), data: { stage1: true, stage2: true, stage3: true, stage4: false } },
  { id: "f3", cohort: "Dolphins", round: "funnel", participant_id: pid(3), data: { stage1: true, stage2: true, stage3: false, stage4: false } },
  { id: "f4", cohort: "Dolphins", round: "funnel", participant_id: pid(4), data: { stage1: true, stage2: false, stage3: false, stage4: false } },
  { id: "f5", cohort: "Dolphins", round: "funnel", participant_id: pid(5), data: { stage1: true, stage2: true, stage3: false, stage4: false } },

  // Court — 5 verdicts each, 5 participants
  { id: "c1", cohort: "Dolphins", round: "court", participant_id: pid(1), data: { verdicts: [
    { pairId: 1, vote: "greenwash" }, { pairId: 2, vote: "greenwash" },
    { pairId: 3, vote: "real" }, { pairId: 4, vote: "greenwash" },
    { pairId: 5, vote: "greenwash" },
  ] } },
  { id: "c2", cohort: "Dolphins", round: "court", participant_id: pid(2), data: { verdicts: [
    { pairId: 1, vote: "greenwash" }, { pairId: 2, vote: "real" },
    { pairId: 3, vote: "real" }, { pairId: 4, vote: "greenwash" },
    { pairId: 5, vote: "greenwash" },
  ] } },
  { id: "c3", cohort: "Dolphins", round: "court", participant_id: pid(3), data: { verdicts: [
    { pairId: 1, vote: "greenwash" }, { pairId: 2, vote: "greenwash" },
    { pairId: 3, vote: "real" }, { pairId: 4, vote: "greenwash" },
    { pairId: 5, vote: "greenwash" },
  ] } },
  { id: "c4", cohort: "Dolphins", round: "court", participant_id: pid(4), data: { verdicts: [
    { pairId: 1, vote: "greenwash" }, { pairId: 2, vote: "real" },
    { pairId: 3, vote: "greenwash" }, { pairId: 4, vote: "real" },
    { pairId: 5, vote: "greenwash" },
  ] } },
  { id: "c5", cohort: "Dolphins", round: "court", participant_id: pid(5), data: { verdicts: [
    { pairId: 1, vote: "greenwash" }, { pairId: 2, vote: "greenwash" },
    { pairId: 3, vote: "real" }, { pairId: 4, vote: "greenwash" },
    { pairId: 5, vote: "real" },
  ] } },

  // Reflection — overlapping dragons keywords
  { id: "r1", cohort: "Dolphins", round: "reflection", participant_id: pid(1), data: { text: "I'll stop pretending recycling is enough." } },
  { id: "r2", cohort: "Dolphins", round: "reflection", participant_id: pid(2), data: { text: "Comfort is the loudest excuse." } },
  { id: "r3", cohort: "Dolphins", round: "reflection", participant_id: pid(3), data: { text: "The boss's plane bothers me more now." } },
  { id: "r4", cohort: "Dolphins", round: "reflection", participant_id: pid(4), data: { text: "I've been my own dragon, my own excuse." } },
  { id: "r5", cohort: "Dolphins", round: "reflection", participant_id: pid(5), data: { text: "Climate is a relationship problem, not a data problem." } },
];

console.log("=== Full data run ===\n");
console.log(JSON.stringify(generatePanels(participants, responses), null, 2));

console.log("\n\n=== Empty run (no responses) ===\n");
console.log(JSON.stringify(generatePanels(participants, []), null, 2));

console.log("\n\n=== Mirror only ===\n");
console.log(
  JSON.stringify(
    generatePanels(participants, responses.filter((r) => r.round === "mirror")),
    null,
    2
  )
);
