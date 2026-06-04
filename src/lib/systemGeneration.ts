import type { World } from "../types";
import { uwpVal, isAsteroid } from "./worldMap";
import { lookupHz, ORBIT_AU, seededRng } from "./orbitData";
import {
  spectralMass,
  epochAngle,
  elapsedDaysAtTurn,
} from "./orbitalMechanics";
import type {
  AtmosphereType,
  BeltBody,
  BodyZone,
  GasGiantBody,
  GasGiantType,
  StellarClass,
  SurfaceType,
  SystemData,
  SystemOrbit,
  SystemStar,
  WorldBody,
} from "./systemTypes";
import p2Raw from "../../Galaxy/systems/p2.json";
import ggRaw from "../../Galaxy/systems/gg.json";

// ─── Table types & lookups ────────────────────────────────────────────────────

type P2Row = {
  Roll: number;
  LGG: number;
  SGG: number;
  IG: number;
  Belt: number;
  World1: number;
  World2: number;
};
type GGRow = {
  Roll: number;
  SizeCode: string;
  Type: string;
  Diameter: number;
  G: number;
};

const P2_TABLE = (p2Raw as unknown[]).filter(
  (r): r is P2Row => typeof (r as P2Row).Roll === "number",
);
const GG_TABLE = (ggRaw as unknown[]).filter(
  (r): r is GGRow => typeof (r as GGRow).Roll === "number",
);

const roll2d6 = (rng: () => number): number =>
  Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6) + 1;

const lookupP2 = (roll: number): P2Row =>
  P2_TABLE.find((r) => r.Roll === Math.min(Math.max(roll, 1), 12)) ??
  P2_TABLE[5];

const lookupGG = (roll: number): GGRow =>
  GG_TABLE.find((r) => r.Roll === Math.min(Math.max(roll, 1), 13)) ??
  GG_TABLE[5];

// Place a body at the nearest free orbit, preferring the candidate, then +/-1.
const placeOrbit = (candidate: number, used: Set<number>): number => {
  const base = Math.max(0, Math.min(20, candidate));
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let d = 1; d <= 10; d++) {
    for (const o of [base + d, base - d]) {
      if (o >= 0 && o <= 20 && !used.has(o)) {
        used.add(o);
        return o;
      }
    }
  }
  used.add(base);
  return base;
};

// ─── Derivation helpers ───────────────────────────────────────────────────────

const SPECTRAL_COLOR: Record<string, string> = {
  O: "#9BB0FF",
  B: "#AABFFF",
  A: "#CAD7FF",
  F: "#FFFACD",
  G: "#FFF5C0",
  K: "#FFCC6F",
  M: "#FF6030",
  D: "#FFFFFF",
  BD: "#8B3A00",
};

const SPECTRAL_RADIUS: Record<string, number> = {
  O: 10.0,
  B: 5.0,
  A: 2.0,
  F: 1.3,
  G: 1.0,
  K: 0.7,
  M: 0.35,
  D: 0.015,
  BD: 0.1,
};

const starColor = (spectral: string): string => {
  if (spectral === "BD") return SPECTRAL_COLOR.BD;
  if (spectral.startsWith("D")) return SPECTRAL_COLOR.D;
  return SPECTRAL_COLOR[spectral[0]] ?? "#FFFFFF";
};

const starRadiusScale = (spectral: string): number => {
  if (spectral === "BD") return SPECTRAL_RADIUS.BD;
  if (spectral.startsWith("D")) return SPECTRAL_RADIUS.D;
  return SPECTRAL_RADIUS[spectral[0]] ?? 1.0;
};

const stellarClass = (spectral: string): StellarClass => {
  if (spectral === "BD") return "brown-dwarf";
  if (spectral.startsWith("D")) return "white-dwarf";
  const lum = spectral.split(" ")[1] ?? "";
  if (lum === "Ia" || lum === "Ib") return "supergiant";
  if (lum === "II") return "bright-giant";
  if (lum === "III") return "giant";
  if (lum === "IV") return "subgiant";
  return "main-sequence";
};

const ATMOSPHERE_TYPE: Record<number, AtmosphereType> = {
  0: "none",
  1: "trace",
  2: "very-thin",
  3: "very-thin",
  4: "thin",
  5: "thin",
  6: "standard",
  7: "standard",
  8: "dense",
  9: "dense",
  10: "exotic",
  11: "corrosive",
  12: "insidious",
};

const atmosphereType = (code: string): AtmosphereType =>
  ATMOSPHERE_TYPE[uwpVal(code)] ?? "exotic";

const surfaceType = (hydroCode: string, tradeCodes: string[]): SurfaceType => {
  if (tradeCodes.includes("Va")) return "barren";
  if (tradeCodes.includes("He")) return "hellworld";
  if (tradeCodes.includes("Fl")) return "exotic";
  if (tradeCodes.includes("Ic") || tradeCodes.includes("Fr")) return "ice";
  if (tradeCodes.includes("De")) return "desert";
  if (tradeCodes.includes("Wa")) return "ocean";
  const h = uwpVal(hydroCode);
  if (h === 0) return "barren";
  if (h <= 3) return "arid";
  if (h <= 7) return "terran";
  return "ocean";
};

const orbitZone = (orbitId: number, hzOrbitId: number): BodyZone => {
  if (orbitId < hzOrbitId) return "inner";
  if (orbitId > hzOrbitId) return "outer";
  return "habitable";
};

// ─── Star list builder ────────────────────────────────────────────────────────

const buildStars = (stellar: string[]): SystemStar[] => {
  const systemType =
    stellar.length === 1
      ? "solitary"
      : stellar.length === 2
        ? "binary"
        : "trinary";

  return stellar.map((spectral, index): SystemStar => {
    const role =
      index === 0
        ? "primary"
        : systemType === "trinary" && index === 1
          ? "close-companion"
          : "far-companion";

    const proximity =
      role === "primary" ? null : role === "close-companion" ? "close" : "far";

    const hz = lookupHz(spectral);
    const hzOrbitId = Math.round(hz);
    const hzAU = ORBIT_AU[hzOrbitId] ?? 1.0;
    const habitableZone =
      hz > 0
        ? {
            orbitId: hzOrbitId,
            hz,
            innerAU: hzAU,
            outerAU: ORBIT_AU[hzOrbitId + 1] ?? hzAU * 1.3,
          }
        : null;

    const orbitId =
      role === "close-companion" ? 0 : role === "far-companion" ? null : null;

    return {
      index,
      role,
      spectral,
      dataSource: "derived",
      stellarClass: stellarClass(spectral),
      color: starColor(spectral),
      radiusScale: starRadiusScale(spectral),
      habitableZone,
      orbitId,
      au: orbitId !== null ? (ORBIT_AU[orbitId] ?? null) : null,
      proximity,
    };
  });
};

// ─── Main world orbit entry ───────────────────────────────────────────────────

interface ParentGGData {
  classification: GasGiantType;
  sizeCode: string;
  diameterMiles: number;
  gravity: number;
}

const buildMainWorldOrbit = (
  world: World,
  hzOrbitId: number,
  isSatellite: boolean,
  gasGiants: number,
  angle0: number,
  parentGG?: ParentGGData,
): SystemOrbit => {
  const au = ORBIT_AU[hzOrbitId] ?? 1.0;

  if (isAsteroid(world)) {
    return {
      orbitId: hzOrbitId,
      au,
      zone: "habitable",
      dataSource: "derived",
      angle0,
      body: {
        kind: "belt",
        isMainWorld: true,
        dataSource: "derived",
        name: world.name,
        tradeCodes: world.remarks,
      },
    };
  }

  const mainWorldBody: WorldBody = {
    kind: "world",
    isMainWorld: true,
    dataSource: "derived",
    name: world.name,
    sizeCode: world.uwp.size,
    diameterKm: uwpVal(world.uwp.size) * 1600,
    atmosphereCode: world.uwp.atmosphere,
    atmosphereType: atmosphereType(world.uwp.atmosphere),
    hydrographicsCode: world.uwp.hydrographics,
    surfaceType: surfaceType(world.uwp.hydrographics, world.remarks),
    tradeCodes: world.remarks,
    axialTilt: null,
    rotationPeriodH: null,
    canonicalTexture: null,
    moons: [],
    hasRings: null,
  };

  if (isSatellite) {
    if (gasGiants > 0) {
      return {
        orbitId: hzOrbitId, au, zone: "habitable", dataSource: "derived", angle0,
        body: {
          kind: "gasGiant", isMainWorld: false, dataSource: "derived",
          classification: parentGG?.classification ?? null,
          sizeCode: parentGG?.sizeCode ?? null,
          diameterMiles: parentGG?.diameterMiles ?? null,
          gravity: parentGG?.gravity ?? null,
          hasRings: null, moons: [mainWorldBody],
        },
      };
    } else {
      // Bigworld — rocky parent, 2 size codes larger than the main world
      const parentSize = Math.min(uwpVal(world.uwp.size) + 2, 15);
      const parentSizeCode = parentSize.toString(16).toUpperCase();
      return {
        orbitId: hzOrbitId, au, zone: "habitable", dataSource: "derived", angle0,
        body: {
          kind: "world", isMainWorld: false, isParent: true, dataSource: "derived",
          sizeCode: parentSizeCode, diameterKm: parentSize * 1600,
          atmosphereCode: null, atmosphereType: null,
          hydrographicsCode: null, surfaceType: null, tradeCodes: [],
          axialTilt: null, rotationPeriodH: null, canonicalTexture: null,
          moons: [mainWorldBody], hasRings: null,
        },
      };
    }
  }

  return {
    orbitId: hzOrbitId,
    au,
    zone: "habitable",
    dataSource: "derived",
    angle0,
    body: mainWorldBody,
  };
};

export interface BuildSystemDataOptions {
  sectorAbbr?: string;
  currentTurn?: number;
}

export const buildSystemData = (
  world: World,
  options: BuildSystemDataOptions = {},
): SystemData => {
  const sectorAbbr = options.sectorAbbr ?? "";
  const hex = world.hex;

  const stellar = Array.isArray(world.stellar)
    ? world.stellar
    : world.stellar
      ? [world.stellar]
      : ["G2 V"];

  const stars = buildStars(stellar);
  const primary = stars[0];
  const hzOrbitId = primary.habitableZone?.orbitId ?? 3;
  const farStar = stars.find((s) => s.role === "far-companion");
  const companionHz = farStar?.habitableZone?.orbitId ?? 3;
  const hasFar = !!farStar;

  const gasGiants = typeof world.pbg === "object" ? world.pbg.gasGiants : 0;
  const belts = typeof world.pbg === "object" ? world.pbg.belts : 0;
  const otherRockyWorlds = Math.max(
    0,
    world.worldsInSystem - 1 - gasGiants - belts,
  );

  const isSatellite = !isAsteroid(world) && world.remarks.includes("Sa");

  const basesRaw = world.bases as unknown;
  const hasBase = (code: string) =>
    Array.isArray(basesRaw)
      ? (basesRaw as string[]).includes(code)
      : typeof basesRaw === "string" && basesRaw.includes(code);

  // Seeded RNG — deterministic for this world
  const rng = seededRng(world.hex + world.name);

  // Epoch-based orbital angles
  const currentTurn = options.currentTurn ?? 1;
  const elapsed = elapsedDaysAtTurn(currentTurn);
  const primaryMass = spectralMass(primary.spectral);
  const companionMass = farStar ? spectralMass(farStar.spectral) : primaryMass;
  const angle = (au: number, mass: number) => epochAngle(au, elapsed, mass);

  const closeCompanion = stars.find((s) => s.role === "close-companion");
  const primaryUsed = new Set<number>([
    hzOrbitId,
    ...(closeCompanion?.orbitId != null ? [closeCompanion.orbitId] : []),
  ]);
  const companionUsed = new Set<number>();
  const primaryOrbits: SystemOrbit[] = [];
  const companionOrbits: SystemOrbit[] = [];

  // ── 1. Main world (always primary, at HZ) ──────────────────────────────────
  let parentGGData: ParentGGData | undefined;
  let sggSeq = 0;
  const hzAU = ORBIT_AU[hzOrbitId] ?? 1.0;

  // need to check if sat - the if gg
  if (isSatellite) {
    const row = lookupGG(roll2d6(rng));
    let type: GasGiantType = row.Type === "SGG" ? "SGG" : "LGG";
    if (row.Type === "SGG") {
      sggSeq++;
      if (sggSeq % 2 === 0) type = "IG";
    }
    parentGGData = {
      classification: type,
      sizeCode: row.SizeCode,
      diameterMiles: row.Diameter,
      gravity: row.G,
    };
  }
  // this is not correct
  primaryOrbits.push(
    buildMainWorldOrbit(
      world,
      hzOrbitId,
      isSatellite,
      gasGiants,
      angle(hzAU, primaryMass),
      parentGGData,
    ),
  );

  // ── 2. Remaining gas giants (alternating primary / companion) ──────────────
  const remainingGGs = isSatellite && gasGiants > 0 ? gasGiants - 1 : gasGiants;
  for (let i = 0; i < remainingGGs; i++) {
    const ggIdx = isSatellite ? i + 1 : i;
    const isPrimary = !hasFar || ggIdx % 2 === 0;
    const hz = isPrimary ? hzOrbitId : companionHz;
    const used = isPrimary ? primaryUsed : companionUsed;

    const ggRow = lookupGG(roll2d6(rng));
    let type: GasGiantType = ggRow.Type === "SGG" ? "SGG" : "LGG";
    if (ggRow.Type === "SGG") {
      sggSeq++;
      if (sggSeq % 2 === 0) type = "IG";
    }

    const p2Row = lookupP2(roll2d6(rng));
    const col = type === "LGG" ? "LGG" : type === "SGG" ? "SGG" : "IG";
    const orbitId = placeOrbit(
      (hz + p2Row[col as keyof P2Row]) as number,
      used,
    );

    const au = ORBIT_AU[orbitId] ?? 0;
    const mass = isPrimary ? primaryMass : companionMass;
    const body: GasGiantBody = {
      kind: "gasGiant",
      isMainWorld: false,
      dataSource: "derived",
      classification: type,
      sizeCode: ggRow.SizeCode,
      diameterMiles: ggRow.Diameter,
      gravity: ggRow.G,
      hasRings: null,
      moons: [],
    };
    const orbit: SystemOrbit = {
      orbitId,
      au,
      zone: orbitZone(orbitId, hz),
      dataSource: "derived",
      angle0: angle(au, mass),
      body,
    };
    (isPrimary ? primaryOrbits : companionOrbits).push(orbit);
  }

  // ── 3. Belts (alternating) ─────────────────────────────────────────────────
  for (let i = 0; i < belts; i++) {
    const isPrimary = !hasFar || i % 2 === 0;
    const hz = isPrimary ? hzOrbitId : companionHz;
    const used = isPrimary ? primaryUsed : companionUsed;

    const p2Row = lookupP2(roll2d6(rng));
    const orbitId = placeOrbit(hz + p2Row.Belt, used);

    const au = ORBIT_AU[orbitId] ?? 0;
    const mass = isPrimary ? primaryMass : companionMass;
    const body: BeltBody = {
      kind: "belt",
      isMainWorld: false,
      dataSource: "derived",
    };
    const orbit: SystemOrbit = {
      orbitId,
      au,
      zone: orbitZone(orbitId, hz),
      dataSource: "derived",
      angle0: angle(au, mass),
      body,
    };
    (isPrimary ? primaryOrbits : companionOrbits).push(orbit);
  }

  // ── 4. Other worlds (alternating, absolute orbit from World1/World2) ────────
  for (let i = 0; i < otherRockyWorlds; i++) {
    const isPrimary = !hasFar || i % 2 === 0;
    const used = isPrimary ? primaryUsed : companionUsed;
    const isLast = i === otherRockyWorlds - 1;

    const p2Row = lookupP2(roll2d6(rng));
    const orbitId = placeOrbit(isLast ? p2Row.World2 : p2Row.World1, used);

    const hz = isPrimary ? hzOrbitId : companionHz;
    const au = ORBIT_AU[orbitId] ?? 0;
    const mass = isPrimary ? primaryMass : companionMass;
    const body: WorldBody = {
      kind: "world",
      isMainWorld: false,
      dataSource: "derived",
      sizeCode: null,
      diameterKm: null,
      atmosphereCode: null,
      atmosphereType: null,
      hydrographicsCode: null,
      surfaceType: null,
      tradeCodes: [],
      axialTilt: null,
      rotationPeriodH: null,
      canonicalTexture: null,
      moons: [],
      hasRings: null,
    };
    const orbit: SystemOrbit = {
      orbitId,
      au,
      zone: orbitZone(orbitId, hz),
      dataSource: "derived",
      angle0: angle(au, mass),
      body,
    };
    (isPrimary ? primaryOrbits : companionOrbits).push(orbit);
  }

  return {
    id: `${sectorAbbr}/${hex}`,
    sector: sectorAbbr,
    hex,
    name: world.name,
    dataSource: "derived",
    stars,
    orbits: primaryOrbits,
    companionOrbits,
    unplaced: [],
    counts: {
      totalWorldsInSystem: world.worldsInSystem,
      gasGiants,
      belts,
      otherRockyWorlds,
    },
    infrastructure: {
      navalBase: hasBase("N"),
      scoutBase: hasBase("S"),
      wayStation: hasBase("W"),
    },
    travelZone: world.travelZone ?? null,
  };
};

export const applySystemDataTurn = (
  systemData: SystemData,
  currentTurn: number,
): SystemData => {
  const elapsed = elapsedDaysAtTurn(currentTurn);
  const primary = systemData.stars.find((star) => star.role === "primary");
  const farStar = systemData.stars.find((star) => star.role === "far-companion");
  const primaryMass = primary ? spectralMass(primary.spectral) : 1.0;
  const companionMass = farStar ? spectralMass(farStar.spectral) : primaryMass;

  return {
    ...systemData,
    orbits: systemData.orbits.map((orbit) => ({
      ...orbit,
      angle0: epochAngle(orbit.au, elapsed, primaryMass),
    })),
    companionOrbits: systemData.companionOrbits.map((orbit) => ({
      ...orbit,
      angle0: epochAngle(orbit.au, elapsed, companionMass),
    })),
  };
};
