import SystemDetailModal from "@/components/modals/SystemDetailModal";
import CharacterGenerationModal from "@/plugins/characters/CharacterGenerationModal";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <SystemPageClient />
      <SystemDetailModal />
      <CharacterGenerationModal />
    </>
  );
};

export default SystemPage;
