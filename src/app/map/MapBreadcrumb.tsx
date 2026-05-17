"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
  selectSectorData,
  selectActiveWorldName,
  selectActiveWorldHex,
  selectActiveWorldCost,
  selectActiveWorldLocation,
  selectTargetWorldName,
  selectTargetWorldLocation,
  selectExpectedSalePrice,
} from "../../store/selectors/galaxy.selectors";
import { openSystemDetail } from "../../store/slices/uiSlice";
import CreditsBadge from "../../components/ui/CreditsBadge";

const Sep = () => <span className="mx-1.5 text-(--hud-border)">›</span>;

const MapBreadcrumb = () => {
  const dispatch = useAppDispatch();

  // Map navigation — shown only when no active world is set
  const mapSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const mapSubsectorKey = useAppSelector(selectActiveSubsectorKey);
  const mapSector = useAppSelector(selectSectorData(mapSectorAbbr));
  const mapSectorName = mapSector?.sector ?? mapSectorAbbr;
  const mapSubsectorName = mapSector?.subsectors[mapSubsectorKey] ?? mapSubsectorKey;

  // Active world
  const activeWorldHex = useAppSelector(selectActiveWorldHex);
  const activeWorldName = useAppSelector(selectActiveWorldName);
  const activeWorldCost = useAppSelector(selectActiveWorldCost);
  const activeWorldLocation = useAppSelector(selectActiveWorldLocation);

  // Target world (hover)
  const targetWorldName = useAppSelector(selectTargetWorldName);
  const expectedSalePrice = useAppSelector(selectExpectedSalePrice);
  const targetWorldLocation = useAppSelector(selectTargetWorldLocation);

  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) flex items-center">
      {activeWorldLocation ? (
        <>
          {activeWorldLocation.sectorName}
          <Sep />
          {activeWorldLocation.subsectorName}
          <Sep />
          <button
            onClick={() => activeWorldHex && dispatch(openSystemDetail(activeWorldHex))}
            className="text-(--hud-text) hover:text-white transition-colors cursor-pointer"
          >
            {activeWorldName}
          </button>
          {activeWorldCost !== null && (
            <>
              <Sep />
              <CreditsBadge amount={activeWorldCost} />
            </>
          )}
        </>
      ) : (
        <>
          {mapSectorName}
          <Sep />
          {mapSubsectorName}
        </>
      )}
      {targetWorldLocation && targetWorldName && (
        <>
          <Sep />
          <span className="text-(--hud-text-dim)">→</span>
          <Sep />
          {targetWorldLocation.sectorName}
          <Sep />
          {targetWorldLocation.subsectorName}
          <Sep />
          <span className="text-(--hud-text)">{targetWorldName}</span>
          <Sep />
          <CreditsBadge amount={expectedSalePrice ?? 0} />
        </>
      )}
    </span>
  );
};
export default MapBreadcrumb;
