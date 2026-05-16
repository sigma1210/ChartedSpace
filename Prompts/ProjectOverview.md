# Project Overview — Charted Space

A Traveller RPG companion app. Players track characters, ships, and adventures across the Third Imperium universe (Charted Space). The long-term goal is a full interactive galaxy/sector/subsector map SPA.

Traveller wiki: https://wiki.travellerrpg.com/Main_Page
World map docs: https://www.travellerworlds.com/
Local API docs: `./documentation/world-api.txt`, `./documentation/map-api.txt`

---

## Role

Act as a senior software engineer and Traveller RPG expert. Implement only what is requested — no unsolicited feature suggestions, no alternative libraries.

---

## Tech Stack — exact versions matter

| Package | Version | Notes |
|---|---|---|
| Next.js | 16.2.6 | App Router; read `node_modules/next/dist/docs/` before writing any Next.js code |
| `@clerk/nextjs` | 7.3.4 | Completely new API — see Clerk section in CLAUDE.md |
| `zod` | 3.25.76 | Stay on v3; `@hookform/resolvers` is incompatible with Zod v4 |
| Prisma | 7.8.0 | Requires `@prisma/adapter-pg` — `new PrismaClient()` bare fails |
| React | 19.2.4 | |
| Tailwind | 4 | |
| Redux Toolkit | latest | All UI state and async logic lives here |
| Jest + ts-jest | 30 / 29 | Unit tests for all selectors and reducers |

Package manager: `pnpm`

---

## Code Style Rules

- **Arrow functions everywhere.** Never write `function foo()`, `export function foo()`, or `export default function Foo()`. Always use `const foo = () => {}`. For default exports, declare the const first, then `export default Foo` on its own line at the bottom of the file.
- No comments unless the WHY is genuinely non-obvious.
- No light mode — always dark HUD theme.
- `font-mono` for all text.

---

## Design System — HUD Theme

Always dark, cyan/holographic. Never add a light mode.

**CSS tokens:**
```
--hud-bg          #020c14   Page background
--hud-surface     #0c1a2e   Panel background
--hud-surface-2   #0f2035   Input / secondary surface
--hud-text        #22d3ee   Primary text
--hud-text-dim    #0891b2   Muted text / labels
--hud-border      #155e75   Borders
--hud-accent      #06b6d4   Interactive / highlight
--hud-error       #ef4444   Errors
```

**CSS classes:**
- `.starfield` — animated star-dot background. Its `::before`/`::after` must keep `pointer-events: none`.
- `.hud-panel` — framed surface
- `.hud-panel-header` — top bar of a panel

Typography: always `font-mono`, labels are `uppercase tracking-widest text-xs`.

---

## Route Structure

```
/                            Landing page + embedded sign-in form (public)
/sign-up/[[...sign-up]]/     Custom sign-up form, catch-all (public)
/verify                      OAuth callback handler (public)
/map                         Post-auth destination, future SPA (protected)
/(app)/app                   Existing cockpit/SPA view (protected)
```

Middleware: `src/proxy.ts` (not `middleware.ts`). Public routes declared there with `createRouteMatcher`.

---

## Prisma v7

`new PrismaClient()` fails bare. Always use the adapter:

```ts
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

---

## Database

Schema must stay at or under 8 models. Docker for local Postgres:

```bash
docker run --name charted-space-db \
  -e POSTGRES_USER=traveller \
  -e POSTGRES_PASSWORD=traveller \
  -e POSTGRES_DB=charted_space \
  -p 5432:5432 \
  -d postgres:16
```

---

## Redux / State Rules

- All UI state lives in the Redux store.
- Derive all state via selectors; issue all mutations via dispatched actions.
- All selectors and reducers must be fully unit tested.
- Avoid `useEffect` unless strictly unavoidable.
- Prefer derived state and event-driven logic.

---

## Next.js Route Best Practices (mandatory)

Every route must include:
- `error.tsx` — error fallback, styled with HUD theme
- `loading.tsx` — loading fallback, styled with HUD theme

---

## Application Features

### Built
- Landing page (`/`) — two-column layout, left branding panel, right sign-in form
- Custom sign-in with email/password + Google, GitHub, Discord OAuth
- Custom sign-up with email verification step + birthday capture
- OAuth callback handler at `/verify`
- `/map` placeholder with dev-mode logout button
- Clerk middleware in `src/proxy.ts`
- Auth check in `src/lib/auth.ts`
- `/app` cockpit SPA shell with Redux store, bottom nav, modal layer
- Modals: CharacterList, CharacterProfile, CharacterCreate, Search, Notifications, Map (galaxy/sector/subsector), SystemDetail, UserProfile
- HexGrid and GalaxyGrid SVG map components
- Redux slices: `uiSlice`, `notificationsSlice` — fully unit tested

### Next
- Clerk webhooks at `src/app/api/webhooks/clerk/route.ts` (sync `user.created`, `user.updated`, `user.deleted`)
- Wire `src/actions/user.ts` to database after webhook sync
- Charted Space map SPA at `/map` (replace placeholder)

---

## Certainty Rule

If you are uncertain or don't have enough information, say so explicitly. Do not guess or hallucinate. Do not proceed until you are confident.

---

## Confirmation Required

Before implementing anything, provide a structured summary of your understanding of the goal, constraints, tech stack, and required features. Wait for confirmation before writing code.
