import type { EventRecognition, EventTone } from "./types";

export type EventMessage = {
  heading: string;
  support: string;
  tone: EventTone;
};

const messages: Record<string, EventMessage> = {
  anniversary: {
    heading: "Congratulations on your anniversary.",
    support: "Let's plan a celebration that feels true to the occasion.",
    tone: "celebratory",
  },
  baptism: {
    heading: "Let's plan this meaningful occasion with care.",
    support: "We can help organize the ceremony, gathering, and the details around both.",
    tone: "warm",
  },
  "baby-shower": {
    heading: "Congratulations. Let's plan your baby shower.",
    support: "We'll keep the gathering personal, welcoming, and easy to bring together.",
    tone: "celebratory",
  },
  "bachelor-party": {
    heading: "Let's plan a celebration the group will remember.",
    support: "We can organize the places, transportation, food, and entertainment around one clear plan.",
    tone: "celebratory",
  },
  "bachelorette-party": {
    heading: "Let's plan a celebration the group will remember.",
    support: "We can organize the places, transportation, food, and entertainment around one clear plan.",
    tone: "celebratory",
  },
  birthday: {
    heading: "Let's plan your birthday celebration.",
    support: "Start with what matters most, and we'll shape the right options around it.",
    tone: "celebratory",
  },
  "celebration-of-life": {
    heading: "We're sorry for your loss.",
    support: "We'll help you plan a meaningful celebration of their life with care and respect.",
    tone: "respectful",
  },
  christening: {
    heading: "Let's plan this meaningful occasion with care.",
    support: "We can help organize the ceremony, family gathering, and the details around both.",
    tone: "warm",
  },
  "corporate-dinner": {
    heading: "Let's organize a dinner that fits your team and purpose.",
    support: "We'll keep the venue, hospitality, timing, and guest experience connected.",
    tone: "professional",
  },
  "corporate-event": {
    heading: "Let's organize an event that fits your team and purpose.",
    support: "We'll focus the plan around the people attending and the outcome you need.",
    tone: "professional",
  },
  engagement: {
    heading: "Congratulations on your engagement.",
    support: "Let's bring the celebration together around the people and details that matter to you.",
    tone: "celebratory",
  },
  funeral: {
    heading: "We're sorry for your loss.",
    support: "We'll help you organize the arrangements with care, clarity, and respect.",
    tone: "respectful",
  },
  "funeral-reception": {
    heading: "We're sorry for your loss.",
    support: "We'll help you organize the gathering with care and make the practical details easier to manage.",
    tone: "respectful",
  },
  graduation: {
    heading: "Congratulations on the achievement.",
    support: "Let's plan a graduation celebration that gives the moment room to feel special.",
    tone: "celebratory",
  },
  memorial: {
    heading: "We'll help you bring the memorial together with care.",
    support: "The plan will stay respectful, clear, and centered on the people gathering.",
    tone: "respectful",
  },
  "pool-party": {
    heading: "Let's bring the pool party together.",
    support: "We'll focus on comfort, food, shade, rentals, and the right amount of fun.",
    tone: "celebratory",
  },
  "sweet-16": {
    heading: "Let's make this birthday feel exactly right for them.",
    support: "We'll focus the plan around their interests, their guests, and the kind of celebration they want.",
    tone: "warm",
  },
  quinceanera: {
    heading: "Congratulations. Let's plan your Quincea\u00f1era.",
    support: "We'll help shape the ceremony and celebration around the traditions and experience you have in mind.",
    tone: "celebratory",
  },
  wedding: {
    heading: "Congratulations. Let's start planning your wedding.",
    support: "We'll keep each part of the day connected while you decide what feels right.",
    tone: "celebratory",
  },
};

export function getEventMessage(recognition: EventRecognition, honoreeAge?: number) {
  if (
    recognition.identity.canonicalEventType === "birthday" &&
    honoreeAge &&
    honoreeAge >= 13 &&
    honoreeAge <= 17
  ) {
    return {
      heading: "Let's make this birthday feel exactly right for them.",
      support: "We'll focus the plan around their age, interests, and the people celebrating with them.",
      tone: "warm",
    } satisfies EventMessage;
  }

  return (
    messages[recognition.identity.canonicalEventType] ?? {
      heading: `Let's plan your ${recognition.identity.selectedDisplayEvent.toLowerCase()}.`,
      support: "Tell us what matters, and we'll keep the next decisions clear and manageable.",
      tone: "neutral",
    }
  );
}
