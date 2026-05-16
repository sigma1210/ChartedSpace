import DevLogoutButton from "./DevLogoutButton"

const isDevMode = process.env.DEV_MODE === "true"

const MapPage = () => {
  return (
    <div className="starfield flex min-h-screen flex-col">
      <header className="border-b border-(--hud-border) bg-(--hud-bg)/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="font-mono text-sm font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </span>
          {isDevMode && <DevLogoutButton />}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <div className="hud-panel w-full max-w-md rounded-sm">
          <div className="hud-panel-header">◈ Charted Space</div>
          <div className="p-8 text-center space-y-2">
            <p className="font-mono text-sm text-(--hud-text) uppercase tracking-widest">
              Authentication Successful
            </p>
            <p className="font-mono text-xs text-(--hud-text-dim) uppercase tracking-wider">
              Map SPA — coming soon
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
export default MapPage
