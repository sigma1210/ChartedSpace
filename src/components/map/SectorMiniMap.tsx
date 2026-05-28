"use client";

import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
  selectSectorData,
} from "../../store/selectors/galaxy.selectors";
import { setActiveSubsector } from "../../store/slices/galaxySlice";
import { toggleSectorMiniMap } from "../../store/slices/uiSlice";
import StarField from "./StarField";

const TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] } as const;

const SectorMiniMap = () => {
  const dispatch         = useAppDispatch();
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeKey        = useAppSelector(selectActiveSubsectorKey);
  const sector           = useAppSelector(selectSectorData(activeSectorAbbr));
  const visible          = useAppSelector(s => s.ui.showSectorMiniMap);

  return (
    <motion.div
      layout
      animate={{ maxWidth: visible ? 1000 : 32 }}
      transition={TRANSITION}
      className="shrink-0 overflow-hidden flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        {visible && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim) whitespace-nowrap">
            {sector?.sector ?? activeSectorAbbr}
          </span>
        )}
        <button
          onClick={() => dispatch(toggleSectorMiniMap())}
          className="font-mono text-[9px] text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          title={visible ? "Hide sector map" : "Show sector map"}
        >
          {visible ? "✕" : "◈"}
        </button>
      </div>

      <motion.div
        initial={false}
        animate={visible ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={TRANSITION}
        style={{ overflow: "hidden" }}
      >
        <div className="flex flex-col gap-2">
          <StarField
            sectorAbbr={activeSectorAbbr}
            activeKey={activeKey}
            onSelectKey={key => dispatch(setActiveSubsector(key))}
          />
          <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-accent)">
            {sector?.subsectors[activeKey] ?? activeKey}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SectorMiniMap;
