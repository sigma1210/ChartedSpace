import DevLogoutButton from "./DevLogoutButton";
import SubsectorNavigator from "../../components/map/SubsectorNavigator";
import MapBreadcrumb from "./MapBreadcrumb";
import WorldDetailModal from "./WorldDetailModal";
import CharacterCreateModal from "./CharacterCreateModal";
import CreateCharacterButton from "./CreateCharacterButton";

const isDevMode = process.env.DEV_MODE === "true";

const MapPage = () => {
  return (
    <div className="starfield flex min-h-screen flex-col">
      <header className="border-b border-(--hud-border) bg-(--hud-bg)/80 backdrop-blur-sm">
        <div className=" flex max-w-7xl items-center justify-between px-6 py-3">
          <span className="font-mono text-sm font-bold tracking-widest text-(--hud-text) uppercase">
            ◈ Charted Space
          </span>
          <MapBreadcrumb />
          <div className="flex items-center gap-3">
            <CreateCharacterButton />
            {isDevMode && <DevLogoutButton />}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-auto p-4">
        <SubsectorNavigator />
      </main>
      <WorldDetailModal />
      <CharacterCreateModal />
    </div>
  );
};
export default MapPage;
