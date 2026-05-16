const VerifyLoading = () => {
  return (
    <main className="starfield flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <p className="font-mono text-sm uppercase tracking-widest text-(--hud-text) animate-pulse">
        Authenticating…
      </p>
      <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
        Please wait while we securely sign you in.
      </p>
    </main>
  )
}
export default VerifyLoading
