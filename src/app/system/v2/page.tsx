import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import MaydayModal from "@/plugins/mayday/MaydayModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import SystemV2PageClient from "./SystemV2PageClient";

const SystemV2Page = () => (
  <>
    <SystemV2PageClient />
    <SystemDetailModal />
    <CharacterGenerationModal />
    <ShipCrewAssignmentModal />
    <MaydayModal />
  </>
);

export default SystemV2Page;
