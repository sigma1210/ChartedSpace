"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectSectorData, selectSectorLoadStatus } from "../../store/selectors/galaxy.selectors";
import { openSystemDetail } from "../../store/slices/uiSlice";
import { setActiveWorldHex } from "../../store/slices/galaxySlice";
import { selectActiveWorldHex } from "../../store/selectors/galaxy.selectors";
import HexGrid from "./HexGrid";

interface SubsectorGridProps {
  sectorAbbr: string;
  subsectorKey: string;
  showHeader?: boolean;
}

const KEYS = "ABCDEFGHIJKLMNOP";

const getSubsectorBounds = (key: string) => {
  const index = KEYS.indexOf(key.toUpperCase());
  if (index === -1) return null;
  const subCol = index % 4;
  const subRow = Math.floor(index / 4);
  return {
    hexXStart: subCol * 8 + 1,
    hexXEnd: (subCol + 1) * 8,
    hexYStart: subRow * 10 + 1,
    hexYEnd: (subRow + 1) * 10,
  };
};

const SubsectorGrid = ({ sectorAbbr, subsectorKey, showHeader = true }: SubsectorGridProps) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSectorLoadStatus(sectorAbbr));
  const sector = useAppSelector(selectSectorData(sectorAbbr));
  const activeWorldHex = useAppSelector(selectActiveWorldHex);

  useEffect(() => {
    dispatch(loadSector(sectorAbbr));
  }, [sectorAbbr, dispatch]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="animate-pulse font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
          Loading {sectorAbbr}…
        </p>
      </div>
    );
  }

  if (status === "error" || !sector) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-(--hud-error)">
          Failed to load sector {sectorAbbr}
        </p>
      </div>
    );
  }

  const key = subsectorKey.toUpperCase();
  const bounds = getSubsectorBounds(key);

  if (!bounds) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-(--hud-error)">
          Invalid subsector key: {subsectorKey}
        </p>
      </div>
    );
  }

  const subsectorName = sector.subsectors[key] ?? key;
  const { hexXStart, hexXEnd, hexYStart, hexYEnd } = bounds;

  const worlds = sector.worlds
    .filter((w) => w.hexX >= hexXStart && w.hexX <= hexXEnd && w.hexY >= hexYStart && w.hexY <= hexYEnd)
    .map((w) => ({
      id: w.hex,
      hex: w.hex,
      hexX: w.hexX - hexXStart + 1,
      hexY: w.hexY - hexYStart + 1,
      name: w.name,
      starport: w.uwp.starport,
      techLevel: w.uwp.techLevel,
      travelZone: w.travelZone || null,
      allegiance: w.allegiance || null,
    }));

  return (
    <div className="flex flex-col gap-2">
      {showHeader && (
        <div className="hud-panel-header">
          ◈ {sector.sector} · {subsectorName} · Subsector {key}
        </div>
      )}
      <HexGrid
        worlds={worlds}
        cols={8}
        rows={10}
        selectedWorldId={activeWorldHex ?? undefined}
        onSelectWorld={(id) => {
          dispatch(setActiveWorldHex(id));
          dispatch(openSystemDetail(id));
        }}
      />
    </div>
  );
};
export default SubsectorGrid;
