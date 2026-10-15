// The game's rules, in one place. Reshape the flow by editing this file (and questions.js).
// Challenge = an Issue card. Then the player fills one blank from each of four decks.

export const CHALLENGE_DECK = "issue";

export const SLOTS = [
  { key: "forces", deck: "forces", label: "Force", ask: "Pick a force of change" },
  { key: "value", deck: "value", label: "Value", ask: "Pick a value" },
  { key: "methods", deck: "methods", label: "Method", ask: "Pick a method of learning" },
  { key: "places", deck: "places", label: "Place", ask: "Pick a place" },
];

export const STEPS = [
  { key: "challenge", label: "Challenge" },
  { key: "blanks", label: "Cards" },
  { key: "questions", label: "Questions" },
  { key: "done", label: "Done" },
];

// How each card reads inside a sentence. This is the game's own wording, not text printed on the cards.
export const SAY = {
  "skills-mismatch": "a skills mismatch",
  "curricular-problems": "curricular problems",
  "rising-educational-costs": "rising educational costs",
  beginning: "“Beginning”",
  flowing: "“Flowing”",
  becoming: "“Becoming”",
  diversity: "diversity",
  "lifelong-learning": "lifelong learning",
  sustainability: "sustainability",
  collaboration: "collaboration",
  "discussion-based-learning": "discussion-based learning",
  "experiential-learning": "experiential learning",
  "simulation-based-learning": "simulation-based learning",
  "simulation-center": "in a simulation center",
  "museum-gallery": "in a museum or gallery",
  "top-of-the-tree": "at the top of a tree",
  "bio-dome": "in a bio-dome",
};

// The sentence the player completes. {slot} marks a blank.
export const SENTENCE = [
  "To tackle ", { slot: "challenge" },
  ", in a world shaped by ", { slot: "forces" },
  ", we start from ", { slot: "value" },
  ", learn through ", { slot: "methods" },
  ", ", { slot: "places" }, ".",
];

export const PROMPT_ASK = "Now write your prompt: a concise, vivid description of the learning environment this hand suggests.";

// Who is playing. Asked once, before the challenge. Name is optional; age band and gender must be answered, and each has
// "Prefer not to say". Keep the ids in step with api/plays.js, which only accepts these values.
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
