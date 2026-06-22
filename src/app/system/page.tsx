import SystemDetailModal from "@/components/modals/SystemDetailModal";
import SystemPageClient from "./SystemPageClient";

const SystemPage = () => {
  return (
    <>
      <SystemPageClient />
      <SystemDetailModal />
    </>
  );
};

export default SystemPage;
