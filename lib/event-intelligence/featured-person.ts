import type { EventRecognition } from "./types";

export type FeaturedPersonPolicy = {
  ageQuestion?: string;
  allowSurprise: boolean;
  askGender: boolean;
  dueDateQuestion?: string;
  question: string;
};

const featuredPersonPolicies: Record<string, FeaturedPersonPolicy> = {
  anniversary: policy("Who is this anniversary celebration for?", { allowSurprise: true }),
  "baby-shower": policy("Who is this baby shower for?", { dueDateQuestion: "When is the baby due?" }),
  "bachelor-party": policy("Who is this celebration for?", { allowSurprise: true }),
  "bachelorette-party": policy("Who is this celebration for?", { allowSurprise: true }),
  "bar-mitzvah": policy("Who is this celebration for?", { ageQuestion: "How old is the person we are celebrating?", askGender: true }),
  "bat-mitzvah": policy("Who is this celebration for?", { ageQuestion: "How old is the person we are celebrating?", askGender: true }),
  birthday: policy("Who is this birthday celebration for?", { ageQuestion: "What age are we celebrating?", allowSurprise: true, askGender: true }),
  engagement: policy("Who is this engagement celebration for?", { allowSurprise: true }),
  graduation: policy("Who is this graduation celebration for?", { ageQuestion: "How old is the graduate?", allowSurprise: true, askGender: true }),
  quinceanera: policy("Who is this Quincea\u00f1era for?", { ageQuestion: "Confirm the age we are celebrating", askGender: true }),
  retirement: policy("Who is this retirement celebration for?", { allowSurprise: true }),
  "sweet-16": policy("Who is this Sweet 16 for?", { ageQuestion: "Confirm the age we are celebrating", allowSurprise: true, askGender: true }),
  wedding: policy("Who is this wedding for?"),
};

export function getFeaturedPersonPolicy(recognition: EventRecognition) {
  return featuredPersonPolicies[recognition.identity.canonicalEventType];
}

function policy(
  question: string,
  options: Partial<Omit<FeaturedPersonPolicy, "question">> = {},
): FeaturedPersonPolicy {
  return {
    allowSurprise: false,
    askGender: false,
    question,
    ...options,
  };
}
