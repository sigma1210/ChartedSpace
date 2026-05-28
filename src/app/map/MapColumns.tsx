"use client";

import { motion } from "framer-motion";
import GalaxyMiniMap from "../../components/map/GalaxyMiniMap";
import SectorMiniMap from "../../components/map/SectorMiniMap";
import SubsectorMiniMap from "../../components/map/SubsectorMiniMap";
import TradeValuesCard from "../../components/map/TradeValuesCard";
import ShipCard from "../../components/map/ShipCard";
import TurnCard from "../../components/map/TurnCard";
import FreeTraderDeckPlan from "../../components/ship/FreeTraderDeckPlan";

const TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] } as const;

const MapColumns = () => (
  <div className="flex gap-4 items-start">
    <motion.div layout transition={TRANSITION} className="hud-panel shrink-0 p-2">
      <FreeTraderDeckPlan />
    </motion.div>
    <GalaxyMiniMap />
    <SectorMiniMap />
    <SubsectorMiniMap />
    <motion.div layout transition={TRANSITION} className="flex flex-col gap-2">
      <TradeValuesCard />
      <ShipCard />
      <TurnCard />
    </motion.div>
  </div>
);

export default MapColumns;
