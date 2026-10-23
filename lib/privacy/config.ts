export const legalVersions = { terms: "2026-10-22", privacy: "2026-10-22", reviewed: "October 22, 2026" } as const;
export const businessContact = {
  email: process.env.NEXT_PUBLIC_ARIVVIO_CONTACT_EMAIL || "",
  operator: process.env.NEXT_PUBLIC_ARIVVIO_OPERATOR_NAME || "",
  mailingAddress: process.env.NEXT_PUBLIC_ARIVVIO_BUSINESS_ADDRESS || "",
  contactPath: "/support-project",
};
export const releaseGates = {
  payments: { enabled: false, requires: ["payment provider", "merchant identity", "total and fees", "taxes", "deposits", "cancellation and refunds", "payouts", "disputes and chargebacks", "receipts and audit", "counsel review"] },
  marketingEmail: { enabled: false, requires: ["sender identity", "business postal address", "unsubscribe", "suppression enforcement", "preferences", "truthful subject", "transactional separation", "counsel review"] },
  reviews: { enabled: false, requires: ["completed experience", "authenticity", "incentives and insider disclosures", "moderation", "suppression and disputes"] },
} as const;
export function marketingReady(checks: Record<string, boolean>, postalAddress: string) {
 return Boolean(postalAddress.trim()) && releaseGates.marketingEmail.requires.every(key => checks[key] === true);
}
