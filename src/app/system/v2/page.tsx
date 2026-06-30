import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import SystemV2PageClient from "./SystemV2PageClient";

const SystemV2Page = () => (
  <>
    <SystemV2PageClient />
    <SystemDetailModal />
    <CharacterGenerationModal />
  </>
);

export default SystemV2Page;
