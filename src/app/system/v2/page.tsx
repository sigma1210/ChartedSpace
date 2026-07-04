import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import SystemV2PageClient from "./SystemV2PageClient";

const SystemV2Page = () => (
  <>
    <SystemV2PageClient />
    <SystemDetailModal />
    <CharacterGenerationModal />
    <ShipCrewAssignmentModal />
  </>
);

export default SystemV2Page;
