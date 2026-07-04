import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <SystemPageClient />
      <SystemDetailModal />
      <CharacterGenerationModal />
      <ShipCrewAssignmentModal />
    </>
  );
};

export default SystemPage;
