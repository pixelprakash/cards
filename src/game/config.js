// The game's rules, in one place (the October brief): four steps, the sentence the cards build, and the optional questions.

export const STEPS = [
  { key: "discover", label: "Discover" },
  { key: "assemble", label: "Assemble" },
  { key: "imagine", label: "Imagine" },
  { key: "describe", label: "Describe" },
  { key: "finish", label: "Finish" },
];

// The slots of the sentence, in reading order. min 1 = the player must choose a card before continuing.
export const SLOTS = [
  { key: "issue", deck: "issue", label: "Issue", lead: "In response to", min: 1, max: 1, ask: "Choose an issue" },
  { key: "forces", deck: "forces", label: "Force of change", lead: "shaped by", min: 0, max: 1, ask: "Choose a force of change" },
  { key: "value", deck: "value", label: "Value", lead: "that prioritises", min: 0, max: 2, ask: "Choose up to two values" },
  { key: "methods", deck: "methods", label: "Method of learning", lead: "through learning by", min: 1, max: 1, ask: "Choose a method of learning" },
  { key: "places", deck: "places", label: "Place or space", lead: "in", min: 0, max: 3, ask: "Choose up to three places" },
];
export const SLOT_BY_DECK = Object.fromEntries(SLOTS.map((s) => [s.deck, s]));

// Optional questions, three at a time. Wording is from the brief.
export const GROUPS = [
  { key: "experience", title: "Learning experience", qs: [
    "What would someone actually do to learn in this future?",
    "What would be different from learning today?",
    "What might make this way of learning meaningful or exciting?",
  ] },
  { key: "arrangement", title: "Learning arrangement", qs: [
    "How do learners find resources, feedback, or guidance?",
    "How is learning recognised, if at all?",
    "Who learns together, and who helps them?",
  ] },
  { key: "tensions", title: "Tensions and consequences", qs: [
    "Who might benefit most, and who might be left out?",
    "What could go wrong?",
    "What would be difficult to change about today’s arrangements?",
  ] },
];
export const QUESTION_IDS = GROUPS.flatMap((g) => g.qs.map((_, qi) => `${g.key}-${qi + 1}`));

// The Action Words, used as optional prompts. The brief names these two; add more here.
export const NUDGES = ["Reverse an assumption", "Make the idea more radical"];

// Who is playing (asked before Step 1). Keep the ids in step with api/_play.js.
export const AGE_BANDS = [
  { id: "u18", label: "Under 18" },
  { id: "18-24", label: "18 to 24" },
  { id: "25-34", label: "25 to 34" },
  { id: "35-44", label: "35 to 44" },
  { id: "45-54", label: "45 to 54" },
  { id: "55-64", label: "55 to 64" },
  { id: "65+", label: "65 or older" },
  { id: "na", label: "Prefer not to say" },
];
export const GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "nonbinary", label: "Non-binary" },
  { id: "na", label: "Prefer not to say" },
];

export const CONSENT = "Your answers and these details are saved for research and can be read by the research team. Your name is optional. Please leave personal details out of what you write.";
export const EMAIL_PURPOSE = "We will email you your scenario so you can keep it. If you agree, the research team also keeps your address. Leave it blank to skip.";
