import StoreProvider from "../../../components/StoreProvider";
import CockpitView from "../../../components/cockpit/CockpitView";
import BottomNav from "../../../components/hud/BottomNav";
import ModalLayer from "../../../components/modals/ModalLayer";

export default function AppPage() {
  return (
    <StoreProvider>
      <div className="relative flex h-full flex-col overflow-hidden bg-(--hud-bg)">
        <div className="relative flex-1 overflow-hidden">
          <CockpitView />
          <ModalLayer />
        </div>
        <BottomNav />
      </div>
    </StoreProvider>
  );
}
