/**
 * Shared Clerk utilities used across auth forms.
 * Kept here so every form handles Clerk errors the same way,
 * and so a future developer only has one place to update if Clerk changes its error shape.
 */

export type ClerkFieldError = { message: string; meta?: { paramName?: string } }

/** Narrows an unknown catch value to a Clerk API error with an errors array. */
export const isClerkError = (err: unknown): err is { errors: ClerkFieldError[] } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "errors" in err &&
    Array.isArray((err as { errors: unknown }).errors)
  )
}
