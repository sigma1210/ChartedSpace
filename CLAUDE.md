@AGENTS.md

# Charted Space — Project Context

Traveller RPG companion app. Players track characters, ships, and adventures across the Third Imperium. The long-term goal is a full interactive map of Charted Space as a SPA at `/map`.

---

## Stack — exact versions matter

| Package | Version | Why it matters |
|---|---|---|
| Next.js | 16.2.6 | Breaking changes from training data — read `node_modules/next/dist/docs/` |
| `@clerk/nextjs` | 7.3.4 | Completely new API — see Clerk section below |
| `zod` | 3.25.76 | **Must stay on v3.** `@hookform/resolvers@5.2.2` is incompatible with Zod v4 |
| Prisma | 7.8.0 | Requires adapter — see Prisma section below |
| React | 19.2.4 | |
| Tailwind | 4 | |

---

## Route structure

```
/                          Landing page + embedded sign-in form (public)
/sign-up/[[...sign-up]]/   Custom sign-up form, catch-all (public)
/verify                    OAuth callback handler (public)
/map                       Post-auth destination, future SPA (protected)
/(app)/app                 Existing cockpit view (protected)
```

Middleware lives in `src/proxy.ts` — NOT `middleware.ts`. Public routes are declared there with `createRouteMatcher`.

---

## Clerk v7 — this is not the Clerk you know

The hook API changed completely. Old patterns (`isLoaded`, `setActive`, `redirectUrlComplete`) do not exist.

**Sign-in:**
```ts
const { signIn, fetchStatus } = useSignIn()
const isLoading = fetchStatus === "fetching"

await signIn.password({ emailAddress, password })
await signIn.sso({ strategy, redirectUrl, redirectCallbackUrl })
await signIn.mfa.sendEmailCode()
await signIn.mfa.verifyEmailCode({ code })
await signIn.finalize({ navigate: ({ decorateUrl }) => { ... } })
```

**Sign-up:**
```ts
const { signUp, fetchStatus } = useSignUp()

await signUp.password({ emailAddress, password, firstName, lastName, username, unsafeMetadata })
await signUp.verifications.sendEmailCode()       // NOT signUp.verifications.emailAddress.sendEmailCode()
await signUp.verifications.verifyEmailCode({ code })
await signUp.finalize({ navigate: ({ decorateUrl }) => { ... } })
```

**`decorateUrl` is not optional.** It appends a Clerk cookie-refresh token for Safari ITP. Without it sessions silently expire on Safari. Always call it inside `finalize`'s `navigate` callback, check if the result starts with `http` (full URL → `window.location.href`) or is relative (→ `router.push`).

**Shared error utility:** `src/lib/clerk.ts` exports `isClerkError` and `ClerkFieldError`. Do not redefine them inline.

**Webhook verification:** import `verifyWebhook` from `@clerk/nextjs/webhooks`. No separate `svix` package needed. Signing secret goes in `CLERK_WEBHOOK_SIGNING_SECRET` (server-only, no `NEXT_PUBLIC_` prefix).

---

## Auth flow

1. User lands on `/` → `checkAuth()` in `src/lib/auth.ts` runs server-side via Clerk's `auth()`. Authenticated users are immediately redirected to `/map`.
2. Email/password → `SignInForm` or `SignUpForm` → `finalize()` → `/map`
3. OAuth (Google, GitHub, Discord) → `signIn.sso()` → provider → `/verify` → `AuthenticateWithRedirectCallback` → `/map`

**`src/lib/auth.ts`** — uses `auth()` from `@clerk/nextjs/server`. Keep this server-only.

**`src/actions/user.ts`** — stub returning `null`. Will be wired to the database once Clerk webhooks are implemented.

---

## Clerk dashboard settings (development)

These must be set in the dashboard under **Configure → Paths**:

| Setting | Value |
|---|---|
| Sign-in URL | `/` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/map` |
| After sign-up URL | `/map` |

Development instances (`pk_test_` keys) allow localhost automatically — no allowlist entry needed.

---

## Environment variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/map
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/map
DATABASE_URL=postgresql://traveller:traveller@localhost:5432/charted_space?schema=public
DEV_MODE=true   # shows Dev Logout button in the /map toolbar — omit in production
```

`CLERK_WEBHOOK_SIGNING_SECRET` will be added when webhooks are configured (server-only, never `NEXT_PUBLIC_`).

---

## Prisma v7

`new PrismaClient()` fails bare in Prisma 7. Must use the adapter:

```ts
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

See `src/lib/prisma.ts`.

---

## Design system — HUD theme

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
- `.starfield` — page background with animated star dots. **Its `::before` and `::after` pseudo-elements have `pointer-events: none` — do not remove this.** Without it the pseudo-elements block all clicks and keyboard input.
- `.hud-panel` — framed surface with border and background
- `.hud-panel-header` — top bar of a panel

Typography is always `font-mono`, labels are `uppercase tracking-widest text-xs`.

---

## What is built

- Landing page (`/`) with two-column layout — left branding panel, right sign-in form
- Custom sign-in form with email/password and Google, GitHub, Discord OAuth
- Custom sign-up form with email verification step
- OAuth callback handler at `/verify`
- `/map` SPA — interactive galaxy map (see Map SPA section below)
- Clerk middleware in `src/proxy.ts`
- Auth check in `src/lib/auth.ts`

## What is next

- Clerk webhooks at `src/app/api/webhooks/clerk/route.ts` — sync `user.created`, `user.updated`, `user.deleted` to the database. Requires `/api/webhooks/clerk` added to public routes in `proxy.ts` and `CLERK_WEBHOOK_SIGNING_SECRET` in env.
- Wire `src/actions/user.ts` to the database after webhook sync is in place
- World detail panel when a hex is clicked in the subsector grid
- Stellar color on star field dots (spectral class → color mapping already stubbed)
- Character/ship pinning to worlds

---

## Map SPA

The `/map` route is a fully client-side interactive map of Charted Space, built around `SubsectorNavigator`.

### Static galaxy data — two-tier loading

82 sector JSON files live in two places:

| Location | Purpose |
|---|---|
| `Galaxy/sectors.json` | Index of all sectors (21 KB) — bundled into Redux initial state, always available |
| `public/data/galaxy/sectors/<ABBR>.json` | Full sector detail with worlds — fetched on demand, browser-cached |

**Never move the detail files out of `public/data/galaxy/sectors/`.** The `loadSector` thunk fetches from `/data/galaxy/sectors/${abbr}.json`.

### Redux — galaxy slice

`src/store/slices/galaxySlice.ts`

- Initial state: `{ sectors: sectorsIndex.Sectors, sectorData: {}, loadingStatus: {} }`
- `loadSector(abbr)` async thunk — condition guard skips the fetch if status is already `"loading"` or `"loaded"`, so it is safe to call from multiple components simultaneously (galaxy grid fires ~50 at once)
- Selectors in `src/store/selectors/galaxy.selectors.ts`: `selectAllSectors`, `selectSectorData(abbr)`, `selectSectorLoadStatus(abbr)`, `selectIsSectorLoaded(abbr)`

### Types added to `src/types/index.ts`

```ts
SectorName   { Text: string; Lang?: string }   // Lang is optional — some entries omit it
SectorMeta   { X, Y, Milieu, Abbreviation, Tags, Names[] }
WorldUWP     { starport, size, atmosphere, hydrographics, population, government, lawLevel, techLevel }
World        { hex, hexX, hexY, name, uwp, travelZone, allegiance, stellar: string | null, ... }
SectorDetail { sector, subsectors: Record<string, string>, worlds: World[] }
```

`stellar` is `string | null` — some worlds in the JSON have null. Always guard with `|| ""` before splitting.

### Hex geometry — flat-top, column-based (Traveller standard)

All map components share the same constants. **Do not change orientation.**

```ts
const HEX_RADIUS = 20
const COL_SPACING = HEX_RADIUS * 1.5          // 30  — horizontal center-to-center
const ROW_SPACING = HEX_RADIUS * Math.sqrt(3) // ~34.6 — vertical center-to-center
const EVEN_COL_OFFSET = ROW_SPACING / 2        // ~17.3 — even columns shift DOWN

// Hex center position for col/row (1-based):
const cx = (col - 1) * COL_SPACING + HEX_RADIUS + PAD
const cy = (row - 1) * ROW_SPACING + ROW_SPACING / 2 + PAD + (col % 2 === 0 ? EVEN_COL_OFFSET : 0)

// SVG dimensions for an 8-col × 10-row subsector grid (viewBox 258 × ~372):
const svgWidth  = (cols - 1) * COL_SPACING + HEX_RADIUS * 2 + PAD * 2   // 258 for cols=8
const svgHeight = rows * ROW_SPACING + EVEN_COL_OFFSET + PAD * 2          // ~372 for rows=10
```

The `aspect-258/372` Tailwind class matches the subsector SVG aspect ratio exactly. Use it on minimap cells.

Hex 0101 is top-left, 3240 is bottom-right. Even columns offset downward (column-stagger, not row-stagger).

### Subsector layout

A sector is 32 columns × 40 rows, divided into 16 subsectors (A–P) in a 4×4 arrangement:

```
A B C D      hexXStart = (subCol * 8) + 1   subCol = index % 4
E F G H      hexYStart = (subRow * 10) + 1  subRow = floor(index / 4)
I J K L
M N O P
```

`hexXStart` values (1, 9, 17, 25) are always odd — even/odd column parity is preserved after remapping world coordinates into subsector-local space.

### Map components

| File | Purpose |
|---|---|
| `src/components/map/HexGrid.tsx` | Core SVG hex renderer. Props: `worlds`, `cols`, `rows`, `scale?`, `onSelectWorld`. `scale` multiplies rendered `width`/`height`; `viewBox` is fixed so aspect ratio is preserved. |
| `src/components/map/SubsectorGrid.tsx` | Loads a sector, slices one 8×10 subsector, renders via HexGrid. Props: `sectorAbbr`, `subsectorKey`, `showHeader?` |
| `src/components/map/SectorMapGrid.tsx` | 4×4 CSS grid of all 16 subsectors as a full sector overview. Uses `scale={0.5/1.2}` on each HexGrid. |
| `src/components/map/StarField.tsx` | Interactive 4×4 grid of subsector star-dot panels. Replaces the subsector minimap — clicking a cell sets the active subsector. Props: `sectorAbbr`, `activeKey`, `onSelectKey`. Cells are `w-7 aspect-258/372`. |
| `src/components/map/GalaxyStarField.tsx` | Single-sector star-dot SVG (`absolute inset-0 w-full h-full`) used inside each galaxy grid cell. Dispatches `loadSector` on mount; condition guard makes it safe to render in bulk. |
| `src/components/map/SubsectorNavigator.tsx` | Main map UI — three-column layout (see below). |

### SubsectorNavigator layout

Three columns, `flex gap-4 items-start`:

**Column 1 — Galaxy overview (9×9 grid)**
- `GRID_SIZE = 9`, `COORD_MIN = -4` — maps sector X/Y coordinates to grid positions
- Each cell: `relative overflow-hidden w-8.25 aspect-258/372` button containing a `GalaxyStarField`
- Clicking a cell sets `activeSectorAbbr` and resets `activeKey` to `"A"`
- Empty grid positions (no sector at that coordinate) render as inert dark cells

**Column 2 — Sector minimap (StarField 4×4)**
- `StarField` component — interactive 4×4 grid of star-dot panels
- Clicking a panel sets `activeKey`; active panel has accent background + outline
- Below it: subsector name label in accent color

**Column 3 — Subsector detail with directional nav**
- `NavButton` up/down/left/right around a `SubsectorGrid`
- `buildNavTargets` handles within-sector and cross-sector navigation using `sectorByCoord` (built from `selectAllSectors`, always populated)
- Cross-sector edge mapping:
  - Left edge → neighbor(-1,0), subsector col 3: `KEYS[subRow*4+3]`
  - Right edge → neighbor(1,0), subsector col 0: `KEYS[subRow*4]`
  - Top edge → neighbor(0,-1), subsector row 3: `KEYS[12+subCol]`
  - Bottom edge → neighbor(0,1), subsector row 0: `KEYS[subCol]`
- Arrow buttons are disabled (not hidden) when no neighboring sector exists in that direction

### `/map` route files

```
src/app/map/layout.tsx      Wraps route in <StoreProvider> — required for Redux
src/app/map/page.tsx        Renders <SubsectorNavigator sectorAbbr="Spin" initialSubsectorKey="J" />
src/app/map/DevLogoutButton.tsx  Dev-only logout, shown when DEV_MODE=true
```
