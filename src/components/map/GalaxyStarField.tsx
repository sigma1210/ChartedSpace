"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { loadSector } from "../../store/slices/galaxySlice";
import { selectSectorData } from "../../store/selectors/galaxy.selectors";

const HEX_RADIUS = 20;
const COL_SPACING = HEX_RADIUS * 1.5;
const ROW_SPACING = HEX_RADIUS * Math.sqrt(3);
const EVEN_COL_OFFSET = ROW_SPACING / 2;
const PAD = 4;
const COLS = 32;
const ROWS = 40;

const SVG_W = (COLS - 1) * COL_SPACING + HEX_RADIUS * 2 + PAD * 2;
const SVG_H = ROWS * ROW_SPACING + EVEN_COL_OFFSET + PAD * 2;

const GalaxyStarField = ({ sectorAbbr }: { sectorAbbr: string }) => {
  const dispatch = useAppDispatch();
  const sector = useAppSelector(selectSectorData(sectorAbbr));

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
        const cx = (w.hexX - 1) * COL_SPACING + HEX_RADIUS + PAD;
        const cy = (w.hexY - 1) * ROW_SPACING + ROW_SPACING / 2 + PAD + (w.hexX % 2 === 0 ? EVEN_COL_OFFSET : 0);
        return <circle key={w.hex} cx={cx} cy={cy} r={5} fill="white" />;
      })}
    </svg>
  );
};
export default GalaxyStarField;
