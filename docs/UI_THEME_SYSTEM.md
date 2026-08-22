# RUET IoT Club UI Theme System

## Scope

This theme changes presentation only. Routes, content, component behavior, authentication, RBAC, API calls, Cloudflare Workers, D1, R2, forms, and workflow states remain unchanged.

## Visual language

- Institutional deep-navy foundation rather than flat black.
- Electric cyan is the primary interactive accent.
- Technology blue supports gradients, depth, and informational emphasis.
- Green, amber, and red remain reserved for semantic status communication.
- Circuit grids, node fields, and radial glows stay low-opacity and decorative.
- Inter Variable remains the single interface typeface. Monospace is limited to technical metadata.

## Core tokens

| Token | Purpose |
| --- | --- |
| `--background` | Main deep-space page background |
| `--card` | Elevated public surface |
| `--primary` | Cyan actions, links, active states, and focus |
| `--accent` | Technology-blue supporting emphasis |
| `--secondary` | Inputs, secondary actions, and subtle fills |
| `--border` | Neutral structural border |
| `--technology-blue` | Decorative blue glow and gradient layer |
| `--technology-green` | Optional non-status technology highlight |
| `--admin-*` | Admin shell and data-management surfaces |

## Shared presentation patterns

- `.glass`: reusable translucent content surface.
- `.tech-panel`: more opaque elevated surface for dialogs and management cards.
- `.tech-surface-hover`: optional card lift and border glow for interactive content.
- `.tech-label`: compact monospace metadata label.
- `.tech-divider`: cyan-to-blue section-heading divider.
- `.site-shell`: decorative page-level radial technology layers.
- `.circuit-pattern`: low-opacity responsive grid and node texture.

## Component rules

- Buttons use rounded, accessible 44px targets and visible focus rings.
- Inputs and selects use a deep secondary surface, clear border, and cyan focus state.
- Cards use consistent 14–16px radii and restrained glow.
- Tables preserve readable density, semantic rows, and horizontal overflow behavior.
- Dialogs remain viewport-safe and use a strong backdrop for focus.
- Status badges retain semantic colors instead of adopting decorative cyan.
- Navbar labels never wrap, and the logo remains square and circular.
- Admin navigation preserves all permission checks and section behavior.

## Motion and accessibility

- Hover movement is limited to two pixels.
- Transitions are generally 180–250ms.
- `prefers-reduced-motion` disables nonessential motion and smooth scrolling.
- Focus indicators use the primary ring token and are never removed without replacement.
- Decorative layers are pointer-inert and do not carry information.

## Responsive verification widths

`1920`, `1440`, `1280`, `1200`, `1024`, `768`, `430`, and `375` pixels.

