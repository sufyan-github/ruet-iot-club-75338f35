# Administration Verification Matrix

## Automated gates

| Gate | Coverage |
| --- | --- |
| Client TypeScript | React admin shell, modules, API contracts |
| Worker TypeScript | Hono routes, D1 result types, test sources |
| ESLint | Application and Worker source; zero errors required |
| Client Vitest | Frontend test environment |
| Worker Vitest | Authentication, authorization, fixed admins, workflows, submissions, membership, D1/R2 foundation |
| Production build | Vite production bundle and lazy admin route |

## Built-in role matrix

The Worker authorization suite creates an authenticated session for each built-in role and verifies that `/admin/overview` returns only the read models permitted to that role. It also verifies that an authenticated community user receives `403 PERMISSION_DENIED`.

| Role | Overview | Module visibility basis | Direct API enforcement |
| --- | --- | --- | --- |
| SUPER_ADMIN | Allowed | All D1 permissions | Worker checks every request |
| ADMIN | Allowed | Broad operational permissions | Worker checks every request |
| EXECUTIVE | Allowed | Oversight permissions | Worker checks every request |
| MEMBERSHIP_MANAGER | Allowed | Membership and volunteer | Worker checks every request |
| PROJECT_MANAGER | Allowed | Project domain | Worker checks every request |
| RESEARCH_MANAGER | Allowed | Research domain | Worker checks every request |
| EVENT_MANAGER | Allowed | Event domain | Worker checks every request |
| CONTENT_MANAGER | Allowed | Content domain | Worker checks every request |
| FINANCE_MANAGER | Allowed | Finance domain | Worker checks every request |
| CERTIFICATE_MANAGER | Allowed | Certificate domain | Worker checks every request |
| REVIEWER | Allowed | Project/research review | Worker checks every request |
| MENTOR | Allowed | People read | Worker checks every request |
| Community user | Denied | No admin navigation | `403 PERMISSION_DENIED` |

The existing authorization suite separately proves idempotent grants/revocations, immediate revocation, immutable system roles, last-super-admin protection, fixed-super-admin protection, soft deletion, and audited custom-role lifecycle.

## Manual responsive checklist

- Sidebar collapses on desktop and opens as a drawer on mobile.
- Header search is hidden at narrow sizes without clipping adjacent controls.
- KPI cards and charts stack and resize.
- Filter bars become single-column.
- Tables remain inside their containers; key workflow lists use mobile cards.
- Dialogs and editors use full-width bottom-sheet/drawer layouts on small screens.
- All icon buttons have accessible names and status badges include text.
- Loading, empty, error, success toast, and confirmation states are represented.

## Production smoke checklist

- `/`, `/admin`, `/api/v1/health`, and both apex and `www` hostnames return successfully.
- Unauthenticated `/api/v1/admin/overview` is rejected.
- Existing D1 database and R2 bindings remain unchanged.
- No destructive migration is introduced by the dashboard release.
- Fixed super-administrator assignments remain unchanged.
