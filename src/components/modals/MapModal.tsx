"use client";

import HudModal from "./HudModal";
import GalaxyGrid from "../map/GalaxyGrid";
import HexGrid from "../map/HexGrid";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setMapView,
  setActiveSector,
  setActiveSubsector,
  openSystemDetail,
} from "../../store/slices/uiSlice";
import {
  selectMapView,
  selectActiveSectorAbbr,
  selectActiveSubsector,
} from "../../store/selectors/ui.selectors";
import type { MapView } from "../../types";

const MAP_TABS: { label: string; value: MapView }[] = [
  { label: "Galaxy",    value: "galaxy" },
  { label: "Sector",    value: "sector" },
  { label: "Subsector", value: "subsector" },
];

// Placeholder sector data — populated from DB after seed
const PLACEHOLDER_SECTORS: {
  abbreviation: string;
  name: string;
  gridX: number;
  gridY: number;
}[] = [];

// Placeholder subsector letters A–P
const SUBSECTOR_LETTERS = "ABCDEFGHIJKLMNOP".split("");

export default function MapModal() {
  const dispatch = useAppDispatch();
  const mapView = useAppSelector(selectMapView);
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeSubsector = useAppSelector(selectActiveSubsector);

  const headerRight = (
    <div className="flex gap-1">
      {MAP_TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => dispatch(setMapView(tab.value))}
          className={[
            "border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
            mapView === tab.value
              ? "border-(--hud-accent) text-(--hud-accent)"
              : "border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-border) hover:text-(--hud-text)",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const title =
    mapView === "galaxy"
      ? "Galaxy Map"
      : mapView === "sector"
      ? activeSectorAbbr
        ? `${activeSectorAbbr} — Sector`
        : "Sector Map"
      : activeSubsector
      ? `Subsector ${activeSubsector}`
      : "Subsector Map";

  return (
    <HudModal title={title} headerRight={headerRight} maxHeight="max-h-[85vh]">
      {mapView === "galaxy" && (
        <>
          <div className="border-b border-(--hud-border) px-3 py-1.5">
            <p className="text-[10px] text-(--hud-text-dim) uppercase tracking-wider">
              Milieu M1105 · 81 sectors · 9×9 grid · Core (0,0) at centre
            </p>
          </div>
          <GalaxyGrid sectors={PLACEHOLDER_SECTORS} activeSectorAbbr={activeSectorAbbr} />
        </>
      )}

      {mapView === "sector" && (
        <>
          <div className="flex items-center gap-3 border-b border-(--hud-border) px-3 py-2">
            <select
              value={activeSectorAbbr ?? ""}
              onChange={(e) => dispatch(setActiveSector(e.target.value))}
              className="flex-1 border border-(--hud-border) bg-(--hud-surface-2) px-2 py-1 font-mono text-xs text-(--hud-text) focus:outline-none"
            >
              <option value="">— Select sector —</option>
              {PLACEHOLDER_SECTORS.map((s) => (
                <option key={s.abbreviation} value={s.abbreviation}>
                  {s.name} ({s.abbreviation})
                </option>
              ))}
            </select>
          </div>
          <div className="p-3">
            {activeSectorAbbr ? (
              <HexGrid
                worlds={[]}
                cols={32}
                rows={40}
                onSelectWorld={(id) => dispatch(openSystemDetail(id))}
              />
            ) : (
              <p className="py-8 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
                Select a sector above
              </p>
            )}
          </div>
        </>
      )}

      {mapView === "subsector" && (
        <>
          <div className="flex items-center gap-3 border-b border-(--hud-border) px-3 py-2">
            <select
              value={activeSectorAbbr ?? ""}
              onChange={(e) => dispatch(setActiveSector(e.target.value))}
              className="border border-(--hud-border) bg-(--hud-surface-2) px-2 py-1 font-mono text-xs text-(--hud-text) focus:outline-none"
            >
              <option value="">— Sector —</option>
              {PLACEHOLDER_SECTORS.map((s) => (
                <option key={s.abbreviation} value={s.abbreviation}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={activeSubsector ?? ""}
              onChange={(e) => dispatch(setActiveSubsector(e.target.value))}
              className="border border-(--hud-border) bg-(--hud-surface-2) px-2 py-1 font-mono text-xs text-(--hud-text) focus:outline-none"
            >
              <option value="">— Subsector —</option>
              {SUBSECTOR_LETTERS.map((letter) => (
                <option key={letter} value={letter}>
                  {letter}
                </option>
              ))}
            </select>
          </div>
          <div className="p-3">
            {activeSectorAbbr && activeSubsector ? (
              <HexGrid
                worlds={[]}
                cols={8}
                rows={10}
                onSelectWorld={(id) => dispatch(openSystemDetail(id))}
              />
            ) : (
              <p className="py-8 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
                Select a sector and subsector above
              </p>
            )}
          </div>
        </>
      )}

      {/* Legend */}
      {mapView !== "galaxy" && (
        <div className="border-t border-(--hud-border) px-3 py-2 flex flex-wrap gap-4 text-[10px] text-(--hud-text-dim) uppercase tracking-wider">
          <span>◉ Character present</span>
          <span>● World</span>
          <span className="text-(--hud-warning)">▲ Amber zone</span>
          <span className="text-(--hud-error)">■ Red zone</span>
        </div>
      )}
    </HudModal>
  );
}
