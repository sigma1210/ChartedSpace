import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import CharacterCombatModal from "@/plugins/characterCombat/CharacterCombatModal";
import MaydayModal from "@/plugins/mayday/MaydayModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import EquipmentCatalogModal from "@/plugins/equipmentCatalog/EquipmentCatalogModal";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <SystemPageClient />
      <SystemDetailModal />
      <CharacterGenerationModal />
      <CharacterCombatModal />
      <ShipCrewAssignmentModal />
      <EquipmentCatalogModal />
      <MaydayModal />
    </>
  );
};

export default SystemPage;
