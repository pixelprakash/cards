// The game's cards: the designer's final card faces (see scripts/build-cards.py), loaded from src/cards/data.js.
import data from "../cards/data.js";

export const DECK_KEYS = ["issue", "forces", "value", "methods", "places"];
export const DECKS = data;

export const cardsOf = (deck) => DECKS[deck].cards;
export const cardOf = (deck, id) => DECKS[deck].cards.find((c) => c.id === id);
export const nameOf = (deck, id) => cardOf(deck, id)?.name ?? "";
