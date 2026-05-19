"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
  selectSectorData,
} from "../../store/selectors/galaxy.selectors";
import { setActiveSubsector } from "../../store/slices/galaxySlice";
import StarField from "./StarField";

const SectorMiniMap = () => {
  const dispatch         = useAppDispatch();
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeKey        = useAppSelector(selectActiveSubsectorKey);
  const sector           = useAppSelector(selectSectorData(activeSectorAbbr));

  return (
    <div className="flex flex-col gap-2 shrink-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
        {sector?.sector ?? activeSectorAbbr}
      </span>
      <StarField
        sectorAbbr={activeSectorAbbr}
        activeKey={activeKey}
        onSelectKey={key => dispatch(setActiveSubsector(key))}
      />
      <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-accent)">
        {sector?.subsectors[activeKey] ?? activeKey}
      </span>
    </div>
  );
};

export default SectorMiniMap;
