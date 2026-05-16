import DevLogoutButton from "./DevLogoutButton"
import SubsectorNavigator from "../../components/map/SubsectorNavigator"

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

      <main className="flex flex-1 flex-col overflow-auto p-4">
        <SubsectorNavigator sectorAbbr="Spin" initialSubsectorKey="J" />
      </main>
    </div>
  )
}
export default MapPage
