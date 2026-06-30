"use client";

import { Canvas } from "@react-three/fiber";
import type { World } from "../../types";
import { isAsteroid, uwpVal } from "../../lib/worldMap";
import { WorldGlobeVisual } from "./PlanetGlobe";

const uppRows = (world: World) => [
  ["Starport", world.uwp.starport, STARPORT[world.uwp.starport] ?? "Unknown"],
  ["Size", world.uwp.size, desc(SIZE_DESC, world.uwp.size)],
  ["Atmosphere", world.uwp.atmosphere, desc(ATMO_DESC, world.uwp.atmosphere)],
  ["Hydrographics", world.uwp.hydrographics, desc(HYDRO_DESC, world.uwp.hydrographics)],
  ["Population", world.uwp.population, desc(POP_DESC, world.uwp.population)],
  ["Government", world.uwp.government, desc(GOV_DESC, world.uwp.government)],
  ["Law", world.uwp.lawLevel, desc(LAW_DESC, world.uwp.lawLevel)],
  ["Tech Level", world.uwp.techLevel, desc(TL_DESC, world.uwp.techLevel)],
];

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

const desc = (table: string[], code: string, fallback = "Unknown") =>
  table[uwpVal(code)] ?? fallback;

const UppOverlay = ({ world }: { world: World }) => (
  <div className="pointer-events-auto absolute right-1 top-1 flex flex-col items-end text-right text-[6px] leading-[0.62rem] tracking-widest">
    {uppRows(world).map(([label, value, description]) => (
      <div
        key={label}
        className="group/upp relative grid grid-cols-[auto_auto] gap-x-1"
        title={`${label} ${value}: ${description}`}
      >
        <span className="text-(--hud-text-dim)">{label}</span>
        <span className="text-(--hud-accent)">{value}</span>
        <span className="pointer-events-none absolute right-0 top-full z-50 hidden w-max max-w-36 border border-(--hud-accent)/70 bg-(--hud-bg)/95 px-1.5 py-0.5 text-left font-mono text-[7px] leading-3 tracking-wider text-(--hud-accent) shadow-[0_0_12px_rgba(34,211,238,0.18)] group-hover/upp:block">
          {description}
        </span>
      </div>
    ))}
  </div>
);

const JumpSignalPanel = () => (
  <div className="relative aspect-square w-44 overflow-hidden border border-(--hud-border) bg-[#020c14]">
    <div
      className="absolute inset-0 opacity-65"
      style={{
        backgroundImage: [
          "radial-gradient(circle at 18% 22%, rgba(34,211,238,0.5) 0 1px, transparent 1px)",
          "radial-gradient(circle at 78% 14%, rgba(255,255,255,0.35) 0 1px, transparent 1px)",
          "radial-gradient(circle at 44% 72%, rgba(34,211,238,0.28) 0 1px, transparent 1px)",
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px)",
          "repeating-linear-gradient(90deg, rgba(34,211,238,0.08) 0 1px, transparent 1px 4px)",
        ].join(", "),
        backgroundSize: "13px 17px, 19px 11px, 23px 29px, 100% 3px, 4px 100%",
      }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0_42%,rgba(2,12,20,0.78)_76%)]" />
    <span className="absolute left-1 top-1 max-w-[9rem] truncate text-[8px] tracking-widest text-(--hud-accent)">
      Jump Space
    </span>
    <span className="absolute right-1 top-1 text-right text-[6px] leading-[0.62rem] tracking-widest text-(--hud-text-dim)">
      Signal<br />Unavailable
    </span>
    <span className="absolute bottom-1 right-1 text-[8px] tracking-widest text-(--hud-accent)">
      NO WORLD DATA
    </span>
  </div>
);

const MainWorldGlobePreview = ({ world }: { world: World }) => {
  if (isAsteroid(world)) {
    return (
      <div className="relative grid aspect-square w-44 place-items-center border border-(--hud-border) bg-[#020c14]">
        <span className="absolute left-1 top-1 max-w-[9rem] truncate text-[8px] tracking-widest text-(--hud-accent)">
          {world.name}
        </span>
        <UppOverlay world={world} />
        <span className="text-[8px] tracking-widest text-(--hud-text-dim)">Asteroid Belt</span>
        <span className="absolute bottom-1 right-1 text-[8px] tracking-widest text-(--hud-accent)">
          UPP {world.uwp.raw}
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-44 border border-(--hud-border) bg-black/15">
      <Canvas
        camera={{ position: [0, 0, 2.4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.66} />
        <directionalLight position={[2, 2, 3]} intensity={1.35} />
        <WorldGlobeVisual world={world} radius={0.34} />
      </Canvas>
      <span className="absolute left-1 top-1 max-w-[9rem] truncate text-[8px] tracking-widest text-(--hud-accent)">
        {world.name}
      </span>
      <UppOverlay world={world} />
      <span className="absolute bottom-1 right-1 text-[8px] tracking-widest text-(--hud-accent)">
        UPP {world.uwp.raw}
      </span>
    </div>
  );
};

export const MainWorldHud = ({ world, inJump = false }: { world: World | null; inJump?: boolean }) => {
  if (inJump) {
    return (
      <div className="w-46 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
        <div className="mx-auto w-44">
          <JumpSignalPanel />
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="w-48 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        No world selected
      </div>
    );
  }

  return (
    <div className="w-46 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="mx-auto w-44">
        <MainWorldGlobePreview world={world} />
      </div>
    </div>
  );
};
