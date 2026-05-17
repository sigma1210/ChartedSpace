"use client";

import { useAppSelector } from "../../store/hooks";
import { selectSectorData, selectActiveWorldHex, selectActiveWorldSectorAbbr } from "../../store/selectors/galaxy.selectors";

interface StarFieldProps {
  sectorAbbr: string;
  activeKey: string;
  onSelectKey: (key: string) => void;
}

const KEYS = "ABCDEFGHIJKLMNOP";
import { hexSvgWidth, hexSvgHeight, hexCenter } from "./hexGeometry";

const COLS = 8;
const ROWS = 10;

const SVG_W = hexSvgWidth(COLS);
const SVG_H = hexSvgHeight(ROWS);

const StarField = ({ sectorAbbr, activeKey, onSelectKey }: StarFieldProps) => {
  const sector = useAppSelector(selectSectorData(sectorAbbr));
  const activeWorldHex = useAppSelector(selectActiveWorldHex);
  const activeWorldSectorAbbr = useAppSelector(selectActiveWorldSectorAbbr);

  if (!sector) return null;

  return (
    <div className="grid grid-cols-4 gap-px bg-(--hud-border-subtle)">
      {KEYS.split("").map((key, i) => {
        const subCol = i % 4;
        const subRow = Math.floor(i / 4);
        const hexXStart = subCol * 8 + 1;
        const hexYStart = subRow * 10 + 1;
        const isActive = key === activeKey;

        const stars = sector.worlds
          .filter(
            (w) =>
              w.hexX >= hexXStart &&
              w.hexX <= hexXStart + 7 &&
              w.hexY >= hexYStart &&
              w.hexY <= hexYStart + 9,
          )
          .map((w) => {
            const col = w.hexX - hexXStart + 1;
            const row = w.hexY - hexYStart + 1;
            const { cx, cy } = hexCenter(col, row);
            return { id: w.hex, cx, cy };
          });

        return (
          <div
            key={key}
            className="w-7 aspect-258/372 overflow-hidden cursor-pointer"
            style={{
              background: isActive ? "rgba(6,182,212,0.07)" : "#020c14",
              outline: isActive ? "1px solid var(--hud-accent)" : "none",
              outlineOffset: "-1px",
            }}
            onClick={() => onSelectKey(key)}
          >
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              {stars.map((s) => {
                const isSelected = s.id === activeWorldHex && sectorAbbr === activeWorldSectorAbbr;
                return (
                  <circle
                    key={s.id}
                    cx={s.cx}
                    cy={s.cy}
                    r={isSelected ? 10 : 5}
                    fill={isSelected ? "var(--hud-error)" : isActive ? "var(--hud-accent)" : "white"}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
    </div>
  );
};
export default StarField;
