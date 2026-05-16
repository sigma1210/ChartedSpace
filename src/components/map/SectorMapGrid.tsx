"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectSectorData, selectSectorLoadStatus } from "../../store/selectors/galaxy.selectors";
import { openSystemDetail } from "../../store/slices/uiSlice";
import HexGrid from "./HexGrid";
import type { World } from "../../types";

interface SectorMapGridProps {
  sectorAbbr: string;
}

const KEYS = "ABCDEFGHIJKLMNOP";

const subsectorBounds = (key: string) => {
  const index = KEYS.indexOf(key);
  const subCol = index % 4;
  const subRow = Math.floor(index / 4);
  return {
    hexXStart: subCol * 8 + 1,
    hexXEnd: (subCol + 1) * 8,
    hexYStart: subRow * 10 + 1,
    hexYEnd: (subRow + 1) * 10,
  };
};

const toHexWorlds = (worlds: World[], hexXStart: number, hexYStart: number) =>
  worlds
    .filter(
      (w) =>
        w.hexX >= hexXStart &&
        w.hexX <= hexXStart + 7 &&
        w.hexY >= hexYStart &&
        w.hexY <= hexYStart + 9
    )
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

const SectorMapGrid = ({ sectorAbbr }: SectorMapGridProps) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectSectorLoadStatus(sectorAbbr));
  const sector = useAppSelector(selectSectorData(sectorAbbr));

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

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-auto">
        <div
          className="grid gap-px bg-(--hud-border-subtle) w-fit"
          style={{ gridTemplateColumns: "repeat(4, max-content)" }}
        >
          {KEYS.split("").map((key) => {
            const { hexXStart, hexYStart } = subsectorBounds(key);
            const worlds = toHexWorlds(sector.worlds, hexXStart, hexYStart);

            return (
              <HexGrid
                key={key}
                worlds={worlds}
                cols={8}
                rows={10}
                scale={0.5 / 1.2}
                onSelectWorld={(id) => dispatch(openSystemDetail(id))}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default SectorMapGrid;
