"use client";

import { useAppSelector } from "../../store/hooks";
import {
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
  selectSectorData,
  selectActiveWorldName,
} from "../../store/selectors/galaxy.selectors";

const Sep = () => <span className="mx-1.5 text-(--hud-border)">›</span>;

const MapBreadcrumb = () => {
  const sectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const subsectorKey = useAppSelector(selectActiveSubsectorKey);
  const sector = useAppSelector(selectSectorData(sectorAbbr));
  const worldName = useAppSelector(selectActiveWorldName);

  const sectorName = sector?.sector ?? sectorAbbr;
  const subsectorName = sector?.subsectors[subsectorKey] ?? subsectorKey;

  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
      {sectorName}
      <Sep />
      {subsectorName}
      {worldName && (
        <>
          <Sep />
          <span className="text-(--hud-text)">{worldName}</span>
        </>
      )}
    </span>
  );
};
export default MapBreadcrumb;
