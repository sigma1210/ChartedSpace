import CurrentSystemPageClient from "./SystemPageClient";
import SystemDetailModal from "../../../components/modals/SystemDetailModal";

const CurrentSystemPage = () => {
  return (
    <>
      <CurrentSystemPageClient />
      <SystemDetailModal />
    </>
  );
};

export default CurrentSystemPage;
