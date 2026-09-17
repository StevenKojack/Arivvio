import type { MarketplaceRules, DemoService } from "./model";
export type EligibilityContext = { service?: string; eventType?: string; age?: number; distanceMiles?: number };
export function evaluateEligibility(rules: MarketplaceRules | undefined, services: DemoService[] | undefined, context: EligibilityContext) {
  const reasons: string[] = [];
  const unknown: string[] = [];
  if (services && context.service && !services.some(s => s.active && s.category === context.service)) reasons.push("This service is not active.");
  if (rules && context.eventType) {
    if (rules.excluded.includes(context.eventType)) reasons.push("This event type is excluded.");
    else if (rules.eventMode === "selected" && !rules.served.includes(context.eventType)) reasons.push("This event type is outside the selected events served.");
  }
  if (rules && context.age !== undefined) {
    if ((rules.audience === "adults" && context.age < 18) || (rules.audience === "21plus" && context.age < 21) || (rules.audience === "kids" && context.age >= 18)) reasons.push("The audience does not meet this business's age preferences.");
  } else if (rules && !["all", "unspecified"].includes(rules.audience)) unknown.push("Audience age needs confirmation.");
  if (rules?.radius != null && context.distanceMiles != null && context.distanceMiles > rules.radius) reasons.push("Outside the configured service radius.");
  else if (rules?.radius != null && context.distanceMiles == null) unknown.push("Distance needs confirmation.");
  return { eligible: reasons.length === 0, reasons, unknown };
}
