import { normalizeSearchText } from "./normalize";

const negationTerms = new Set([
  "avoid",
  "exclude",
  "excluding",
  "no",
  "not",
  "skip",
  "without",
]);

export function hasPositivePhrase(input: string, phrase: string) {
  return getPhraseOccurrences(input, phrase).some((occurrence) => !occurrence.negated);
}

export function hasNegatedPhrase(input: string, phrase: string) {
  return getPhraseOccurrences(input, phrase).some((occurrence) => occurrence.negated);
}

export function getPositiveIntentText(input: string) {
  const normalized = normalizeSearchText(input);
  const clauses = normalized.split(/\b(?:but|instead|rather)\b/).map((clause) => clause.trim());

  return clauses
    .map((clause) => {
      const words = clause.split(" ");
      const negationIndex = words.findIndex((word) => negationTerms.has(word));
      return negationIndex === -1 ? clause : words.slice(0, negationIndex).join(" ");
    })
    .filter(Boolean)
    .join(" ");
}

function getPhraseOccurrences(input: string, phrase: string) {
  const text = normalizeIntentText(input);
  const target = normalizeSearchText(phrase);
  if (!text || !target) return [];

  const textWords = text.split(" ");
  const targetWords = target.split(" ");
  const occurrences: Array<{ negated: boolean }> = [];

  for (let index = 0; index <= textWords.length - targetWords.length; index += 1) {
    const matches = targetWords.every((word, offset) => textWords[index + offset] === word);
    if (!matches) continue;

    const lookBehind = textWords.slice(Math.max(0, index - 4), index);
    const lastBoundary = Math.max(
      lookBehind.lastIndexOf("boundary"),
      lookBehind.lastIndexOf("but"),
      lookBehind.lastIndexOf("instead"),
      lookBehind.lastIndexOf("rather"),
    );
    const scopedWords = lookBehind.slice(lastBoundary + 1);
    occurrences.push({ negated: scopedWords.some((word) => negationTerms.has(word)) });
  }

  return occurrences;
}

function normalizeIntentText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,.;:!?]/g, " boundary ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
