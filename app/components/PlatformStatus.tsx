const distinctions = [
  [
    "Verified claimed providers",
    "Use your account to save events, request quotes, message participating providers and record bookings on ARIVVIO.",
  ],
  [
    "Demo providers",
    "Fictional providers let you explore simulated requests and conversations. Demo plans stay in this browser and do not contact a business.",
  ],
  [
    "Public business listings",
    "These businesses have not claimed their profiles. A request goes to ARIVVIO for manual follow-up, not directly to the business. Pricing, availability and responses are unconfirmed.",
  ],
  [
    "Payments & arrangements",
    "Payments are not connected. An ARIVVIO booking records your accepted quote; separate provider agreements may apply. Confirm arrangements with your provider. ARIVVIO does not guarantee service fulfillment.",
  ],
];
export function PlatformStatus() {
  return (
    <dl className="mt-6 grid gap-6 sm:grid-cols-2">
      {distinctions.map(([title, text]) => (
        <div key={title}>
          <dt className="font-semibold ui-text">{title}</dt>
          <dd className="mt-2 text-sm leading-7 ui-muted">{text}</dd>
        </div>
      ))}
    </dl>
  );
}
