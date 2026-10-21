export const officialLinkedInUrl = "https://www.linkedin.com/company/arivvio";
export function configuredLinkedInUrl(value: string | undefined) {
  const url = value === undefined ? officialLinkedInUrl : value.trim();
  return /^https:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+\/?$/.test(
    url,
  )
    ? url
    : null;
}
export const footerGroups = [
  [
    "Plan",
    [
      ["Plan an Event", "/plan"],
      ["Marketplace", "/marketplace?entryMode=browse"],
      ["My Events", "/account"],
    ],
  ],
  [
    "Vendors",
    [
      ["Vendor Hub", "/vendor/dashboard"],
      ["List Your Business", "/vendor/onboarding"],
      ["Claim Your Business", "/claim-business"],
      ["Vendor Demo", "/vendor/demo"],
    ],
  ],
  [
    "Company",
    [
      ["About ARIVVIO", "/about"],
      ["Contact", "/support-project"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy", "/privacy"],
      ["Terms of Use", "/terms"],
      ["Marketplace & Pre-Beta Information", "/legal"],
    ],
  ],
] as const;
