"use client";

import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAllSectors, selectActiveSectorAbbr } from "../../store/selectors/galaxy.selectors";
import { setActiveSector } from "../../store/slices/galaxySlice";
import { toggleGalaxyMiniMap } from "../../store/slices/uiSlice";
import type { SectorMeta } from "../../types";
import GalaxyStarField from "./GalaxyStarField";

const COORD_MIN = -4;
const GRID_SIZE = 9;
const TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] } as const;

const sectorLabel = (s: SectorMeta) => s.Names[0]?.Text ?? s.Abbreviation;

const GalaxyMiniMap = () => {
  const dispatch         = useAppDispatch();
  const allSectors       = useAppSelector(selectAllSectors);
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const visible          = useAppSelector(s => s.ui.showGalaxyMiniMap);

  const sectorByCoord = new Map(allSectors.map(s => [`${s.X},${s.Y}`, s]));

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
            Charted Space
          </span>
        )}
        <button
          onClick={() => dispatch(toggleGalaxyMiniMap())}
          className="font-mono text-[9px] text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          title={visible ? "Hide galaxy map" : "Show galaxy map"}
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
        <div
          className="grid gap-px bg-(--hud-border-subtle)"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, max-content)` }}
        >
          {Array.from({ length: GRID_SIZE }, (_, rowIdx) =>
            Array.from({ length: GRID_SIZE }, (_, colIdx) => {
              const gx = COORD_MIN + colIdx;
              const gy = COORD_MIN + rowIdx;
              const s  = sectorByCoord.get(`${gx},${gy}`);
              const isActive = s?.Abbreviation === activeSectorAbbr;

              return (
                <button
                  key={`${gx},${gy}`}
                  title={s ? sectorLabel(s) : ""}
                  disabled={!s}
                  onClick={() => s && dispatch(setActiveSector(s.Abbreviation))}
                  className={[
                    "relative overflow-hidden w-8.25 aspect-258/372 transition-colors",
                    s
                      ? isActive
                        ? "bg-(--hud-accent)/8 border border-(--hud-accent)"
                        : "bg-(--hud-surface) border border-transparent hover:border-(--hud-border) cursor-pointer"
                      : "bg-(--hud-bg) border border-transparent cursor-default",
                  ].join(" ")}
                >
                  {s && <GalaxyStarField sectorAbbr={s.Abbreviation} />}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GalaxyMiniMap;
