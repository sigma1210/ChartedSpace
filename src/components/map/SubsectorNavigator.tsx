"use client";

import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectAllSectors,
  selectSectorData,
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
} from "../../store/selectors/galaxy.selectors";
import { setActiveLocation } from "../../store/slices/galaxySlice";
import type { SectorMeta, SectorDetail } from "../../types";

import SubsectorGrid from "./SubsectorGrid";
import GalaxyMiniMap from "./GalaxyMiniMap";
import SectorMiniMap from "./SectorMiniMap";
import TradeValuesCard from "./TradeValuesCard";
import ShipCard from "./ShipCard";

const KEYS = "ABCDEFGHIJKLMNOP";

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
  const dispatch         = useAppDispatch();
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeKey        = useAppSelector(selectActiveSubsectorKey);
  const allSectors       = useAppSelector(selectAllSectors);
  const sector           = useAppSelector(selectSectorData(activeSectorAbbr));

  const sectorByCoord = new Map(allSectors.map(s => [`${s.X},${s.Y}`, s]));
  const nav           = buildNavTargets(activeKey, activeSectorAbbr, allSectors, sector, sectorByCoord);

  const navigate = (target: NavTarget) => {
    dispatch(setActiveLocation({ sectorAbbr: target.sectorAbbr, subsectorKey: target.subsectorKey }));
  };

  return (
    <div className="flex gap-4 items-start">

      <GalaxyMiniMap />

      <SectorMiniMap />

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

      {/* Right panel — trade + ship */}
      <div className="flex flex-col gap-2">
        <TradeValuesCard />
        <ShipCard />
      </div>
    </div>
  );
};
export default SubsectorNavigator;
