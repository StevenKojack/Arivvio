# Recover the November 2026 public experience

The recovery branch backup/pre-social-revamp-2026-11 points to 5ce31bf838dbb5f3fdbe30ad399b8e7fc04d8125. Keep it at that commit. The matching production deployment is dpl_F8y7b6aivoT1Z3WfMS3BprJMqh5j.

Set ARIVVIO_NEXT_EXPERIENCE=false for the affected Vercel environment and redeploy that branch to restore the original hero, navigation, listing cards and profile presentation. True enables the redesign. When unset, only previews of codex/arivvio-next-generation-revamp enable it automatically.

For release recovery, select the recorded deployment in the Arivvio Vercel project and use the production rollback action after production approval. If the deployment is unavailable, redeploy the recovery branch at the recorded SHA using production configuration. Verify the domain, homepage, Marketplace and quote cart. This stage has no database migrations or data rollback.
