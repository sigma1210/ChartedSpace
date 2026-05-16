"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import {
  signInSchema,
  type SignInType,
  verificationCodeSchema,
  type VerificationCodeType,
} from "@/app/(auth)/validations/SignIn"
import { isClerkError } from "@/lib/clerk"
import { Input } from "@/components/ui/input"

const OAUTH_PROVIDERS = [
  { strategy: "oauth_google" as const, label: "Login with Google" },
  { strategy: "oauth_github" as const, label: "Login with Github" },
  { strategy: "oauth_discord" as const, label: "Login with Discord" },
] as const

const SignInForm = () => {
  const router = useRouter()
  const { signIn, fetchStatus } = useSignIn()
  const isLoading = fetchStatus === "fetching"
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SignInType>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  const verifyForm = useForm<VerificationCodeType>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: { code: "" },
  })

  // decorateUrl appends a Clerk cookie-refresh token required for Safari ITP.
  // Without it, sessions silently expire in Safari after the redirect.
  const navigateToFeed = ({ decorateUrl }: { decorateUrl: (url: string) => string }) => {
    const url = decorateUrl("/map")
    if (url.startsWith("http")) {
      window.location.href = url
    } else {
      router.push(url)
    }
  }

  const handleOAuth = async (strategy: (typeof OAUTH_PROVIDERS)[number]["strategy"]) => {
    if (!signIn) return
    try {
      await signIn.sso({
        strategy,
        redirectUrl: `${window.location.origin}/verify`,
        redirectCallbackUrl: "/map",
      })
    } catch (err: unknown) {
      console.error("OAuth sign-in failed:", err)
      setError(isClerkError(err) ? (err.errors[0]?.message ?? "OAuth sign-in failed.") : "OAuth sign-in failed.")
    }
  }

  const onSubmit = async (data: SignInType) => {
    if (!signIn) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: signInError } = await signIn.password({
        emailAddress: data.email,
        password: data.password,
      })
      if (signInError) {
        setError(signInError.message ?? "Sign-in failed.")
        return
      }
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: navigateToFeed })
      } else if (signIn.status === "needs_second_factor") {
        await signIn.mfa.sendEmailCode()
        setShowVerification(true)
      }
    } catch (err: unknown) {
      console.error("Sign-in failed:", err)
      setError(err instanceof Error ? err.message : "An error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onVerify = async (data: VerificationCodeType) => {
    if (!signIn) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: mfaError } = await signIn.mfa.verifyEmailCode({ code: data.code })
      if (mfaError) {
        setError(mfaError.message ?? "Verification failed.")
        return
      }
      if (signIn.status === "complete") {
        await signIn.finalize({ navigate: navigateToFeed })
      }
    } catch (err: unknown) {
      console.error("MFA verification failed:", err)
      setError(err instanceof Error ? err.message : "Verification failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showVerification) {
    return (
      <div className="space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-(--hud-accent) mb-1">
            Second Factor Required
          </p>
          <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-(--hud-text)">
            Verify Identity
          </h2>
        </div>

        <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
          <div>
            <label className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) block mb-1">
              Verification Code
            </label>
            <Input
              placeholder="Enter code"
              autoComplete="one-time-code"
              className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
              {...verifyForm.register("code")}
            />
            {verifyForm.formState.errors.code && (
              <p className="mt-1 font-mono text-xs text-(--hud-error)">
                {verifyForm.formState.errors.code.message}
              </p>
            )}
          </div>

          {error && <p className="font-mono text-xs text-(--hud-error)">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full border border-(--hud-accent) py-2.5 font-mono text-xs uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : "◯ Submit Code"}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-(--hud-accent) mb-1">
          Authorization Required
        </p>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-(--hud-text) leading-tight">
          Access Restricted to<br />Authorized Personnel Only
        </h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) block mb-1">
            Operator ID
          </label>
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="mt-1 font-mono text-xs text-(--hud-error)">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) block mb-1">
            Access Key
          </label>
          <Input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="mt-1 font-mono text-xs text-(--hud-error)">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {error && <p className="font-mono text-xs text-(--hud-error)">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full border border-(--hud-accent) py-2.5 font-mono text-xs uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Authenticating…" : "◯ Execute Sign-In"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-(--hud-border)" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
          External Handshake
        </span>
        <div className="flex-1 h-px bg-(--hud-border)" />
      </div>

      <div className="space-y-2">
        {OAUTH_PROVIDERS.map(({ strategy, label }) => (
          <button
            key={strategy}
            type="button"
            onClick={() => handleOAuth(strategy)}
            disabled={isLoading}
            className="w-full border border-(--hud-border) py-2 font-mono text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          className="font-mono text-xs uppercase tracking-wider text-(--hud-error) hover:underline"
        >
          Recover Key
        </button>
        <Link
          href="/sign-up"
          className="font-mono text-xs uppercase tracking-wider text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
        >
          Create ID Profile
        </Link>
      </div>
    </div>
  )
}
export default SignInForm
