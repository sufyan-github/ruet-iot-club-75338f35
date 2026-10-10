# Cloudflare production recovery — 2026-10-10

This is a recovery snapshot, not a claim that the original latest TypeScript project has been recovered completely.

## Contents

- `worker/index.js`: complete deployed Worker bundle copied from the signed-in Cloudflare editor. 854,943 characters; syntax checked with Node. Production version `b1981c43`, message “Add dedicated R2-backed Gallery administration”.
- `frontend.zip`: live homepage HTML and 113 linked build assets (JavaScript/CSS and their discovered asset references), downloaded from ruetiotclub.org. Paths inside the archive preserve the public layout.
- `frontend-manifest.json`: size and SHA-256 of each downloaded frontend file.
- `deployment.json`: verified production runtime, binding, scheduling, and non-secret configuration metadata.

The branch is based on `codex/complete-production-upgrade-20260823` at `b62fe495db0e314e637d0a5a83a385087d9f2bde`. That branch contains the editable React/TypeScript frontend, Worker source, database migrations, tests, deployment configuration, and documentation. The deployed snapshot is newer than that source branch. Main was not replaced by this recovery.

## Verified live configuration

Cloudflare runs this site through Workers with static ASSETS, D1 DB, R2 STORAGE, and EMAIL bindings. The production runtime uses compatibility date 2026-08-20 and nodejs_compat. The scheduled handler runs every five minutes; logs and traces are enabled. Cloudflare shows Wrangler deployment and no connected build Git repository.

## Recovery limits

The original latest TypeScript files, Worker source map (`index.js.map`), complete static asset inventory, private D1 records, and R2 object inventory were not exported. No source maps were referenced in the downloaded frontend JavaScript. This public archive excludes secret values and private database records. It is not a complete account/database backup.

The deployed bundle preserves the newer backend implementation, but replacing the editable Worker source with a bundle would lose maintainability. Recover the original deployment workspace/source map to reconcile the newer gallery and audit changes into TypeScript. Frontend coverage is limited to assets discoverable from the live homepage and linked build chunks; unreferenced assets may exist.

## Validation and use

Worker JavaScript passed `node --check`. Every listed frontend asset downloaded successfully, and ZIP integrity was checked. No application behavior was changed, no database migrations were applied, and no deployment was performed. Existing application tests were not rerun because this commit only adds archived artifacts and documentation.

Extract frontend.zip into an empty directory to inspect the deployed frontend. It requires the production API and bindings for full behavior. Use the repository source and established deployment documentation for development; do not assume this snapshot is a standalone full-system restore.
