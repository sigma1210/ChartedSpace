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
- `/map` placeholder with dev-mode logout button in the toolbar
- Clerk middleware in `src/proxy.ts`
- Auth check in `src/lib/auth.ts`

## What is next

- Clerk webhooks at `src/app/api/webhooks/clerk/route.ts` — sync `user.created`, `user.updated`, `user.deleted` to the database. Requires `/api/webhooks/clerk` added to public routes in `proxy.ts` and `CLERK_WEBHOOK_SIGNING_SECRET` in env.
- Wire `src/actions/user.ts` to the database after webhook sync is in place
- The Charted Space map SPA at `/map`
