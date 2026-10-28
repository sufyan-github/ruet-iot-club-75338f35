# Cloudflare Git deployment readiness

Verified 2026-10-29 (Asia/Dhaka).

GitHub repository `sufyan-github/ruet-iot-club-75338f35` is connected to the existing Worker `ruet-iot-club-platform-production`. Production builds are paused pending reconciliation, following the owner's instruction to preserve the live Cloudflare version.

## Source mismatch

- Live version: `b1981c43`, “Add dedicated R2-backed Gallery administration”, serving 100% of production traffic.
- GitHub main: `1f16bce33395d160dc0d4eb54df67b86111b6dc5`, a Supabase frontend without Worker configuration.
- Cloudflare source branch: `codex/complete-production-upgrade-20260823`, an older editable Workers/D1/R2 implementation.
- Recovery branch: `codex/cloudflare-recovery-20261010`, containing that older source plus the production JavaScript bundle and a partial frontend asset archive. These are not complete original source files.

Neither simply deploying main nor rebuilding the older source can be assumed to preserve production. The recovered archive is not a verified full deployment package: source maps and the complete asset inventory are missing.

## Required before enabling builds

1. Recover the original deployment workspace for b1981c43 (or its complete original source and assets).
2. Reconcile it with the Cloudflare source branch, preserving current gallery, blog, event, authorization, and audit fixes. Review separately any Supabase-only changes on main.
3. Run the existing CI checks and verify staging, including public pages, sign-in, gallery, and admin workflows.
4. Merge the reconciled Cloudflare source into the intended production branch. Do not merge the recovery bundle as a substitute for restored source.
5. Configure Workers Builds for that branch with root `/`, Node 22, build command `npm ci && npm run check:phase5`, and deploy command `npx wrangler deploy --env production`. Revalidate these commands against the restored project's scripts. Keep runtime secrets in Cloudflare.
6. Re-enable builds and verify one real Git push creates a successful Cloudflare build and deployment before declaring automatic deployment operational.

No D1 migration or production replacement was performed during connection. Database schema changes need compatibility review against the live deployment before remote migration.
