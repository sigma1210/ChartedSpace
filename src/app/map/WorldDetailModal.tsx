"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectActiveWorld, selectActiveWorldTradeLabels, selectActiveWorldCost } from "../../store/selectors/galaxy.selectors";
import { closeModal } from "../../store/slices/uiSlice";
import CreditsBadge from "../../components/ui/CreditsBadge";
import WorldMap from "../../components/world/WorldMap";
import PlanetGlobe from "../../components/world/PlanetGlobe";

// ─── UWP decode tables ────────────────────────────────────────────────────────

const STARPORT: Record<string, string> = {
  A: "Excellent",
  B: "Good",
  C: "Routine",
  D: "Poor",
  E: "Frontier",
  X: "None",
  "?": "Unknown",
};

const SIZE_DESC = ["Asteroid", "1,600 km", "3,200 km", "4,800 km", "6,400 km",
  "8,000 km", "9,600 km", "11,200 km", "12,800 km", "14,400 km", "16,000 km"];

const ATMO_DESC = [
  "None", "Trace", "Very Thin, Tainted", "Very Thin", "Thin, Tainted", "Thin",
  "Standard", "Standard, Tainted", "Dense", "Dense, Tainted",
  "Exotic", "Corrosive", "Insidious", "Dense, High", "Thin, Low", "Unusual",
];

const HYDRO_DESC = [
  "Desert (0%)", "10%", "20%", "30%", "40%", "50%",
  "60%", "70%", "80%", "90%", "Water World (100%)",
];

const POP_DESC = [
  "None", "Tens", "Hundreds", "Thousands", "Tens of thousands",
  "Hundreds of thousands", "Millions", "Tens of millions",
  "Hundreds of millions", "Billions", "Tens of billions",
];

const GOV_DESC = [
  "None", "Company/Corporation", "Participating Democracy",
  "Self-Perpetuating Oligarchy", "Representative Democracy",
  "Feudal Technocracy", "Captive Government", "Balkanization",
  "Civil Service Bureaucracy", "Impersonal Bureaucracy",
  "Charismatic Dictator", "Non-Charismatic Leader",
  "Charismatic Oligarchy", "Religious Dictatorship",
];

const LAW_DESC = [
  "No law", "Battle dress banned", "Energy weapons banned",
  "Machine guns banned", "Light assault weapons banned",
  "Personal firearms banned", "All firearms banned",
  "Shotguns banned", "All bladed weapons banned", "All weapons prohibited",
];

const TL_DESC = [
  "Primitive", "Stone Age", "Printing Press", "Basic Science",
  "Industrial", "Steam Age", "Nuclear Age", "Pre-Stellar",
  "Space Age", "Early Stellar", "Interstellar", "Average Stellar",
  "Average Stellar (J-3)", "Average Stellar (J-4)", "High Stellar", "High Stellar",
  "Imperial Max",
];

const uwpVal = (c: string): number => {
  if (!c || c === "?") return 0;
  const n = parseInt(c, 16);
  return isNaN(n) ? 0 : n;
};

const desc = (table: string[], c: string, fallback = "—") =>
  table[uwpVal(c)] ?? fallback;

// ─── Sub-components ───────────────────────────────────────────────────────────

const travelZoneLabel = (zone: string) => {
  if (zone === "A") return { text: "Amber", color: "var(--hud-warning)" };
  if (zone === "R") return { text: "Red",   color: "var(--hud-error)" };
  return null;
};

const UWPRow = ({ label, code, description }: { label: string; code: string; description: string }) => (
  <div className="flex gap-3 items-baseline">
    <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim) w-20 shrink-0">{label}</span>
    <span className="font-mono text-xs text-(--hud-accent) w-5 shrink-0">{code}</span>
    <span className="font-mono text-[9px] text-(--hud-text-dim)">{description}</span>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

const WorldDetailModal = () => {
  const dispatch    = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const world       = useAppSelector(selectActiveWorld);
  const tradeLabels = useAppSelector(selectActiveWorldTradeLabels);
  const cost        = useAppSelector(selectActiveWorldCost);

  if (activeModal !== "systemDetail" || !world) return null;

  const zone = travelZoneLabel(world.travelZone);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => dispatch(closeModal())}
    >
      <div
        className="hud-panel w-140 max-h-[90vh] overflow-y-auto flex flex-col gap-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-base font-bold uppercase tracking-widest text-(--hud-text)">
              {world.name}
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {tradeLabels.map((label) => (
                <span
                  key={label}
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-(--hud-border) text-(--hud-text-dim) bg-(--hud-surface-2)"
                >
                  {label}
                </span>
              ))}
              {zone && (
                <span
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 font-bold"
                  style={{ color: zone.color, border: `1px solid ${zone.color}` }}
                >
                  {zone.text} Zone
                </span>
              )}
            </div>
            {cost !== null && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)">Suspected Price</span>
                <CreditsBadge amount={cost} />
              </div>
            )}
          </div>
          <button
            onClick={() => dispatch(closeModal())}
            className="font-mono text-xs text-(--hud-text-dim) hover:text-(--hud-text) transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── World map + globe ── */}
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <WorldMap world={world} />
          </div>
          <div className="w-40 shrink-0">
            <PlanetGlobe world={world} />
          </div>
        </div>

        {/* ── UWP raw ── */}
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">UWP</span>
          <span className="font-mono text-sm tracking-widest text-(--hud-accent)">{world.uwp.raw}</span>
        </div>

        {/* ── UWP breakdown ── */}
        <div className="flex flex-col gap-2 border-t border-(--hud-border) pt-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">World Data</span>
          <div className="flex flex-col gap-1.5">
            <UWPRow label="Starport"    code={world.uwp.starport}    description={STARPORT[world.uwp.starport]    ?? "—"} />
            <UWPRow label="Size"        code={world.uwp.size}        description={desc(SIZE_DESC,  world.uwp.size)} />
            <UWPRow label="Atmosphere"  code={world.uwp.atmosphere}  description={desc(ATMO_DESC,  world.uwp.atmosphere)} />
            <UWPRow label="Hydrograph." code={world.uwp.hydrographics} description={desc(HYDRO_DESC, world.uwp.hydrographics)} />
            <UWPRow label="Population"  code={world.uwp.population}  description={desc(POP_DESC,   world.uwp.population)} />
            <UWPRow label="Government"  code={world.uwp.government}  description={desc(GOV_DESC,   world.uwp.government)} />
            <UWPRow label="Law Level"   code={world.uwp.lawLevel}    description={desc(LAW_DESC,   world.uwp.lawLevel)} />
            <UWPRow label="Tech Level"  code={world.uwp.techLevel}   description={desc(TL_DESC,    world.uwp.techLevel)} />
          </div>
        </div>

        {/* ── Stellar ── */}
        {world.stellar && (
          <div className="flex flex-col gap-1 border-t border-(--hud-border) pt-3">
            <span className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">Stellar</span>
            <span className="font-mono text-xs text-(--hud-text)">{world.stellar}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldDetailModal;
