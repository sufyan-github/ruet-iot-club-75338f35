# RUET IoT Club Administration Design System

## Product intent

The administration experience is a dark, calm organization-management product. It uses the club cyan as an action and orientation color, semantic colors for status, restrained elevation, readable typography, and minimal decorative effects. Public-site cyber styling is intentionally not inherited by the admin application shell.

## Tokens

The canonical CSS custom properties are in `src/index.css`:

| Token | Purpose |
| --- | --- |
| `--admin-background` | Page canvas |
| `--admin-sidebar` | Persistent navigation |
| `--admin-surface` | Cards and panels |
| `--admin-surface-elevated` | Drawers, dialogs, and menus |
| `--admin-border` | Structural separation |
| `--admin-success` | Approved, active, sent, verified |
| `--admin-warning` | Pending, review, attention |
| `--admin-danger` | Failed, rejected, suspended, destructive |
| `--primary` | Navigation and primary actions |
| `--foreground` / `--muted-foreground` | Primary and supporting text |

## Reusable patterns

- `AdminShell`: permission-aware grouped navigation, collapse/drawer behavior, breadcrumb, search, notification state, and account menu.
- `AdminPageHeader`: page title, plain-language description, and contextual primary action.
- `AdminCard`: consistent border, surface, radius, and elevation.
- `StatusBadge`: text plus semantic color; status is never communicated by color alone.
- `LoadingState`, `EmptyState`, `ErrorState`: standard server-state communication.
- `ConfirmDialog`: accessible alert dialog and responsive bottom sheet with mandatory reason and optional typed confirmation.
- `adminInput`, `adminButton`, `adminSecondaryButton`: shared minimum touch targets, focus treatment, and spacing.

## Responsive behavior

- Under `1024px`, the sidebar is a drawer and the header is compact.
- Cards stack naturally; filters collapse to one column.
- Dense tables are contained in labelled horizontal regions or change to cards where operational scanning benefits.
- Dialogs become bottom sheets/full-width panels on small screens.
- Inputs and actions maintain at least a 40px control height.

Supported review widths: 320, 375, 390, 414, 768, 1024, 1280, 1440, and 1920 pixels.

## Accessibility rules

- Every icon-only control requires an accessible label.
- Dialogs use modal semantics, labelled titles, and described actions.
- Native buttons, links, headings, tables, labels, fieldsets, and tabs are preferred.
- Focus indicators must remain visible; do not remove outlines without an equivalent.
- Errors must be explained in text and offer retry when safe.
- Destructive operations require explicit confirmation; policy decisions require a reason.

## Content guidance

- Use organization language: “Project proposal”, “Membership application”, “Payment verification”.
- Do not present internal permission identifiers as primary navigation or operational copy.
- Empty states explain what will appear and what the administrator can do next.
- Raw structured payloads are rendered as labelled fields; JSON is confined to an advanced content editor.

## Security boundary

Permission-aware rendering is convenience, not authorization. The Cloudflare Worker resolves the active D1 role and permission assignments for every privileged request. CSRF, idempotency, state-transition rules, self-decision separation, immutable audit records, and super-administrator safeguards remain server-enforced.

## Do / do not

| Do | Do not |
| --- | --- |
| Use one clear primary action | Fill every card with neon or gradients |
| Pair status color with readable text | Rely on hidden buttons for security |
| Confirm sensitive actions with context | Use browser prompts or silent failures |
| Show operational summaries and next actions | Expose raw database or Worker structures |
| Preserve D1/R2 records and archive safely | Hard-delete referenced content or media |
