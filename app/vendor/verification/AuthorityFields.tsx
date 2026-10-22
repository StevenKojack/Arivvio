export function AuthorityFields() {
  return (
    <>
      <label className="block">
        Your authority to represent this business
        <select
          name="relationship"
          required
          className="mt-1 w-full rounded-xl border p-3 ui-surface"
        >
          <option value="">Choose your role</option>
          {[
            "Owner",
            "Founder",
            "Authorized employee",
            "General manager",
            "Location manager",
            "Marketing or operations representative",
            "Other authorized representative",
          ].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Which business location are you authorized to manage?
        <input
          name="location_scope"
          required
          maxLength={300}
          placeholder="Location name and city, or your sole business location"
          className="mt-1 w-full rounded-xl border p-3 ui-surface"
        />
      </label>
      <label className="block">
        How can ARIVVIO confirm your authority?
        <textarea
          name="verification_note"
          maxLength={2000}
          className="mt-1 w-full rounded-xl border p-3 ui-surface"
        />
      </label>
      <p className="text-sm ui-muted">
        Choose official-domain account email or manual public phone / public
        record review in the verification center. Your role declaration does not
        prove authority. Do not upload IDs or financial documents.
      </p>
    </>
  );
}
