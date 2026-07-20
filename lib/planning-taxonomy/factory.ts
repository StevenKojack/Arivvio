import { normalizeSearchText } from "@/lib/event-intelligence/normalize";
import type { PlanningPreference, PlanningPreferenceType } from "./types";
import type { ServiceName } from "@/app/data/marketplace";

const aliasMap: Record<string, string[]> = {
  "360 photo booth": ["360 booth", "video spinner"],
  "armenian catering": ["armenian food", "armenian caterer"],
  "character performers": ["costume characters", "spiderman", "superhero", "princess"],
  "chocolate fountain": ["chocolate fondue fountain"],
  "ceremony music": ["wedding ceremony music", "processional music"],
  "cultural dj": ["armenian dj", "latin dj", "persian dj", "multicultural dj"],
  "dj": ["disc jockey", "disc jockeys"],
  "foam cannon": ["foam party", "foam machine"],
  "floral arrangements": ["funeral flowers", "memorial flowers", "flower arrangements"],
  "guest transportation": ["guest shuttle", "shuttle guests"],
  "kids activities": ["children activities", "kid activities"],
  "limousine": ["limo"],
  "photo booth": ["photobooth"],
  "reception catering": ["funeral reception catering", "memorial catering", "repass catering"],
  "registration staff": ["event registration", "check in staff", "check-in staff"],
  "portable restrooms": ["porta potty", "porta potties"],
  "social-media coverage": ["social media content", "event content creator"],
  "temporary tattoos": ["temp tattoos"],
  "taco cart": ["tacos", "taco catering"],
  "tables": ["table rental", "table rentals", "rental tables"],
  "vip transportation": ["vip transport", "executive transportation"],
  "wedding cake": ["bridal cake"],
};

export function preferenceGroup(
  labels: string[],
  options: {
    category: string;
    description: string;
    linkedService?: ServiceName;
    type: PlanningPreferenceType;
  },
): PlanningPreference[] {
  return labels.map((label) => ({
    aliases: aliasMap[normalizeSearchText(label)] ?? [],
    category: options.category,
    description: options.description,
    id: `${options.type}-${toId(label)}`,
    label,
    linkedService: options.linkedService,
    type: options.type,
  }));
}

function toId(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, "-");
}
