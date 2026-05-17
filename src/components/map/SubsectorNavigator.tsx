"use client";

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectAllSectors,
  selectSectorData,
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
} from "../../store/selectors/galaxy.selectors";
import { setActiveSector, setActiveSubsector, setActiveLocation } from "../../store/slices/galaxySlice";
import type { SectorMeta, SectorDetail } from "../../types";
import SubsectorGrid from "./SubsectorGrid";
import StarField from "./StarField";
import GalaxyStarField from "./GalaxyStarField";
import TradeValuesCard from "./TradeValuesCard";


const KEYS = "ABCDEFGHIJKLMNOP";
const COORD_MIN = -4;
const GRID_SIZE = 9;

// ── Navigation target ────────────────────────────────────────────────────────

interface NavTarget {
  sectorAbbr: string;
  subsectorKey: string;
  label: string;
}

const sectorLabel = (s: SectorMeta) => s.Names[0]?.Text ?? s.Abbreviation;

const buildNavTargets = (
  activeKey: string,
  activeSectorAbbr: string,
  allSectors: SectorMeta[],
  sectorData: SectorDetail | undefined,
  sectorByCoord: Map<string, SectorMeta>,
): Record<"up" | "down" | "left" | "right", NavTarget | null> => {
  const index = KEYS.indexOf(activeKey);
  const subRow = Math.floor(index / 4);
  const subCol = index % 4;
  const meta = allSectors.find((s) => s.Abbreviation === activeSectorAbbr);

  const subsectorName = (key: string) => sectorData?.subsectors[key] ?? key;

  const neighbor = (dx: number, dy: number) =>
    meta ? sectorByCoord.get(`${meta.X + dx},${meta.Y + dy}`) ?? null : null;

  const within = (key: string): NavTarget => ({
    sectorAbbr: activeSectorAbbr,
    subsectorKey: key,
    label: subsectorName(key),
  });

  const cross = (n: SectorMeta, key: string): NavTarget => ({
    sectorAbbr: n.Abbreviation,
    subsectorKey: key,
    label: sectorLabel(n),
  });

  const up = subRow > 0
    ? within(KEYS[index - 4])
    : (() => { const n = neighbor(0, -1); return n ? cross(n, KEYS[12 + subCol]) : null; })();

  const down = subRow < 3
    ? within(KEYS[index + 4])
    : (() => { const n = neighbor(0, 1); return n ? cross(n, KEYS[subCol]) : null; })();

  const left = subCol > 0
    ? within(KEYS[index - 1])
    : (() => { const n = neighbor(-1, 0); return n ? cross(n, KEYS[subRow * 4 + 3]) : null; })();

  const right = subCol < 3
    ? within(KEYS[index + 1])
    : (() => { const n = neighbor(1, 0); return n ? cross(n, KEYS[subRow * 4]) : null; })();

  return { up, down, left, right };
};

// ── NavButton ────────────────────────────────────────────────────────────────

interface NavButtonProps {
  target: NavTarget | null;
  icon: React.ReactNode;
  onNavigate: (t: NavTarget) => void;
  vertical?: boolean;
}

const NavButton = ({ target, icon, onNavigate, vertical = false }: NavButtonProps) => (
  <button
    disabled={!target}
    onClick={() => target && onNavigate(target)}
    className={[
      "flex items-center justify-center gap-1 border border-(--hud-border-subtle)",
      "font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)",
      "transition-colors hover:border-(--hud-border) hover:text-(--hud-text)",
      "disabled:opacity-20 disabled:cursor-not-allowed",
      vertical ? "flex-col px-1 py-3" : "flex-row px-3 py-1",
    ].join(" ")}
  >
    {icon}
    <span className={vertical ? "[writing-mode:vertical-rl] rotate-180" : ""}>
      {target?.label ?? "—"}
    </span>
  </button>
);

// ── Component ────────────────────────────────────────────────────────────────

const SubsectorNavigator = () => {
  const dispatch = useAppDispatch();
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeKey = useAppSelector(selectActiveSubsectorKey);
  const allSectors = useAppSelector(selectAllSectors);
  const sector = useAppSelector(selectSectorData(activeSectorAbbr));

  const sectorByCoord = new Map(allSectors.map((s) => [`${s.X},${s.Y}`, s]));

  const nav = buildNavTargets(activeKey, activeSectorAbbr, allSectors, sector, sectorByCoord);

  const navigate = (target: NavTarget) => {
    dispatch(setActiveLocation({ sectorAbbr: target.sectorAbbr, subsectorKey: target.subsectorKey }));
  };

  const selectSector = (abbr: string) => {
    dispatch(setActiveSector(abbr));
  };

  return (
    <div className="flex gap-4 items-start">

      {/* Galaxy overview — 9×9 grid */}
      <div className="flex flex-col gap-2 shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
          Charted Space
        </span>
        <div
          className="grid gap-px bg-(--hud-border-subtle)"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, max-content)` }}
        >
          {Array.from({ length: GRID_SIZE }, (_, rowIdx) =>
            Array.from({ length: GRID_SIZE }, (_, colIdx) => {
              const gx = COORD_MIN + colIdx;
              const gy = COORD_MIN + rowIdx;
              const s = sectorByCoord.get(`${gx},${gy}`);
              const isActive = s?.Abbreviation === activeSectorAbbr;

              return (
                <button
                  key={`${gx},${gy}`}
                  title={s ? sectorLabel(s) : ""}
                  disabled={!s}
                  onClick={() => s && selectSector(s.Abbreviation)}
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
      </div>

      {/* Sector subsector minimap — StarField 4×4 */}
      <div className="flex flex-col gap-2 shrink-0">
        <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
          {sector?.sector ?? activeSectorAbbr}
        </span>
        <StarField
          sectorAbbr={activeSectorAbbr}
          activeKey={activeKey}
          onSelectKey={(key) => dispatch(setActiveSubsector(key))}
        />
        <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-accent)">
          {sector?.subsectors[activeKey] ?? activeKey}
        </span>
      </div>

      {/* Subsector hex map with directional nav */}
      <div className="flex flex-col items-center gap-1">
        <NavButton target={nav.up}    icon={<ChevronUp    size={10} />} onNavigate={navigate} />

        <div className="flex items-center gap-1">
          <NavButton target={nav.left}  icon={<ChevronLeft  size={10} />} onNavigate={navigate} vertical />

          <SubsectorGrid
            sectorAbbr={activeSectorAbbr}
            subsectorKey={activeKey}
            showHeader={false}
          />

          <NavButton target={nav.right} icon={<ChevronRight size={10} />} onNavigate={navigate} vertical />
        </div>

        <NavButton target={nav.down}  icon={<ChevronDown  size={10} />} onNavigate={navigate} />
      </div>

      {/* Trade values panel */}
      <TradeValuesCard />
    </div>
  );
};
export default SubsectorNavigator;
