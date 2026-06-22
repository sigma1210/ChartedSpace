import Link from "next/link";
import DevLogoutButton from "./DevLogoutButton";
import MapInitializer from "./MapInitializer";
import CurrentWorldMapPanel from "./CurrentWorldMapPanel";

const isDevMode = process.env.DEV_MODE === "true";

const MapPage = () => {
  return (
    <div className="starfield flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b border-(--hud-border) bg-(--hud-bg)/80 backdrop-blur-sm">
        <div className="flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold tracking-widest text-(--hud-text) uppercase">
              ◈ Charted Space
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/system"
              className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 border border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors"
            >
              System
            </Link>
            {isDevMode && <DevLogoutButton />}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-hidden p-4">
        <MapInitializer />
        <CurrentWorldMapPanel />
      </main>
    </div>
  );
};

export default MapPage;
