const RootLoading = () => {
  return (
    <main className="starfield flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="mb-8 text-center space-y-2">
          <div className="h-8 w-48 mx-auto bg-(--hud-surface-2) border border-(--hud-border) rounded-sm animate-pulse" />
          <div className="h-4 w-64 mx-auto bg-(--hud-surface-2) border border-(--hud-border) rounded-sm animate-pulse" />
        </div>

        <div className="hud-panel rounded-sm">
          <div className="hud-panel-header">Establishing Connection…</div>
          <div className="p-6 space-y-3">
            <div className="h-10 w-full bg-(--hud-surface-2) border border-(--hud-border) rounded-sm animate-pulse" />
            <div className="h-10 w-full bg-(--hud-surface-2) border border-(--hud-border) rounded-sm animate-pulse" />

            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-(--hud-text-dim)">
                <div className="flex-1 h-px bg-(--hud-border)" />
                <span className="font-mono text-xs uppercase tracking-widest">External Handshake</span>
                <div className="flex-1 h-px bg-(--hud-border)" />
              </div>

              {["Login with Google", "Login with Github", "Login with Discord"].map((label) => (
                <div
                  key={label}
                  className="h-10 w-full bg-(--hud-surface-2) border border-(--hud-border) rounded-sm animate-pulse flex items-center px-4"
                >
                  <span className="font-mono text-xs uppercase tracking-wider text-(--hud-text-dim)">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
export default RootLoading
