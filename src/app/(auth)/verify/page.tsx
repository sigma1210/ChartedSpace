import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

const VerifyPage = () => {
  return (
    <main className="starfield flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <p className="font-mono text-sm uppercase tracking-widest text-(--hud-text) animate-pulse">
        Authenticating…
      </p>
      <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
        Establishing secure session.
      </p>
      <div id="clerk-captcha" />
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/map"
        signUpFallbackRedirectUrl="/map"
      />
    </main>
  )
}
export default VerifyPage
