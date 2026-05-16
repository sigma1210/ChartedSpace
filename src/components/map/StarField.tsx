"use client";

import { useAppSelector } from "../../store/hooks";
import { selectSectorData, selectActiveWorldHex } from "../../store/selectors/galaxy.selectors";

interface StarFieldProps {
  sectorAbbr: string;
  activeKey: string;
  onSelectKey: (key: string) => void;
}

const KEYS = "ABCDEFGHIJKLMNOP";
const HEX_RADIUS = 20;
const COL_SPACING = HEX_RADIUS * 1.5;
const ROW_SPACING = HEX_RADIUS * Math.sqrt(3);
const EVEN_COL_OFFSET = ROW_SPACING / 2;
const PAD = 4;
const COLS = 8;
const ROWS = 10;

const SVG_W = (COLS - 1) * COL_SPACING + HEX_RADIUS * 2 + PAD * 2;
const SVG_H = ROWS * ROW_SPACING + EVEN_COL_OFFSET + PAD * 2;

const StarField = ({ sectorAbbr, activeKey, onSelectKey }: StarFieldProps) => {
  const sector = useAppSelector(selectSectorData(sectorAbbr));
  const activeWorldHex = useAppSelector(selectActiveWorldHex);

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
            const cx = (col - 1) * COL_SPACING + HEX_RADIUS + PAD;
            const cy = (row - 1) * ROW_SPACING + ROW_SPACING / 2 + PAD + (col % 2 === 0 ? EVEN_COL_OFFSET : 0);
            return { id: w.hex, cx, cy };
          });

        return (
          <div
            key={key}
            className="w-7 aspect-258/372 overflow-hidden cursor-pointer"
            style={{
              background: isActive ? "rgba(6,182,212,0.15)" : "#020c14",
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
                const isSelected = s.id === activeWorldHex;
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
