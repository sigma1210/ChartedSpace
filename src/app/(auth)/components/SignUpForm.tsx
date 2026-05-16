"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSignUp } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import {
  signUpSchema,
  type SignUpType,
  emailVerificationSchema,
  type EmailVerificationType,
} from "@/app/(auth)/validations/SignUp"
import { isClerkError } from "@/lib/clerk"
import { Input } from "@/components/ui/input"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const SignUpForm = () => {
  const router = useRouter()
  const { signUp, fetchStatus } = useSignUp()
  const isLoading = fetchStatus === "fetching"
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const form = useForm<SignUpType>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      username: "",
      birthMonth: "",
      birthDay: "",
      birthYear: "",
    },
  })

  const verifyForm = useForm<EmailVerificationType>({
    resolver: zodResolver(emailVerificationSchema),
    defaultValues: { code: "" },
  })

  const onSubmit = async (data: SignUpType) => {
    if (!signUp) return
    setIsSubmitting(true)
    setError(null)

    const monthIndex = MONTHS.indexOf(data.birthMonth) + 1
    const birthday = `${data.birthYear}-${String(monthIndex).padStart(2, "0")}-${String(data.birthDay).padStart(2, "0")}`

    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
        unsafeMetadata: { birthday },
      })

      if (signUpError) {
        setError(signUpError.message ?? "Sign-up failed.")
        return
      }

      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: navigateToFeed })
        return
      }

      await signUp.verifications.sendEmailCode()
      setShowVerification(true)
    } catch (err: unknown) {
      console.error("Sign-up failed:", err)
      if (isClerkError(err)) {
        err.errors.forEach((e) => {
          const param = e.meta?.paramName
          if (param === "email_address") form.setError("email", { message: e.message })
          else if (param === "password") form.setError("password", { message: e.message })
          else if (param === "username") form.setError("username", { message: e.message })
          else setError(e.message)
        })
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const onVerify = async (data: EmailVerificationType) => {
    if (!signUp) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code: data.code,
      })
      if (verifyError) {
        setError(verifyError.message ?? "Verification failed.")
        return
      }
      if (signUp.status === "complete") {
        await signUp.finalize({ navigate: navigateToFeed })
      }
    } catch (err: unknown) {
      console.error("Email verification failed:", err)
      if (isClerkError(err)) {
        setError(err.errors[0]?.message ?? "Verification failed.")
      } else {
        setError("An unexpected error occurred.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showVerification) {
    return (
      <main className="starfield flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="hud-panel rounded-sm">
            <div className="hud-panel-header">Verify Email</div>
            <div className="p-6 space-y-4">
              <p className="font-mono text-xs text-(--hud-text-dim) uppercase tracking-wide">
                A verification code has been sent to your email address.
              </p>

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
                  {isSubmitting ? "Verifying…" : "◯ Confirm Identity"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="starfield flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-mono text-2xl font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </h1>
          <p className="mt-1 font-mono text-xs tracking-wider text-(--hud-text-dim) uppercase">
            Create Your Account
          </p>
        </div>

        <div className="hud-panel rounded-sm">
          <div className="hud-panel-header">Register</div>
          <div className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
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
                <Input
                  type="password"
                  placeholder="Password"
                  autoComplete="new-password"
                  className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="mt-1 font-mono text-xs text-(--hud-error)">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    placeholder="First name"
                    autoComplete="given-name"
                    className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                    {...form.register("firstName")}
                  />
                  {form.formState.errors.firstName && (
                    <p className="mt-1 font-mono text-xs text-(--hud-error)">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                    {...form.register("lastName")}
                  />
                  {form.formState.errors.lastName && (
                    <p className="mt-1 font-mono text-xs text-(--hud-error)">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Input
                  placeholder="Username"
                  autoComplete="username"
                  className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                  {...form.register("username")}
                />
                {form.formState.errors.username && (
                  <p className="mt-1 font-mono text-xs text-(--hud-error)">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim) block mb-1">
                  Date of Birth
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="bg-(--hud-surface-2) border border-(--hud-border) text-(--hud-text) font-mono text-xs px-2 py-2 focus:outline-none focus:border-(--hud-accent)"
                    {...form.register("birthMonth")}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Day"
                    type="number"
                    min={1}
                    max={31}
                    className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                    {...form.register("birthDay")}
                  />
                  <Input
                    placeholder="Year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    className="bg-(--hud-surface-2) border-(--hud-border) text-(--hud-text) font-mono placeholder:text-(--hud-text-dim) focus-visible:ring-(--hud-accent)"
                    {...form.register("birthYear")}
                  />
                </div>
                {(form.formState.errors.birthMonth ||
                  form.formState.errors.birthDay ||
                  form.formState.errors.birthYear) && (
                  <p className="mt-1 font-mono text-xs text-(--hud-error)">
                    Please enter a valid date of birth.
                  </p>
                )}
              </div>

              {error && <p className="font-mono text-xs text-(--hud-error)">{error}</p>}

              <div id="clerk-captcha" />

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full border border-(--hud-accent) py-2.5 font-mono text-xs uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Registering…" : "◯ Create Account"}
              </button>

              <p className="text-center font-mono text-xs text-(--hud-text-dim)">
                Already have an account?{" "}
                <Link href="/" className="text-(--hud-accent) hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
export default SignUpForm
