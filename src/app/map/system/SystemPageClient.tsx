"use client";

import "@/lib/turns/index";
import StarSystemView from "../../../components/world/StarSystemView";
import { WarpSceneLifecycle } from "../../../components/world/WarpSceneLifecycle";
import { SystemLocationLifecycle } from "../../../components/world/SystemLocationLifecycle";

const CurrentSystemPageClient = () => {
  return (
    <div className="starfield h-screen w-screen overflow-hidden">
      <WarpSceneLifecycle />
      <SystemLocationLifecycle />
      <StarSystemView />
    </div>
  );
};

export default CurrentSystemPageClient;
