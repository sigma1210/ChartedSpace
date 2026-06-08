"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectAllSectors, selectActiveSectorAbbr, selectWorldDotStyle } from "../../store/selectors/galaxy.selectors";
import { loadSector, setActiveSector } from "../../store/slices/galaxySlice";
import { toggleGalaxyMiniMap } from "../../store/slices/uiSlice";
import type { MapMode, SectorDetail, SectorMeta, WorldCoord, WorldDotStyle } from "../../types";
import { GalaxyStarFieldView } from "./GalaxyStarField";

const COORD_MIN = -4;
const GRID_SIZE = 9;
const TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] } as const;

const sectorLabel = (s: SectorMeta) => s.Names[0]?.Text ?? s.Abbreviation;

export const GalaxyMiniMapView = ({
  visible,
  allSectors,
  activeSectorAbbr,
  sectorData,
  getStyle,
  scale = 1,
  onToggle,
  onSelectSector,
}: {
  visible: boolean;
  allSectors: SectorMeta[];
  activeSectorAbbr: string;
  sectorData: Record<string, SectorDetail | undefined>;
  getStyle: (coord: WorldCoord, mode: MapMode) => WorldDotStyle;
  scale?: number;
  onToggle?: () => void;
  onSelectSector: (sectorAbbr: string) => void;
}) => {
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
        {onToggle && (
          <button
            onClick={onToggle}
            className="font-mono text-[9px] text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
            title={visible ? "Hide galaxy map" : "Show galaxy map"}
          >
            {visible ? "✕" : "◈"}
          </button>
        )}
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
                  onClick={() => s && onSelectSector(s.Abbreviation)}
                  className={[
                    "relative aspect-258/372 overflow-hidden transition-colors",
                    s
                      ? isActive
                        ? "bg-(--hud-accent)/8 border border-(--hud-accent)"
                        : "bg-(--hud-surface) border border-transparent hover:border-(--hud-border) cursor-pointer"
                      : "bg-(--hud-bg) border border-transparent cursor-default",
                  ].join(" ")}
                  style={{ width: `${2.0625 * scale}rem` }}
                >
                  {s && (
                    <GalaxyStarFieldView
                      sectorAbbr={s.Abbreviation}
                      sector={sectorData[s.Abbreviation]}
                      getStyle={getStyle}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const GalaxyMiniMap = () => {
  const dispatch = useAppDispatch();
  const allSectors = useAppSelector(selectAllSectors);
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const visible = useAppSelector(s => s.ui.showGalaxyMiniMap);
  const sectorData = useAppSelector(s => s.galaxy.sectorData);
  const getStyle = useAppSelector(selectWorldDotStyle);

  return (
    <GalaxyMiniMapView
      visible={visible}
      allSectors={allSectors}
      activeSectorAbbr={activeSectorAbbr}
      sectorData={sectorData}
      getStyle={getStyle}
      onToggle={() => dispatch(toggleGalaxyMiniMap())}
      onSelectSector={(sectorAbbr) => dispatch(setActiveSector(sectorAbbr))}
    />
  );
};

export const GalaxyMiniMapHudContent = () => {
  const dispatch = useAppDispatch();
  const allSectors = useAppSelector(selectAllSectors);
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const sectorData = useAppSelector(s => s.galaxy.sectorData);
  const loadingStatus = useAppSelector(s => s.galaxy.loadingStatus);
  const getStyle = useAppSelector(selectWorldDotStyle);

  useEffect(() => {
    for (const sector of allSectors) {
      const status = loadingStatus[sector.Abbreviation];
      if (status === "loaded" || status === "loading") continue;
      dispatch(loadSector(sector.Abbreviation));
    }
  }, [allSectors, dispatch, loadingStatus]);

  return (
    <GalaxyMiniMapView
      visible
      allSectors={allSectors}
      activeSectorAbbr={activeSectorAbbr}
      sectorData={sectorData}
      getStyle={getStyle}
      scale={0.5}
      onSelectSector={(sectorAbbr) => dispatch(setActiveSector(sectorAbbr))}
    />
  );
};

export default GalaxyMiniMap;
