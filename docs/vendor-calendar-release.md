# Vendor calendar recovery

Recovered from uncommitted files in the existing `arivvio-polish` worktree, based on a local tree snapshot of production commit 6419b9b. No calendar implementation was committed there. Older vendor-operations work was not merged. Original workspace and unrelated changes are preserved.

Production migration `20261105064750_vendor_operational_calendar` was already applied. Its stored statements exactly match the recovered SQL, originally named with timestamp 20261105064246. Track only the applied timestamp. Do not rerun the migration. Read-only production inspection verified columns, constraints, indexes, trigger/function, RLS and three policies, authenticated SELECT/INSERT/UPDATE only, no anonymous access, and zero calendar events. No production database writes were performed in this recovery.

The calendar uses Supabase persistence, branch-scoped editor authorization, optimistic version checks, manual event editing/status/tasks, month/day/agenda views, advisory overlap checks, and existing bookings deduplicated by booking ID. Missing booking times/timezones remain explicit rather than inferred. External events neither change public availability nor send messages. Branch selection survives refresh through the URL. Private state clears on sign-out.

Validation: 228 tests pass, including calendar model and database persistence/isolation tests. TypeScript, ESLint and production build pass. No authenticated production browser test was performed. Mobile layout uses responsive month cells and stacked editor fields, but mobile interaction is not browser-verified. Existing Supabase advisor findings concern private deny-all tables and disabled leaked-password protection, not this calendar.

Scope excludes outreach and unrelated product changes. Zero external outreach.
