import DevLogoutButton from "./DevLogoutButton";
import MapInitializer from "./MapInitializer";
import CreateCharacterButton from "./CreateCharacterButton";
import CharacterListButton from "./CharacterListButton";
import CharacterAvatar from "./CharacterAvatar";
import ResignButton from "./ResignButton";
import CharacterCreateModal from "./CharacterCreateModal";
import CharacterListModal from "../../components/modals/CharacterListModal";
import CharacterProfileModal from "../../components/modals/CharacterProfileModal";
import JumpRangeModal from "../../components/modals/JumpRangeModal";
import CrewManagementModal from "../../components/modals/CrewManagementModal";
import WorldDetailModal from "./WorldDetailModal";
import GalaxyMiniMap from "../../components/map/GalaxyMiniMap";
import SectorMiniMap from "../../components/map/SectorMiniMap";
import SubsectorMiniMap from "../../components/map/SubsectorMiniMap";
import TradeValuesCard from "../../components/map/TradeValuesCard";
import ShipCard from "../../components/map/ShipCard";
import TurnCard from "../../components/map/TurnCard";

const isDevMode = process.env.DEV_MODE === "true";

const MapPage = () => {
  return (
    <div className="starfield flex min-h-screen flex-col">
      <header className="border-b border-(--hud-border) bg-(--hud-bg)/80 backdrop-blur-sm">
        <div className="flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold tracking-widest text-(--hud-text) uppercase">
              ◈ Charted Space
            </span>
            <CharacterAvatar />
          </div>
          <div className="flex items-center gap-3">
            <ResignButton />
            <CharacterListButton />
            <CreateCharacterButton />
            {isDevMode && <DevLogoutButton />}
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-auto p-4">
        <MapInitializer />
        <div className="flex gap-4 items-start">
          <GalaxyMiniMap />
          <SectorMiniMap />
          <SubsectorMiniMap />
          <div className="flex flex-col gap-2">
            <TradeValuesCard />
            <ShipCard />
            <TurnCard />
          </div>
        </div>
      </main>

      <WorldDetailModal />
      <CharacterCreateModal />
      <CharacterListModal />
      <CharacterProfileModal />
      <JumpRangeModal />
      <CrewManagementModal />
    </div>
  );
};

export default MapPage;
