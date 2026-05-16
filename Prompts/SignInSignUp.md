# Auth Flow — What Was Actually Built

This document describes the sign-in/sign-up implementation as it exists in the codebase. Use it as a reference when modifying auth behavior or onboarding.

---

## Route Structure

```
/                              Landing page with embedded SignInForm (public)
/sign-up/[[...sign-up]]/       Custom sign-up page (public)
/verify                        OAuth callback handler (public)
/map                           Post-auth destination (protected)
```

All public routes are declared in `src/proxy.ts` via `createRouteMatcher`.

---

## Clerk v7 API — Critical Reference

This is **not** the Clerk you know from training data. The hook API changed completely in v7. These old patterns **do not exist**:

```ts
// ❌ DEAD — do not use
const { isLoaded, setActive } = useSignIn()
signIn.create({ identifier, password })
signIn.authenticateWithRedirect({ ... })
prepareSecondFactor({ strategy: "email_code" })
attemptSecondFactor({ strategy: "email_code", code })
```

### Clerk v7 Sign-In API

```ts
const { signIn, fetchStatus } = useSignIn()
const isLoading = fetchStatus === "fetching"

// Email/password
await signIn.password({ emailAddress, password })

// OAuth (Google, GitHub, Discord)
await signIn.sso({
  strategy,               // e.g. "oauth_google"
  redirectUrl: `${window.location.origin}/verify`,
  redirectCallbackUrl: "/map",
})

// MFA (second factor)
await signIn.mfa.sendEmailCode()
await signIn.mfa.verifyEmailCode({ code })

// Finalize (always required — appends Safari ITP cookie token)
await signIn.finalize({
  navigate: ({ decorateUrl }) => {
    const url = decorateUrl("/map")
    if (url.startsWith("http")) {
      window.location.href = url
    } else {
      router.push(url)
    }
  },
})
```

### Clerk v7 Sign-Up API

```ts
const { signUp, fetchStatus } = useSignUp()

// Create account
await signUp.password({
  emailAddress, password, firstName, lastName, username,
  unsafeMetadata: { birthday: "1998-04-25" },
})

// Email verification
await signUp.verifications.sendEmailCode()          // NOT signUp.verifications.emailAddress.sendEmailCode()
await signUp.verifications.verifyEmailCode({ code })

// Finalize (same pattern as sign-in)
await signUp.finalize({ navigate: ({ decorateUrl }) => { ... } })
```

**`decorateUrl` is not optional.** It appends a Clerk cookie-refresh token for Safari ITP. Always call it inside `finalize`'s `navigate` callback.

---

## Error Handling

`src/lib/clerk.ts` exports shared utilities:

```ts
export type ClerkFieldError = { message: string; meta?: { paramName?: string } }

export const isClerkError = (err: unknown): err is { errors: ClerkFieldError[] } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  )
}
```

Use `isClerkError` in every `catch` block. Map `error.meta?.paramName` to form fields:

| paramName | Form field |
|---|---|
| `email_address` | `email` |
| `password` | `password` |
| `username` | `username` |

---

## File Locations

```
src/
  proxy.ts                                     Clerk middleware, public route matcher
  lib/
    auth.ts                                    Server-side auth() check, redirects to /map if authed
    clerk.ts                                   isClerkError, ClerkFieldError — shared across forms
  app/
    page.tsx                                   Calls checkAuth(), renders LandingPage
    components/
      LandingPage.tsx                          Two-column layout: branding left, SignInForm right
    (auth)/
      validations/
        SignIn.ts                              Zod schemas + types for sign-in
        SignUp.ts                              Zod schemas + types for sign-up
      components/
        SignInForm.tsx                         Email/password + OAuth sign-in
        SignUpForm.tsx                         Full sign-up + email verification
      sign-up/[[...sign-up]]/
        page.tsx                              Renders SignUpForm
        loading.tsx
        error.tsx
      verify/
        page.tsx                              Mounts AuthenticateWithRedirectCallback
        loading.tsx
        error.tsx
      loading.tsx
      error.tsx
```

---

## Landing Page Layout

Two-column grid inside a `.starfield` full-screen background:

- **Left panel** — HUD branding (title, stats rows, navigation grid placeholder, copyright)
- **Right panel** — `<SignInForm />` directly embedded (no modal, no separate route)

Authenticated users are redirected to `/map` before the page renders (server-side via `checkAuth()` in `src/lib/auth.ts`).

---

## SignInForm — Actual Implementation

```
src/app/(auth)/components/SignInForm.tsx
```

**States:**
- Default: email/password form + three OAuth buttons
- `showVerification = true`: MFA code entry form

**OAuth providers:** Google, GitHub, Discord (strategies: `oauth_google`, `oauth_github`, `oauth_discord`)

**Sign-in flow:**
1. `signIn.password()` → if `status === "complete"` → `finalize()`
2. If `status === "needs_second_factor"` → `signIn.mfa.sendEmailCode()` → show verification form
3. Verification: `signIn.mfa.verifyEmailCode({ code })` → `finalize()`

**OAuth flow:**
1. `signIn.sso({ strategy, redirectUrl: .../verify, redirectCallbackUrl: /map })`
2. User returns to `/verify` → `AuthenticateWithRedirectCallback` handles the rest

**Validation:** `src/app/(auth)/validations/SignIn.ts` — Zod schemas for `signInSchema` and `verificationCodeSchema`, typed via `SignInType` and `VerificationCodeType`.

---

## SignUpForm — Actual Implementation

```
src/app/(auth)/components/SignUpForm.tsx
```

**States:**
- Default: registration form
- `showVerification = true`: email code verification form

**Fields collected:** email, password, firstName, lastName, username, birthMonth (select), birthDay (number), birthYear (number)

**Birthday handling:** Combined into `"YYYY-MM-DD"` and stored in `unsafeMetadata.birthday`.

**Sign-up flow:**
1. `signUp.password({ ...fields, unsafeMetadata: { birthday } })`
2. If `status === "complete"` → `finalize()`
3. Otherwise → `signUp.verifications.sendEmailCode()` → show verification form
4. Verification: `signUp.verifications.verifyEmailCode({ code })` → `finalize()`

**Validation:** `src/app/(auth)/validations/SignUp.ts` — Zod schemas for `signUpSchema` and `emailVerificationSchema`.

**CAPTCHA:** `<div id="clerk-captcha" />` is included in the sign-up form.

---

## Verify Page

```
src/app/(auth)/verify/page.tsx
```

Mounts Clerk's OAuth callback handler:

```tsx
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

const VerifyPage = () => {
  return (
    <main className="starfield ...">
      <p ...>Authenticating…</p>
      <p ...>Establishing secure session.</p>
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/map"
        signUpFallbackRedirectUrl="/map"
      />
    </main>
  )
}
export default VerifyPage
```

---

## Environment Variables

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/map
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/map
DATABASE_URL=postgresql://traveller:traveller@localhost:5432/charted_space?schema=public
DEV_MODE=true   # shows Dev Logout button in /map toolbar — omit in production
```

`CLERK_WEBHOOK_SIGNING_SECRET` — to be added when webhooks are implemented (server-only, no `NEXT_PUBLIC_` prefix).

---

## Clerk Dashboard Settings (Development)

Configure under **Configure → Paths**:

| Setting | Value |
|---|---|
| Sign-in URL | `/` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/map` |
| After sign-up URL | `/map` |

---

## What Is Next

- Clerk webhooks at `src/app/api/webhooks/clerk/route.ts`
  - Sync `user.created`, `user.updated`, `user.deleted` to the database
  - Add `/api/webhooks/clerk` to public routes in `proxy.ts`
  - Use `verifyWebhook` from `@clerk/nextjs/webhooks` (no separate `svix` package needed)
  - Signing secret: `CLERK_WEBHOOK_SIGNING_SECRET` (server-only)
- Wire `src/actions/user.ts` to the database after webhook sync
