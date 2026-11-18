import { coverageProviders } from "../data/demo-provider-coverage";
export const studios = coverageProviders;
export const events = [
  {
    slug: "after-hours",
    title: "After Hours",
    subtitle: "A vinyl listening session",
    host: 64,
    date: "2026-12-04",
    day: "04",
    month: "Dec",
    when: "Friday, December 4 · 7–10 PM PT",
    place: "The listening room, Pasadena",
    art: "dj",
    color: "night",
    description:
      "An evening of deep cuts and warm grooves. The Cobalt Room crew opens with a listening set before clearing the floor for dancing.",
    admission: "Free · RSVP requested",
  },
  {
    slug: "garden-table",
    title: "The Garden Table",
    subtitle: "A neighborhood gathering",
    host: 60,
    date: "2026-12-06",
    day: "06",
    month: "Dec",
    when: "Sunday, December 6 · 11 AM–2 PM PT",
    place: "Juniper Courtyard, Pasadena",
    art: "garden",
    color: "garden",
    description:
      "Meet around a long table in the courtyard for seasonal bites, flowers and an easy Sunday afternoon with neighbors.",
    admission: "Free · All ages",
  },
];
export type PublicOccasion = (typeof events)[number];
export function directionEnabled() {
  return (
    process.env.ARIVVIO_VISUAL_V2 === "true" ||
    (process.env.ARIVVIO_VISUAL_V2 !== "false" &&
      process.env.VERCEL_ENV === "preview" &&
      process.env.VERCEL_GIT_COMMIT_REF === "codex/arivvio-visual-direction-v2")
  );
}
