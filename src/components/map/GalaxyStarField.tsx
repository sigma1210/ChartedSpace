"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectSectorData, selectActiveWorldHex, selectActiveWorldSectorAbbr } from "../../store/selectors/galaxy.selectors";

import { hexSvgWidth, hexSvgHeight, hexCenter } from "./hexGeometry";

const COLS = 32;
const ROWS = 40;

const SVG_W = hexSvgWidth(COLS);
const SVG_H = hexSvgHeight(ROWS);

const GalaxyStarField = ({ sectorAbbr }: { sectorAbbr: string }) => {
  const dispatch = useAppDispatch();
  const sector = useAppSelector(selectSectorData(sectorAbbr));
  const activeWorldHex = useAppSelector(selectActiveWorldHex);
  const activeWorldSectorAbbr = useAppSelector(selectActiveWorldSectorAbbr);

  useEffect(() => {
    dispatch(loadSector(sectorAbbr));
  }, [sectorAbbr, dispatch]);

  if (!sector) return null;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {sector.worlds.map((w) => {
        const { cx, cy } = hexCenter(w.hexX, w.hexY);
        const isSelected = w.hex === activeWorldHex && sectorAbbr === activeWorldSectorAbbr;
        return (
          <circle
            key={w.hex}
            cx={cx}
            cy={cy}
            r={isSelected ? 20 : 5}
            fill={isSelected ? "var(--hud-error)" : "white"}
          />
        );
      })}
    </svg>
  );
};
export default GalaxyStarField;
