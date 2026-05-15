"use client";

import { ChevronLeft } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { openMap, goBack } from "../../store/slices/uiSlice";
import { selectActiveWorldId, selectMapView } from "../../store/selectors/ui.selectors";

const TRAVEL_ZONE_CONFIG = {
  A: { label: "Amber Zone", color: "text-(--hud-warning)" },
  R: { label: "Red Zone",   color: "text-(--hud-error)" },
} as const;

// Placeholder — will be replaced with server data fetch by worldId
const PLACEHOLDER = {
  name: "— No world selected —",
  sectorName: "",
  sectorAbbr: "",
  hex: "",
  subsectorName: "",
  uwpRaw: "???????-?",
  starport: "?", size: "?", atmosphere: "?", hydrographics: "?",
  population: "?", government: "?", lawLevel: "?", techLevel: "?",
  remarks: [] as string[],
  travelZone: null as string | null,
  allegiance: null as string | null,
  stellar: [] as string[],
  gasGiants: 0,
  belts: 0,
  worldsInSystem: 0,
  economicsRaw: "",
  cultureRaw: "",
};

function UwpRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-(--hud-text-dim)">{label}</span>
      <span className="font-mono text-(--hud-text)">{value}</span>
    </div>
  );
}

export default function SystemDetailModal() {
  const dispatch = useAppDispatch();
  const worldId = useAppSelector(selectActiveWorldId);
  const mapView = useAppSelector(selectMapView);
  const world = PLACEHOLDER;

  const zone = world.travelZone as keyof typeof TRAVEL_ZONE_CONFIG | null;
  const zoneConfig = zone ? TRAVEL_ZONE_CONFIG[zone] : null;

  const headerRight = (
    <button
      onClick={() => dispatch(openMap(mapView))}
      className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      <ChevronLeft size={10} />
      Map
    </button>
  );

  return (
    <HudModal
      title={world.name}
      subtitle={
        world.sectorAbbr
          ? `${world.sectorName} · Hex ${world.hex} · Subsector ${world.subsectorName}`
          : undefined
      }
      headerRight={headerRight}
    >
      <div className="grid grid-cols-2 divide-x divide-(--hud-border)">
        {/* Left — UWP breakdown */}
        <div className="flex flex-col gap-3 p-3">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              Universal World Profile
            </p>
            <p className="font-mono text-lg text-(--hud-text) tracking-widest">{world.uwpRaw}</p>
          </div>
          <div className="flex flex-col gap-1 border-t border-(--hud-border-subtle) pt-2">
            <UwpRow label="Starport"      value={world.starport} />
            <UwpRow label="Size"          value={world.size} />
            <UwpRow label="Atmosphere"    value={world.atmosphere} />
            <UwpRow label="Hydrographics" value={world.hydrographics} />
            <UwpRow label="Population"    value={world.population} />
            <UwpRow label="Government"    value={world.government} />
            <UwpRow label="Law Level"     value={world.lawLevel} />
            <UwpRow label="Tech Level"    value={world.techLevel} />
          </div>
          <div className="border-t border-(--hud-border-subtle) pt-2">
            <p className="text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              Travel Zone
            </p>
            <p className={`mt-1 text-xs font-mono ${zoneConfig ? zoneConfig.color : "text-(--hud-text)"}`}>
              {zoneConfig ? zoneConfig.label : "◉ Unrestricted"}
            </p>
          </div>
        </div>

        {/* Right — Stellar, System, Trade, Allegiance */}
        <div className="flex flex-col divide-y divide-(--hud-border)">
          <div className="p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              Stellar Data
            </p>
            {world.stellar.length === 0 ? (
              <p className="text-xs text-(--hud-text-dim)">No stellar data</p>
            ) : (
              world.stellar.map((s, i) => (
                <p key={i} className="font-mono text-xs text-(--hud-text)">
                  {s} {i === 0 ? "(Primary)" : "(Companion)"}
                </p>
              ))
            )}
          </div>

          <div className="p-3">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
              System Composition
            </p>
            <div className="flex flex-col gap-0.5 text-xs">
              <UwpRow label="Worlds in system" value={String(world.worldsInSystem)} />
              <UwpRow label="Gas Giants"       value={String(world.gasGiants)} />
              <UwpRow label="Planetoid Belts"  value={String(world.belts)} />
            </div>
          </div>

          {world.remarks.length > 0 && (
            <div className="p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                Trade Classifications
              </p>
              <p className="font-mono text-xs text-(--hud-text)">
                {world.remarks.join("  ·  ")}
              </p>
            </div>
          )}

          {world.allegiance && (
            <div className="p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                Allegiance
              </p>
              <p className="text-xs text-(--hud-text)">{world.allegiance}</p>
            </div>
          )}

          {world.economicsRaw && (
            <div className="p-3">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                Economics
              </p>
              <p className="font-mono text-xs text-(--hud-text)">{world.economicsRaw}</p>
              {world.cultureRaw && (
                <>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                    Culture
                  </p>
                  <p className="font-mono text-xs text-(--hud-text)">{world.cultureRaw}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </HudModal>
  );
}
