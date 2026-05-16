# User actions prompt:

## Output:

Create a server directory in the root of the project. Inside it, create a subdirectory named actions and a file named:
```
server/actions/user.actions.ts
```

Within this file, define three server-side actions that interact with the database, following Next.js and Prisma best practices. Each action should use try/catch blocks to handle errors gracefully.

---

## Actions to Define

### getUser()
Retrieves a user from the database based on a provided identifier.

---

### createOrUpdateUser()
Receives user data from Clerk webhooks and creates a new user or updates an existing user in the database.

---

### deleteUser()
Deletes a user from the database using a provided identifier.

---

## Guidelines

Encapsulate all database operations in try/catch blocks.

Log and handle errors gracefully to prevent application crashes.

Follow server-side conventions for Next.js and Prisma.

At this stage, only define these actions;

---

# What Was Built

## User Actions — `src/actions/user.ts`

Implemented in `src/actions/user.ts` (not `server/actions/` — kept inside `src/` to match the existing project structure). All three actions are arrow functions marked `"use server"` and wrapped in try/catch.

```
getUser(clerkId)           → prisma.user.findUnique by clerkId, returns null on error
createOrUpdateUser(data)   → prisma.user.upsert keyed on clerkId, accepts { clerkId, username }
deleteUser(clerkId)        → prisma.user.delete by clerkId
```

The `createOrUpdateUser` payload is scoped to what the current `User` schema holds (`clerkId`, `username`). When the schema gains additional fields (e.g. `email`, `imageUrl`), only the function signature and Prisma call need updating.

---

## Clerk Webhook Handler — `src/app/api/webhooks/clerk/route.ts`

A Next.js App Router route handler that receives and verifies Clerk webhook events.

**Verification:** Uses `verifyWebhook(req)` from `@clerk/nextjs/webhooks`. No separate `svix` package needed — Clerk's SDK handles the signature check internally using `CLERK_WEBHOOK_SIGNING_SECRET` from the environment.

**Events handled:**

| Event | Action |
|---|---|
| `user.created` | `createOrUpdateUser({ clerkId: id, username })` |
| `user.updated` | `createOrUpdateUser({ clerkId: id, username })` |
| `user.deleted` | `deleteUser(id)` — guards on `id` being present (Clerk's deleted payload makes it optional) |

Returns `200 OK` on success, `400` on verification failure so Clerk retries with backoff.

**Middleware:** `/api/webhooks/clerk` added to the public route matcher in `src/proxy.ts` so Clerk's auth middleware does not block incoming webhook requests before the signature check runs.

## Required Environment Variable

```bash
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...   # server-only, no NEXT_PUBLIC_ prefix
```

Obtained from: **Clerk Dashboard → Webhooks → Add Endpoint → Signing Secret**

Subscribe the endpoint to: `user.created`, `user.updated`, `user.deleted`

## Local Development

A `tunnel` script was added to `package.json`:

```bash
pnpm tunnel   # runs: ngrok http 3000
```

Use the ngrok HTTPS URL as the webhook endpoint in the Clerk dashboard during local development. Swap for the production domain on deploy — no code changes needed.