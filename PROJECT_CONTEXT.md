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
/map                       Post-auth destination, interactive galaxy map SPA (protected)
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
- Classic Traveller Book 1 character generation engine (see Character Generation section below)
- "Create Character" button in the `/map` header — opens `CharacterCreateModal`
- `CharacterCreateModal` supports two modes: **Random** (instant full lifepath) and **Guided** (step-by-step, player makes every choice via `HumanDecisionProvider`). Player generates characters until satisfied, then saves manually.
- **Character persistence** — `POST /api/characters` saves a `CharacterSheet` to the database; `GET /api/characters` returns the list; `PATCH /api/characters/[id]` updates name, sheet, or credits; `DELETE /api/characters/[id]` removes a character. DEV_MODE bypasses auth and saves with `userId: null`.
- **Character Redux slice** (`src/store/slices/characterSlice.ts`) — `CharacterSummary` type, `fetchCharacters` thunk (condition guard prevents duplicate fetches), `invalidateCharacters` (resets to idle so next open re-fetches), `updateCharacterInList` (in-place name update after PATCH).
- **Character selectors** (`src/plugins/characters/selectors.ts`) — `selectCharacters`, `selectCharactersStatus`, `selectCurrentCharacter` (derived from the ship owner-operator), selected profile selectors, and owner-operator credit/location helpers.
- **`CharacterListModal`** — opens via `CharacterListButton` in header; fetches on open; dispatches `openCharacterProfile(id)` on row click.
- **`CharacterProfileModal`** — shows UPP, stats, skills, credits, location; unnamed characters get a name-input prompt that PATCHes the API and updates Redux in-place. `useEffect` resets local state on `char?.id` change to prevent stale name/save-state across selections.
- **`CharacterAvatar`** — badge in the header showing initials of the current character; click opens `CharacterProfileModal`.
- **Trade System card** (`src/components/map/TradeValuesCard.tsx`) — collapsible panel to the right of the hex grid. Shows origin world (sector › subsector › name, trade code badges, TL badge, purchase cost) and destination world (same fields + expected sale price). `CodeBadge` component shows hover tooltip with full trade classification name. Origin world name opens `WorldDetailModal` via `openWorldDetail()`; destination world name sets `activeWorldHex` then opens `WorldDetailModal`.
- **`WorldDetailModal`** (`src/components/modals/WorldDetailModal.tsx`) — checks `activeModal === "worldDetail"` (separate from `"systemDetail"`). `openWorldDetail` action in `uiSlice`.
- **`PlanetGlobe`** (`src/components/world/PlanetGlobe.tsx`) — 3D rotating planet in React Three Fiber. Procedural terrain texture (`buildTexture`) baked to a 1024×512 equirectangular `CanvasTexture` from the shared world-map terrain generator. Texture sampling uses deterministic domain warp + multi-sampling so globe coast/terrain edges are softened while the 2D map remains crisp. Cloud layer driven by `cloudConfig(atmo)` — null for atmo ≤1; opacity/color/speedMult vary by atmosphere code through sulphuric (atmo 11) and insidious (atmo 12+). Exports: `buildTexture`, `cloudConfig`, `getCloudTex`, `PLANET_SPEED`, `CloudConfig`.
- **`StarSystemView`** (`src/components/world/StarSystemView.tsx`) — React Three Fiber scene showing the full star system. Prefers `SystemData` from `selectActiveWorldSystem` when available; falls back to procedural `buildWorldPlacements`. Stars positioned by `buildLayoutFromSystemData`/`buildSystemLayout` from `src/lib/stellarSystem.ts`. Gas giants: `hot`/`jovian`/`ice` by orbit; ringed variants use Saturn texture; Jupiter texture for unringed jovians; procedural banded canvas for hot/ice. Main world as satellite of non-gas-giant parent rendered via `RockyParentBody` (parent sphere + `WorldBody` moon at radius 0.45). Click any body to pivot `OrbitControls` target (`PivotSmoother` lerps at 0.1/frame). Textures in `public/textures/`: `jupiter.jpg`, `saturn.jpg`, `saturn_ring.png`, `earth_clouds.png`.
- **`WorldPBG`** interface in `src/types/index.ts` — `{ raw, populationMultiplier, belts, gasGiants }`; `World.pbg` is this type (was incorrectly `string`).
- **`isAsteroid(world)`** exported from `src/lib/worldMap.ts` — `uwpVal(size) === 0`.
- **World map terrain system** (`src/lib/worldMap.ts`, `src/components/world/WorldMap.tsx`, `src/components/world/PlanetGlobe.tsx`) — Traveller Worlds-inspired icosahedral/interrupted 2D world map geometry and shared deterministic terrain generation. `WorldMap` renders the crisp 2D map; `PlanetGlobe.buildTexture` and `StarSystemView` use the same generated terrain for globe textures. Geometry uses actual UWP size, `buildDisplayHexes()` edge/wrap copies, and `buildWorldMapOverlays()` masks to match the Traveller Worlds outline without visible extra lines.
- **World map terrains** — base terrains are `land`, `ocean`, `fluid`, `oceanDepth`, `oceanAbyss`, `ice`, `frozen`, `desert`, `baked`, `lava`, `rough`, `woods`, `swamp`, `marsh`, `lake`, `wasteland`, `exotic`, and `vacuum`. Climate transforms currently cover `Fr`, `Vh`, `Mo`, `Tu`, `De`, `Ic`, `Wa`, `Fl`, and vacuum/asteroid handling.
- **World map features** — generated feature data can include `mountain`, `island`, `crater`, `volcano`, `chasm`, `precipice`, `resource`, `mine`, `oil`, `starport`, `town`, `city`, `suburb`, `rural`, `crop`, `domedCity`, `arcology`, `nobleEstate`, and `penalSettlement`.
- **World map decluttering** — `FEATURE_PRIORITY` and `visibleFeatures(hex)` in `src/lib/worldMap.ts` are display-only. Generation preserves the full `hex.features` list, but both the 2D map and globe render at most one visible symbol per hex. Priority favors settlements and major civilization markers over economy/geology/natural markers. The 2D legend is based on visible features, not hidden generated features.
- **World map tests** — focused coverage lives in `src/lib/__tests__/worldMap.test.ts`. Use `pnpm test -- --runInBand src/lib/__tests__/worldMap.test.ts` for map geometry/terrain/feature behavior. Current known TypeScript blocker outside this work: `src/components/modals/NotificationsModal.tsx:69` has pre-existing `never` type errors.
- **`src/lib/orbitData.ts`** — `STAR_HZ` lookup (473 entries), `ORBIT_AU[]`, `lookupHz`, `orbitToScene`, `seededRng`, `WorldPlacement` interface, `buildWorldPlacements`.
- **`src/lib/stellar.ts`** — `StarColors`, `PrimaryStar` interface, per-class color anchors (O–M + D), `parseStar(str)`, `physicalRadius(star)`. Used by `stellarSystem.ts` and `system.selectors.ts`.
- **`src/lib/stellarSystem.ts`** — `StarSlot`, `SystemLayout` interfaces; `deriveMass(star)`, `buildSystemLayout(stellar)` (procedural, for fallback), `buildLayoutFromSystemData(stars)` (data-driven). Single/binary/trinary scene geometry constants: `BINARY_SEP=5`, `OUTER_SEP=12`.
- **`src/lib/orbitalMechanics.ts`** — Kepler's 3rd law (`orbitalPeriodDays`), Imperial calendar epoch (`GAME_START_ELAPSED = 38,690 days`, `DAYS_PER_TURN = 14`), `elapsedDaysAtTurn(turn)`, `epochAngle(au, elapsed, mass)`, `spectralMass(spectral)`.
- **`src/store/selectors/system.selectors.ts`** — `SystemData` type and `selectActiveWorldSystem` selector. Reads `world.stellar` + PBG + `world.remarks` (checks `"Sa"` for satellite), builds fully-typed `SystemOrbit[]` using GG/P2 tables from `Galaxy/systems/gg.json` / `Galaxy/systems/p2.json`. Body shapes: `WorldBody` (`kind:"world"`, `isParent?:true` for bigworld parent), `GasGiantBody`, `BeltBody`. `isSatellite && gasGiants>0` → main world as moon of gas giant; `isSatellite && gasGiants===0` → main world as moon of rocky parent (`isParent:true`). Orbital angles are epoch-based (Kepler). **Renderer rule:** every `orbit.body` shape must have a matching branch in `StarSystemView`'s `placedElements` — missing branches silently drop bodies.
- **`selectActiveWorld`** in `galaxy.selectors.ts` — returns the `World` for the currently active `activeWorldHex` / `activeWorldSectorAbbr`.
- **Ship system** — Free Trader (Type A) fully implemented. See Ship section below.
- **`ShipCard`** (`src/components/map/ShipCard.tsx`) — collapsible panel showing ship name/type/status/location, crew roster, cargo manifest, market (buy cargo when docked), and "Manage Crew" button. Market panel fetches prices for the current world.
- **Ship API** — `GET /api/ship` (full ship summary including crew and cargo), `PATCH /api/ship` (name, status, world, jump state). Ship is created automatically on first character save when a crew role is selected.
- **Cargo API** — `POST /api/ship/cargo` buys cargo (deducts credits from owner, adds CargoLot); `DELETE /api/ship/cargo/[lotId]` removes a lot. `GET /api/ship/market` returns commodity price and capacity for the current world. `POST /api/ship/cargo/[lotId]/sell` sells a lot when docked — atomically deletes lot and credits owner; returns `{ creditsEarned, newCredits }`. Sale price uses the same demand formula as `deriveExpectedSalePrice`.
- **Crew system** — `CrewManagementModal` (`src/components/modals/CrewManagementModal.tsx`) — split panel: left shows required role slots (captain in their role with ★, "hire from pool →" on vacant slots); right shows 20 available crew from port with "Hire as [Role]" buttons per qualifying skill. Captain can reassign their role via inline buttons. Pool refreshes on world arrival.
- **Crew API** — `POST /api/ship/crew` hires an NPC; `DELETE /api/ship/crew/[crewId]` fires; `PATCH /api/ship/crew/[crewId]` changes captain's role (auto-fires any NPC in the target slot).
- **Crew library** — 2,500 pre-generated crew templates in `src/data/crewLibrary.json` (~1 MB). Imported at module level in `availableCrewSlice` (not stored in Redux — keeps DevTools fast). Names randomised at selection time. Skill names verified: `"Engineering"` / `"Gunnery"` (not Engineer/Gunner).
- **`src/lib/crew.ts`** — `ROLE_REQUIRED_SKILL`, `calculateSalary` (base + Cr1,000 × skill level), `qualifiesForRole`, `skillLevelForRole`, `formatUPP`.
- **Turn system** — `TurnCard` (`src/components/map/TurnCard.tsx`) — turn counter, "Remain on World" / "Jump" / "Proceed" state machine with animated dice roll display. `turnSlice` tracks `currentTurn`. `GET /api/turn`, `POST /api/turn/advance` (increments turn, updates ship atomically).
- **Turn event registry** (`src/lib/turns/handlers.ts`) — `onEndTurn`/`fireEndTurn`, `onStartTurn`/`fireStartTurn`, `onStartJumpTurn`/`fireStartJumpTurn`. Handlers registered via module import side effects (import in client component, not server).
- **Mayday local-space combat plugin** (`src/plugins/mayday/`) — streamlined game adaptation rather than a strict tabletop simulation. Opens from the system HUD into a full-screen tactical hex board with preset scenarios and custom ship setup. The turn flow covers vector movement, player thrust, opponent behavior, laser fire, missiles, defensive sand, component damage, objectives, event history, draggable HUD panels, board panning, and recenter/reset controls. Pure combat and movement rules live in `maydayRules.ts`; focused coverage lives in `src/plugins/mayday/__tests__/maydayRules.test.ts`.
- **Monthly costs** (`src/lib/turns/monthlyCosts.ts`) — registered as `onEndTurn` handler; fires every 2 turns (`turn % 2 === 0`); deducts mortgage + crew salaries from owner's credits via `PATCH /api/characters/[id]`.
- **Jump flow** — Navigation check (2D6 + navDM, 3 attempts at targets 4/6/8), jump drive check (2D6 + engDM, target 4). Misjump on drive failure stays docked. Fuel (Cr10,000) deducted atomically inside `POST /api/turn/advance` transaction when entering jump. Jump blocked client-side by `selectJumpReadiness` if credits < fuel cost or any required crew slot is vacant.
- **`JumpRangeModal`** (`src/components/modals/JumpRangeModal.tsx`) — hex-shaped SVG grid (radius = jumpRating) centred on the ship's world. Loads adjacent sectors as needed. Ship marker (◈) at centre. Clicking a world sets it as the jump destination.
- **Ship silhouette** — rendered on `SubsectorGrid`/`HexGrid` at the ship's current hex. Color driven by `selectShipColor` (default `#9ca3af`); `setShipColor` action in `shipSlice` for future status-based colour changes.
- **Utilities** — `src/lib/dice.ts` (`roll1d6`, `roll2d6`, `statDM`); `src/lib/hex.ts` (`parseHex`, `hexDistance` via cube coordinates); `src/components/map/hexGeometry.ts` (shared constants HEX_RADIUS=20 etc.).

## What is next

- **World map follow-ups** — map terrain is feature-complete for a first full pass. Deferred refinements: trade-code-specific placement tuning, symbol density/visual QA across representative worlds, globe symbol size/opacity tuning, and generated map/texture caching/versioning. Caching should be handled as a later shared caching task because other world assets will also need cached outputs.
- **System layout data** — `Galaxy/systems/inner_system.json` is a slot template for the inner system (7 rings, recursive satellite orbits, ring 7 = binary companion). `$ref` format agreed: `{ kind: "star"|"world"|"gasGiant"|"belt", spectral? | hex+sector? | index? }`. Rules for populating rings from Traveller 5 source are being researched. Outer system form to follow.
- **Maintenance system** — condition levels (Good / Fair / Poor / Critical) driven by a debt counter; each skipped maintenance cycle increments debt; starport-class cost table; Poor/Critical conditions add misjump risk and will eventually affect passengers. Schema change needed.
- **Passengers** — booking high/middle/low passage berths, travel revenue per jump, boarding/disembarking flow.
- **Directed provider** — `RoleDirectedDecisionProvider` in `src/lib/characters/providers/directed.ts` that weights choices toward a target role archetype. Third "Directed" mode card in `CharacterCreateModal`.
- Clerk webhooks at `src/app/api/webhooks/clerk/route.ts` — sync `user.created`, `user.updated`, `user.deleted` to the database.
- Stellar color on star field dots — `stellar.ts` color data is available; apply to `GalaxyStarField`/`StarField` dot colors.
- Character/ship pinning to worlds.

---

## Cargo Sale

**Implemented.** When docked, the player can sell any CargoLot at the current world's expected sale price.

### Sale price
`selectExpectedSalePrice` in `galaxy.selectors.ts` and `deriveExpectedSalePrice` (server-side reuse in the sell route):

```
demandSum = Σ MARKET_DEMAND_TABLE[sourceCode][targetCode]
  over all (sourceCode in originWorld.tradeCodes) × (targetCode in currentWorld.tradeCodes)
techDelta = (originTL - currentTL) * 0.1
salePrice = Math.max(0, (demandSum * 1000 + 5000) * (1 + techDelta))
```

### API endpoint
`POST /api/ship/cargo/[lotId]/sell` — no body. Verifies lot belongs to ship and ship is docked. Atomically deletes lot and adds `salePrice × tons` credits to owner. Returns `{ creditsEarned, newCredits }`.

---

## Map SPA

The `/map` route is a fully client-side interactive map of Charted Space, built around `MapColumns`.

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
| `src/components/map/StarField.tsx` | Interactive 4×4 grid of subsector star-dot panels. Clicking a cell sets the active subsector. Props: `sectorAbbr`, `activeKey`, `onSelectKey`. Cells are `w-7 aspect-258/372`. |
| `src/components/map/GalaxyStarField.tsx` | Single-sector star-dot SVG (`absolute inset-0 w-full h-full`) used inside each galaxy grid cell. Dispatches `loadSector` on mount; condition guard makes it safe to render in bulk. |
| `src/components/map/GalaxyMiniMap.tsx` | Collapsible 9×9 galaxy overview panel. `GRID_SIZE=9`, `COORD_MIN=-4`. Each cell is a `GalaxyStarField`. Clicking a cell sets `activeSectorAbbr`. Toggle via `toggleGalaxyMiniMap` action; collapses to 32 px with `motion.div`. |
| `src/components/map/SectorMiniMap.tsx` | Collapsible sector minimap — 4×4 `StarField` grid. Clicking a panel sets `activeSubsectorKey`. Toggle via `toggleSectorMiniMap`. |
| `src/components/map/SubsectorMiniMap.tsx` | Collapsible subsector detail with directional nav buttons (up/down/left/right). `buildNavTargets` handles within-sector and cross-sector navigation. Toggle via `toggleSubsectorMiniMap`. Cross-sector edge mapping: left→neighbor(-1,0) col 3, right→neighbor(1,0) col 0, top→neighbor(0,-1) row 3, bottom→neighbor(0,1) row 0. Arrows disabled (not hidden) at sector edges. |
| `src/app/map/MapColumns.tsx` | Top-level map layout — `flex gap-4 items-start` containing `FreeTraderDeckPlan` + `GalaxyMiniMap` + `SectorMiniMap` + `SubsectorMiniMap` + right column (`TradeValuesCard`, `ShipCard`, `TurnCard`). Replaces old `SubsectorNavigator`. |
| `src/components/map/TradeValuesCard.tsx` | Collapsible Trade System panel — origin/destination world trade codes, TL, cost, expected sale price. |
| `src/components/ship/FreeTraderDeckPlan.tsx` | Static SVG deck plan for the Free Trader. Rendered as the leftmost panel in `MapColumns`. |

### `/map` route files

```
src/app/map/layout.tsx                  Wraps route in <StoreProvider> — required for Redux
src/app/map/page.tsx                    Header + MapColumns + modals
src/app/map/MapColumns.tsx              Top-level map layout (see Map components above)
src/app/map/DevLogoutButton.tsx         Dev-only logout, shown when DEV_MODE=true
src/app/map/CreateCharacterButton.tsx   Header button — dispatches openCharacterCreate()
src/app/map/CharacterListButton.tsx     Header button — dispatches openCharacterList()
src/app/map/CharacterAvatar.tsx         Header badge — shows initials of current character; click opens profile
src/app/map/SystemViewButton.tsx        Header button — dispatches openSystemDetail(world.hex); opens StarSystemView modal
src/app/map/UpdatedSystemViewButton.tsx Dev/test button — dispatches openUpdatedSystemDetail(world.hex)
src/app/map/CharacterCreateModal.tsx    Character generation modal (see Character Generation below)
src/components/modals/CharacterListModal.tsx     Lists saved characters; fetches on open via fetchCharacters thunk
src/components/modals/CharacterProfileModal.tsx  Shows UPP/stats/skills; name prompt for unnamed characters
```

### uiSlice state added for map layout

```ts
showGalaxyMiniMap:    boolean  // toggled by toggleGalaxyMiniMap action (default true)
showSectorMiniMap:    boolean  // toggled by toggleSectorMiniMap action (default true)
showSubsectorMiniMap: boolean  // toggled by toggleSubsectorMiniMap action (default true)
```

`openSystemDetail(hex)` sets `activeModal = "systemDetail"` and `activeWorldHex`.
`openUpdatedSystemDetail(hex)` sets `activeModal = "updatedSystemDetail"` and `activeWorldHex`.

---

## Character Generation

Classic Traveller Book 1 lifepath system. The engine is **pure** — decisions in, character sheet out. No Prisma, no server actions, no side effects.

### Source tables — `src/data/classic/`

| File | Contents |
|---|---|
| `careers.json` | 6 careers — enlistment/survival/commission/promotion/reenlistment targets + DMs, skill tables, rank names, muster bonus rolls |
| `mustering-out.json` | Cash tables (7 entries × 6 careers), benefits tables, retirement pay schedule |
| `cascades.json` | `blade`, `gun`, `vehicle` subtables (6 entries each) |
| `aging.json` | 3 aging brackets (34–46, 47–62, 63+) with stat checks |
| `character-schema.json` | JSON Schema draft-07 — source of truth for the shape of a complete character sheet |

All characters must validate against `character-schema.json` before being saved.

### Engine files — `src/lib/characters/`

| File | Role |
|---|---|
| `types.ts` | All public TypeScript interfaces: `CharacterSheet`, `UPP`, `Skill`, `CareerRecord`, `Benefits`, `DecisionRecord`, `Generation`, `DecisionProvider`, `DecisionPoint`, `GenerationOptions` |
| `tables.ts` | Typed imports of the four CT JSON files; exports `getCareer()`, `getRetirementPay()`, typed interfaces for raw table data |
| `engine.ts` | `generateCharacter(name, provider, options): Promise<CharacterSheet>` — full lifepath state machine; throws `CharacterDeathError` on survival/aging death |
| `providers/random.ts` | `RandomDecisionProvider` — picks uniformly at random from offered options |
| `providers/human.ts` | `HumanDecisionProvider` — suspends at each decision until `provider.choose(id)` is called from the UI; `provider.cancel()` rejects with `GenerationCancelledError` |

### Lifepath phases (engine.ts)

1. **Characteristics** — 2D6 × 6, clamped 1–15
2. **Career selection** — provider chooses from 6 careers
3. **Enlistment** — 2D6 + stat DMs vs target; failure → 1D6 draft table
4. **Enlistment bonus** — automatic skill grant (no roll), not recorded in decisions
5. **Term loop** (max 7 terms):
   - Survival (2D6 + DMs) — fail = `CharacterDeathError`
   - Commission (2D6 + DMs) — scouts/other have no commission
   - Promotion (2D6 + DMs) — commissioned officers only, max rank 6
   - Skill rolls — 1 base + 1 per commission + 1 per promotion; provider picks table each roll
   - Aging — kicks in at age 34; medical skill grants DM+1 on each check
   - Reenlistment — roll 12 = forced in; < target = forced out; ≥ target = provider decides
6. **Mustering out** — terms + rank bonus rolls; max 3 cash rolls; gambling DM on cash; rank 5+ DM on benefits
7. **Retirement pay** — 5+ terms (not scouts/other): Cr4000–Cr8000+/year

### DecisionProvider interface

```ts
interface DecisionProvider {
  decide(point: DecisionPoint): Promise<string>; // returns chosen option id
}
```

Every decision point goes through the provider. Dice rolls happen inside the engine and are recorded in `generation.decisions[]` with `madeBy: "random"`. Provider-driven choices record `madeBy` from the mode (`random` / `human` / `directed`).

**Steps the provider handles:** `career_selection`, `skill_table_choice`, `reenlistment_decision`, `muster_roll_type`

**Steps the engine handles internally (dice only):** `characteristics`, `enlistment_roll`, `survival_roll`, `commission_roll`, `promotion_roll`, `skill_roll`, `cascade_roll`, `aging_roll`, `muster_roll`

### Two-layer storage (Prisma)

- `sheet Json?` column holds the complete character sheet — this is the canonical record
- Tabular columns (`strength`, `dexterity`, etc.) are queryable projections for filtering
- **Sheet wins** when tabular columns conflict with sheet data
- Sync process between sheet and tabular columns is pending

### CharacterCreateModal

`src/app/map/CharacterCreateModal.tsx` — renders when `activeModal === "characterCreate"`.

Driven by a `phase` state machine: `idle → running/deciding → complete | dead`.

**Idle** — two mode cards side-by-side:
- **Random** — instant full lifepath via `RandomDecisionProvider`
- **Guided** — step-by-step via `HumanDecisionProvider`; engine suspends at each `DecisionPoint`

**Deciding (guided)** — shows the current decision prompt, optional context (term number, reenlistment roll), and option buttons. Career options include a one-line description. Skill table keys are mapped to human-readable names. A running log below the options records every choice made so far. Cancel button resets to idle and calls `provider.cancel()` to clean up the in-flight promise.

**Complete** — `SheetDisplay` component renders: UPP hex + individual stats, career summary (name, terms, rank, age), skills as badges, credits, and any benefits (retirement pay, ship, passages, weapons). "Generate Another" button resets to idle.

**Dead** — death message with "Try Again" button.

#### HumanDecisionProvider pattern

```ts
// Engine suspends here until choose() or cancel() is called
async decide(point: DecisionPoint): Promise<string> {
  return new Promise((resolve, reject) => {
    this.resolveNext = resolve;
    this.rejectNext = reject;
    this.onDecision(point);   // fires setPendingPoint(point) in the modal
  });
}
```

The modal holds the provider in a `useRef` so it survives re-renders. `handleChoice(point, id)` calls `provider.choose(id)` → the engine's awaited promise resolves → next step begins immediately (synchronous dice rolls) → next `DecisionPoint` is emitted (or generation completes).

---

## Ships

Ships are the vehicle characters use to move between worlds. Without a ship a character cannot travel. The only ship type in MVP is the **Free Trader (Type A)**.

### Static ship types — `src/data/classic/ships.json`

One entry per ship class, analogous to `careers.json`. Fields:

| Field | Type | Notes |
|---|---|---|
| `type` | string | Unique key — `"free_trader"` |
| `designation` | string | CT designation — `"Type A"` |
| `hullTons` | number | 200 |
| `jumpRating` | number | 1 — determines jump range in parsecs on the map |
| `maneuverRating` | number | 1G |
| `fuelCostPerJump` | number | Credits — 20 tons × Cr500/ton = Cr10,000 |
| `cargoCapacity` | number | 82 tons |
| `stateroomsTotal` | number | 10 (4 crew + 6 passenger) |
| `stateroomsCrew` | number | 4 |
| `stateroomsPassenger` | number | 6 |
| `lowBerths` | number | 20 |
| `hardpoints` | number | 1 |
| `computer` | string | `"Model/1bis"` |
| `purchasePrice` | number | Cr28,000,000 |
| `monthlyMortgage` | number | Cr150,920 |
| `mortgageYears` | number | 40 |
| `requiredCrew` | string[] | `["pilot", "navigator", "engineer", "steward"]` |

### Prisma models

```
Ship            — name, type, jumpRating, status ("docked"/"in_jump"), mortgage tracking,
                  currentWorldId, destinationWorldId, jumpArrivesTurn, userId
ShipCrew        — shipId, characterId (null for NPCs), npcName, role, isOwnerOperator,
                  monthlySalary, keySkillName, keySkillLevel
ShipPassenger   — not yet implemented
CargoLot        — shipId, commodity, tons, purchasePrice (per ton), originWorldId, acquiredAt
```

**Ownership** is single-user for MVP (Ship.userId FK). One ship per user.

**Fuel** is abstracted to a credit cost per jump (`fuelCostPerJump` from the type template). No tonnage tracking.

**Cargo** is a full manifest — each `CargoLot` records commodity, tons, purchase price per ton, and origin world. Profit on sale = `(salePrice − purchasePrice) × tons`.

**Crew qualification** — each role requires a minimum skill-0 in the key skill (Pilot/Navigation/Engineering/Steward/Gunnery/Medical). The owner-operator (captain) is exempt from qualification but still occupies a specific role slot. NPC crew salary = base rate from `crewSalaries.json` + Cr1,000 × `keySkillLevel`.

**Jump readiness** — `selectJumpReadiness` (`src/store/selectors/jumpReadiness.selectors.ts`) checks all required crew slots filled + owner credits ≥ `fuelCostPerJump`. Drives the Jump button gate in TurnCard. Server also enforces this in `POST /api/turn/advance`.

**Travel** — when the ship enters jump it stores `destinationWorldId` and `jumpArrivesTurn`. On "Proceed" the ship status becomes "docked" and `currentWorldId` is set to the destination. Characters move with the ship implicitly (they are associated via ShipCrew).

### Ship + crew selectors

```
selectShip          — ShipSummary | null (full ship with crew + cargo arrays)
selectShipStatus    — "idle" | "loading" | "loaded" | "error"
selectShipCrew      — CrewMember[] shortcut
selectShipColor     — string (default #9ca3af); driven by setShipColor action
selectJumpReadiness — { canJump: boolean, reasons: string[], fuelCost: number }
selectAvailableCrew — AvailableCrewMember[] (20-member port pool)
selectCrewPoolSize  — number (default 20, configurable via setPoolSize)
```
