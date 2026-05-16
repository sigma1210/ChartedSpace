"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectSectorData, selectSectorLoadStatus } from "../../store/selectors/galaxy.selectors";
import { openSystemDetail } from "../../store/slices/uiSlice";
import HexGrid from "./HexGrid";
import type { World } from "../../types";

interface SectorGridProps {
  abbr: string;
}

const toHexWorld = (w: World) => ({
  id: w.hex,
  hex: w.hex,
  hexX: w.hexX,
  hexY: w.hexY,
  name: w.name,
  starport: w.uwp.starport,
  techLevel: w.uwp.techLevel,
  travelZone: w.travelZone || null,
  allegiance: w.allegiance || null,
})

const SectorGrid = ({ abbr }: SectorGridProps) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSectorLoadStatus(abbr));
  const sector = useAppSelector(selectSectorData(abbr));

  useEffect(() => {
    dispatch(loadSector(abbr));
  }, [abbr, dispatch]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="animate-pulse font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
          Loading {abbr}…
        </p>
      </div>
    );
  }

  if (status === "error" || !sector) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-(--hud-error)">
          Failed to load sector {abbr}
        </p>
      </div>
    );
  }

  const worlds = sector.worlds.map(toHexWorld);

  return (
    <div className="flex flex-col gap-2">
      <div className="hud-panel-header">
        ◈ {sector.sector}
      </div>
      <HexGrid
        worlds={worlds}
        cols={32}
        rows={40}
        onSelectWorld={(id) => dispatch(openSystemDetail(id))}
      />
    </div>
  );
}
export default SectorGrid
