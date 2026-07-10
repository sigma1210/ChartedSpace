import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import MaydayModal from "@/plugins/mayday/MaydayModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <SystemPageClient />
      <SystemDetailModal />
      <CharacterGenerationModal />
      <ShipCrewAssignmentModal />
      <MaydayModal />
    </>
  );
};

export default SystemPage;
