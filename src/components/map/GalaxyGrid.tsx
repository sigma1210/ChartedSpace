"use client";

import { useAppDispatch } from "../../store/hooks";
import { setActiveSector } from "../../store/slices/uiSlice";

interface SectorTile {
  abbreviation: string;
  name: string;
  gridX: number;
  gridY: number;
  hasCharacter?: boolean;
}

interface GalaxyGridProps {
  sectors: SectorTile[];
  activeSectorAbbr: string | null;
}

export default function GalaxyGrid({ sectors, activeSectorAbbr }: GalaxyGridProps) {
  const dispatch = useAppDispatch();

  // Build a lookup map keyed by "x,y" for quick positioning
  const sectorMap = new Map(sectors.map((s) => [`${s.gridX},${s.gridY}`, s]));

  const COLS = 9;
  const ROWS = 9;
  const MIN = -4;

  return (
    <div className="p-3">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: ROWS }, (_, rowIdx) =>
          Array.from({ length: COLS }, (_, colIdx) => {
            const gx = MIN + colIdx;
            const gy = MIN + rowIdx;
            const sector = sectorMap.get(`${gx},${gy}`);
            const isActive = sector?.abbreviation === activeSectorAbbr;
            const isCore = gx === 0 && gy === 0;

            if (!sector) {
              return (
                <div
                  key={`${gx},${gy}`}
                  className="flex h-10 items-center justify-center border border-(--hud-border-subtle) bg-(--hud-surface)"
                >
                  <span className="text-[8px] text-(--hud-border) font-mono">·</span>
                </div>
              );
            }

            return (
              <button
                key={sector.abbreviation}
                onClick={() => dispatch(setActiveSector(sector.abbreviation))}
                title={sector.name}
                className={[
                  "relative flex h-10 flex-col items-center justify-center border px-1 transition-colors",
                  isActive
                    ? "border-(--hud-accent) bg-(--hud-surface-2) text-(--hud-text)"
                    : isCore
                    ? "border-(--hud-accent)/50 bg-(--hud-surface-2) text-(--hud-text)"
                    : "border-(--hud-border-subtle) bg-(--hud-surface) text-(--hud-text-dim) hover:border-(--hud-border) hover:text-(--hud-text)",
                ].join(" ")}
              >
                <span className="font-mono text-[9px] leading-none">{sector.abbreviation}</span>
                {sector.hasCharacter && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-(--hud-accent)" />
                )}
              </button>
            );
          })
        )}
      </div>
      <p className="mt-2 text-center text-[10px] text-(--hud-text-dim) uppercase tracking-wider">
        Click a sector to view its systems
      </p>
    </div>
  );
}
