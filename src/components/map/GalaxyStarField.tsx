"use client";

import type { MapMode, SectorDetail, WorldCoord, WorldDotStyle } from "../../types";

import { hexSvgWidth, hexSvgHeight, hexCenter } from "./hexGeometry";

const COLS = 32;
const ROWS = 40;

const SVG_W = hexSvgWidth(COLS);
const SVG_H = hexSvgHeight(ROWS);

export const GalaxyStarFieldView = ({
  sectorAbbr,
  sector,
  getStyle,
}: {
  sectorAbbr: string;
  sector: SectorDetail | undefined;
  getStyle: (coord: WorldCoord, mode: MapMode) => WorldDotStyle;
}) => {
  if (!sector) return null;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {sector.worlds.map((w) => {
        const { cx, cy }    = hexCenter(w.hexX, w.hexY);
        const { fill, r }   = getStyle({ hex: w.hex, sectorAbbr }, "galaxyMiniMap");
        return (
          <circle key={w.hex} cx={cx} cy={cy} r={r} fill={fill} />
        );
      })}
    </svg>
  );
};
