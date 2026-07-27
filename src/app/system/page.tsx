import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import CharacterCombatModal from "@/plugins/characterCombat/CharacterCombatModal";
import MaydayModal from "@/plugins/mayday/MaydayModal";
import ShipCrewAssignmentModal from "@/plugins/ship/ShipCrewAssignmentModal";
import EquipmentCatalogModal from "@/plugins/equipmentCatalog/EquipmentCatalogModal";
import BillyBobsCatalogModal from "@/plugins/equipmentCatalog/BillyBobsCatalogModal";
import StarshipSupplyCatalogModal from "@/plugins/equipmentCatalog/StarshipSupplyCatalogModal";
import CharacterStartLifecycle from "./CharacterStartLifecycle";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <CharacterStartLifecycle />
      <SystemPageClient />
      <SystemDetailModal />
      <CharacterGenerationModal />
      <CharacterCombatModal />
      <ShipCrewAssignmentModal />
      <EquipmentCatalogModal />
      <BillyBobsCatalogModal />
      <StarshipSupplyCatalogModal />
      <MaydayModal />
    </>
  );
};

export default SystemPage;
