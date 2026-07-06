import type { World } from "../types";

export const HEX_W = 32;
export const ROW_H = 28;

export type Terrain =
  | "ocean"
  | "fluid"
  | "land"
  | "rough"
  | "woods"
  | "swamp"
  | "marsh"
  | "lake"
  | "oceanDepth"
  | "oceanAbyss"
  | "ice"
  | "frozen"
  | "desert"
  | "baked"
  | "lava"
  | "wasteland"
  | "exotic"
  | "vacuum";

export type TerrainFeature =
  | "mountain"
  | "island"
  | "crater"
  | "volcano"
  | "chasm"
  | "precipice"
  | "resource"
  | "mine"
  | "oil"
  | "starport"
  | "town"
  | "city"
  | "suburb"
  | "rural"
  | "crop"
  | "domedCity"
  | "arcology"
  | "nobleEstate"
  | "penalSettlement";

export interface HexCell {
  left: number;
  top: number;
  rowNumber: number;
  columnNumber: number;
  triangleId: number;
  isPolar: boolean;
  terrain: Terrain;
  features: TerrainFeature[];
}

export interface Point {
  x: number;
  y: number;
}

export interface WorldMapOverlay {
  points: Point[];
}

export const FEATURE_PRIORITY: TerrainFeature[] = [
  "starport",
  "arcology",
  "domedCity",
  "city",
  "town",
  "suburb",
  "penalSettlement",
  "nobleEstate",
  "mine",
  "oil",
  "resource",
  "volcano",
  "chasm",
  "precipice",
  "crater",
  "mountain",
  "rural",
  "crop",
  "island",
];

export const visibleFeatures = (hex: {
  features: TerrainFeature[];
}): TerrainFeature[] => {
  const selected = FEATURE_PRIORITY.find((feature) =>
    hex.features.includes(feature),
  );
  return selected ? [selected] : [];
};

export const LAND_BY_ATMO: Record<number, string> = {
  0: "#111111",
  1: "#5a2515",
  2: "#5f7046",
  3: "#607448",
  4: "#596d42",
  5: "#53653d",
  6: "#596f50",
  7: "#5c7052",
  8: "#586b4c",
  9: "#5d7053",
  10: "#4a3410",
  11: "#1a1a40",
  12: "#240808",
  13: "#381010",
  14: "#382010",
  15: "#1c0e06",
};

export const OCEAN_COLOR = "#1e5a9e";
export const OCEAN_DEPTH_COLOR = "#123f78";
export const OCEAN_ABYSS_COLOR = "#08234d";
export const FLUID_COLOR = "#2a6a40";
export const ROUGH_COLOR = "#766747";
export const WOODS_COLOR = "#1f4429";
export const SWAMP_COLOR = "#97ac20";
export const MARSH_COLOR = "#7f9b24";
export const LAKE_COLOR = "#2376d0";
export const ICE_COLOR = "#c4dde8";
export const FROZEN_COLOR = "#5f8fa8";
export const DESERT_COLOR = "#8a7652";
export const BAKED_COLOR = "#9c5820";
export const LAVA_COLOR = "#8b1010";
export const WASTELAND_COLOR = "#4d4638";
export const EXOTIC_COLOR = "#6d2f7f";
export const VACUUM_COLOR = "#666666";

const EHEX: Record<string, number> = { G: 16, H: 17, I: 18 };

export const uwpVal = (c: string): number => {
  if (!c || c === "?") return 0;
  const n = EHEX[c] ?? parseInt(c, 16);
  return isNaN(n) ? 0 : n;
};

export const isAsteroid = (world: { uwp: { size: string } }): boolean =>
  uwpVal(world.uwp.size) === 0;

//export const isSatellite = (world: { remarks:[] }): boolean =>
//remarks.

// this should driven by

export const terrainColor = (t: Terrain, landColor: string): string => {
  switch (t) {
    case "ocean":
      return OCEAN_COLOR;
    case "oceanDepth":
      return OCEAN_DEPTH_COLOR;
    case "oceanAbyss":
      return OCEAN_ABYSS_COLOR;
    case "fluid":
      return FLUID_COLOR;
    case "rough":
      return ROUGH_COLOR;
    case "woods":
      return WOODS_COLOR;
    case "swamp":
      return SWAMP_COLOR;
    case "marsh":
      return MARSH_COLOR;
    case "lake":
      return LAKE_COLOR;
    case "ice":
      return ICE_COLOR;
    case "frozen":
      return FROZEN_COLOR;
    case "desert":
      return DESERT_COLOR;
    case "baked":
      return BAKED_COLOR;
    case "lava":
      return LAVA_COLOR;
    case "wasteland":
      return WASTELAND_COLOR;
    case "exotic":
      return EXOTIC_COLOR;
    case "vacuum":
      return VACUUM_COLOR;
    default:
      return landColor;
  }
};

export const svgDimensions = (S: number) => ({
  svgW: Math.max(1000, 5.5 * (S + 1) * HEX_W),
  svgH: (3 * S + 1) * ROW_H,
});

// SVG polygon points string
export const hexPts = (left: number, top: number): string =>
  `${left + 16},${top} ${left + 32},${top + 7} ${left + 32},${top + 28} ${left + 16},${top + 35} ${left},${top + 28} ${left},${top + 7}`;

// Canvas-drawable vertex pairs
export const hexVerts = (left: number, top: number): [number, number][] => [
  [left + 16, top],
  [left + 32, top + 7],
  [left + 32, top + 28],
  [left + 16, top + 35],
  [left, top + 28],
  [left, top + 7],
];

const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hashStr = (str: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const triangleNumber = (n: number): number => (n * (n + 1)) / 2;

const rollD6 = (rand: () => number): number => Math.floor(rand() * 6) + 1;

const shuffled = <T>(items: T[], rand: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const addFeature = (hex: HexCell, feature: TerrainFeature) => {
  if (!hex.features.includes(feature)) hex.features.push(feature);
};

const removeFeature = (hex: HexCell, feature: TerrainFeature) => {
  hex.features = hex.features.filter((item) => item !== feature);
};

const isLiquidTerrain = (terrain: Terrain) =>
  terrain === "ocean" ||
  terrain === "oceanDepth" ||
  terrain === "oceanAbyss" ||
  terrain === "fluid";

const isNaturalLandTerrain = (terrain: Terrain) =>
  terrain === "land" ||
  terrain === "rough" ||
  terrain === "woods" ||
  terrain === "swamp" ||
  terrain === "marsh";

const isSolidSurfaceTerrain = (terrain: Terrain) =>
  !isLiquidTerrain(terrain) &&
  terrain !== "ice" &&
  terrain !== "frozen" &&
  terrain !== "lake" &&
  terrain !== "vacuum";

const preserveIslandAsMountain = (hex: HexCell) => {
  if (!hex.features.includes("island")) return;
  removeFeature(hex, "island");
  addFeature(hex, "mountain");
};

const freezeHex = (hex: HexCell) => {
  if (hex.terrain === "ice") return;
  if (isLiquidTerrain(hex.terrain)) {
    preserveIslandAsMountain(hex);
    hex.terrain = "ice";
    return;
  }
  hex.terrain = "frozen";
};

const heatHex = (hex: HexCell) => {
  if (isLiquidTerrain(hex.terrain) || hex.terrain === "ice") {
    preserveIslandAsMountain(hex);
    hex.terrain = "desert";
    return;
  }
  hex.terrain = "baked";
};

const moltenHex = (hex: HexCell) => {
  if (isLiquidTerrain(hex.terrain) || hex.terrain === "ice") {
    preserveIslandAsMountain(hex);
    hex.terrain = "lava";
    return;
  }
  hex.terrain = "baked";
};

const isLandLike = (hex: HexCell) =>
  !isLiquidTerrain(hex.terrain) || hex.features.includes("island");

const centerOfHex = (hex: HexCell) => ({
  x: hex.left + 16,
  y: hex.top + 17,
});

const neighborIndexes = (cells: HexCell[], index: number): number[] => {
  const center = centerOfHex(cells[index]);
  const neighbors: number[] = [];

  cells.forEach((candidate, candidateIndex) => {
    if (candidateIndex === index) return;
    const candidateCenter = centerOfHex(candidate);
    const dx = Math.abs(candidateCenter.x - center.x);
    const dy = Math.abs(candidateCenter.y - center.y);
    if (dx <= HEX_W && dy <= ROW_H) {
      neighbors.push(candidateIndex);
    }
  });

  return neighbors;
};

const setOceanTerrain = (
  hex: HexCell,
  liquidTerrain: Terrain,
  tcs: Set<string>,
) => {
  if (tcs.has("Va") && !(tcs.has("Mo") || tcs.has("Vh") || tcs.has("Fr")))
    return;
  hex.terrain = liquidTerrain;
  if (hex.features.includes("mountain")) {
    removeFeature(hex, "mountain");
    addFeature(hex, "island");
  }
};

const naturalLandHexes = (cells: HexCell[]) =>
  cells.filter(
    (hex) =>
      isNaturalLandTerrain(hex.terrain) && !hex.features.includes("island"),
  );

const placeNaturalTerrain = (
  cells: HexCell[],
  terrain: Terrain,
  count: number,
  rand: () => number,
  candidates = naturalLandHexes(cells),
) => {
  shuffled(candidates, rand)
    .slice(0, Math.min(count, candidates.length))
    .forEach((hex) => {
      hex.terrain = terrain;
    });
};

const placeSurfaceTerrain = (
  cells: HexCell[],
  terrain: Terrain,
  count: number,
  rand: () => number,
  candidates = cells.filter(
    (hex) =>
      isSolidSurfaceTerrain(hex.terrain) && !hex.features.includes("island"),
  ),
) => {
  shuffled(candidates, rand)
    .slice(0, Math.min(count, candidates.length))
    .forEach((hex) => {
      hex.terrain = terrain;
      if (terrain === "exotic") {
        removeFeature(hex, "mountain");
        removeFeature(hex, "crater");
        removeFeature(hex, "chasm");
        removeFeature(hex, "precipice");
      }
    });
};

const placeCraters = (cells: HexCell[], count: number, rand: () => number) => {
  const candidates = cells.filter(
    (hex) =>
      !isLiquidTerrain(hex.terrain) &&
      hex.terrain !== "ice" &&
      hex.terrain !== "lake" &&
      !hex.features.includes("island"),
  );

  shuffled(candidates, rand)
    .slice(0, Math.min(count, candidates.length))
    .forEach((hex) => addFeature(hex, "crater"));
};

const placeVolcanoes = (
  cells: HexCell[],
  count: number,
  rand: () => number,
) => {
  const candidates = cells.filter(
    (hex) =>
      !isLiquidTerrain(hex.terrain) &&
      hex.terrain !== "ice" &&
      hex.terrain !== "frozen" &&
      hex.terrain !== "lake" &&
      hex.terrain !== "vacuum" &&
      !hex.features.includes("island"),
  );
  const preferred = candidates.filter(
    (hex) =>
      hex.terrain === "lava" ||
      hex.terrain === "baked" ||
      hex.terrain === "rough" ||
      hex.terrain === "desert" ||
      hex.features.includes("mountain"),
  );
  const pool = preferred.length >= count ? preferred : candidates;

  shuffled(pool, rand)
    .slice(0, Math.min(count, pool.length))
    .forEach((hex) => {
      addFeature(hex, "volcano");
      if (hex.features.includes("mountain")) removeFeature(hex, "mountain");
    });
};

const solidFractureCandidates = (cells: HexCell[]) =>
  cells.filter(
    (hex) =>
      !isLiquidTerrain(hex.terrain) &&
      hex.terrain !== "ice" &&
      hex.terrain !== "frozen" &&
      hex.terrain !== "lake" &&
      !hex.features.includes("island") &&
      !hex.features.includes("volcano"),
  );

const placeFractures = (
  cells: HexCell[],
  chasmCount: number,
  precipiceCount: number,
  rand: () => number,
) => {
  const candidates = solidFractureCandidates(cells);
  const preferred = candidates.filter(
    (hex) =>
      hex.terrain === "vacuum" ||
      hex.terrain === "rough" ||
      hex.terrain === "desert" ||
      hex.terrain === "baked" ||
      hex.terrain === "lava" ||
      hex.features.includes("mountain") ||
      hex.features.includes("crater"),
  );
  const pool = preferred.length > 0 ? preferred : candidates;

  const selectedChasms = shuffled(pool, rand).slice(
    0,
    Math.min(chasmCount, pool.length),
  );
  selectedChasms.forEach((hex) => addFeature(hex, "chasm"));

  const remaining = pool.filter((hex) => !hex.features.includes("chasm"));
  shuffled(remaining, rand)
    .slice(0, Math.min(precipiceCount, remaining.length))
    .forEach((hex) => addFeature(hex, "precipice"));
};

const placeEconomicFeatures = (
  cells: HexCell[],
  world: World,
  rand: () => number,
  tcs: Set<string>,
) => {
  const solidCandidates = cells.filter(
    (hex) =>
      (isSolidSurfaceTerrain(hex.terrain) || hex.terrain === "vacuum") &&
      !hex.features.includes("island") &&
      !hex.features.includes("volcano"),
  );

  const resourceCount = Math.max(
    1,
    Math.floor(
      (rollD6(rand) + (tcs.has("Ri") ? 1 : 0) + (tcs.has("In") ? 1 : 0)) / 3,
    ),
  );
  shuffled(solidCandidates, rand)
    .slice(0, Math.min(resourceCount, solidCandidates.length))
    .forEach((hex) => addFeature(hex, "resource"));

  const mineCandidates = solidCandidates.filter(
    (hex) =>
      hex.terrain === "rough" ||
      hex.terrain === "desert" ||
      hex.terrain === "wasteland" ||
      hex.terrain === "vacuum" ||
      hex.features.includes("mountain") ||
      hex.features.includes("crater") ||
      hex.features.includes("chasm") ||
      hex.features.includes("precipice"),
  );
  const minePressure =
    (tcs.has("In") ? 2 : 0) +
    (tcs.has("Po") ? 1 : 0) +
    (tcs.has("Ni") ? 1 : 0) +
    (mineCandidates.length > 0 ? rollD6(rand) : 0);
  shuffled(mineCandidates, rand)
    .slice(
      0,
      Math.min(
        Math.max(1, Math.floor(minePressure / 4)),
        mineCandidates.length,
      ),
    )
    .forEach((hex) => {
      removeFeature(hex, "resource");
      addFeature(hex, "mine");
    });

  const hydro = uwpVal(world.uwp.hydrographics);
  const oilCandidates = cells.filter(
    (hex) =>
      (hex.terrain === "swamp" ||
        hex.terrain === "marsh" ||
        hex.terrain === "lake" ||
        hex.terrain === "woods" ||
        hex.terrain === "land") &&
      !hex.features.includes("volcano"),
  );
  const oilPressure =
    hydro > 4 && !tcs.has("Va") && !tcs.has("Mo") && !tcs.has("Vh")
      ? rollD6(rand) + (tcs.has("Ag") ? 1 : 0) + (tcs.has("Ga") ? 1 : 0)
      : 0;
  if (oilPressure > 0) {
    shuffled(oilCandidates, rand)
      .slice(
        0,
        Math.min(
          Math.max(1, Math.floor(oilPressure / 4)),
          oilCandidates.length,
        ),
      )
      .forEach((hex) => {
        removeFeature(hex, "resource");
        addFeature(hex, "oil");
      });
  }
};

const settlementCandidates = (cells: HexCell[]) => {
  const preferred = cells.filter(
    (hex) =>
      (hex.terrain === "land" ||
        hex.terrain === "rough" ||
        hex.terrain === "woods" ||
        hex.terrain === "marsh" ||
        hex.terrain === "swamp" ||
        hex.terrain === "desert" ||
        hex.terrain === "wasteland" ||
        hex.terrain === "exotic") &&
      !hex.features.includes("volcano"),
  );

  if (preferred.length > 0) return preferred;

  return cells.filter(
    (hex) =>
      (isSolidSurfaceTerrain(hex.terrain) || hex.features.includes("island")) &&
      !hex.features.includes("volcano"),
  );
};

const placeSettlements = (
  cells: HexCell[],
  world: World,
  rand: () => number,
  tcs: Set<string>,
) => {
  const starport = world.uwp.starport?.toUpperCase();
  const pop = uwpVal(world.uwp.population);
  if (starport && starport !== "X" && starport !== "?") {
    const portCandidates = settlementCandidates(cells).filter(
      (hex) =>
        hex.terrain !== "lava" &&
        hex.terrain !== "ice" &&
        hex.terrain !== "frozen",
    );
    const [portHex] = shuffled(portCandidates, rand);
    if (portHex) {
      addFeature(portHex, "starport");
      removeFeature(portHex, "crater");
      removeFeature(portHex, "chasm");
      removeFeature(portHex, "precipice");
    }
  }

  if (pop <= 0) return;

  const baseCandidates = settlementCandidates(cells).filter(
    (hex) =>
      hex.terrain !== "lava" &&
      hex.terrain !== "ice" &&
      hex.terrain !== "frozen" &&
      !hex.features.includes("starport") &&
      !hex.features.includes("mine") &&
      !hex.features.includes("oil"),
  );

  const cityCount =
    pop >= 8 ? Math.min(3, Math.max(1, pop - 7)) : pop >= 6 ? 1 : 0;
  const townCount =
    pop >= 4 ? Math.min(6, Math.max(1, pop - 3)) : pop >= 2 ? 1 : 0;
  const suburbCount =
    pop >= 8 ? Math.min(8, pop - 6 + (tcs.has("Hi") ? 2 : 0)) : 0;

  const cities = shuffled(baseCandidates, rand).slice(
    0,
    Math.min(cityCount, baseCandidates.length),
  );
  cities.forEach((hex) => {
    addFeature(hex, "city");
    removeFeature(hex, "resource");
    removeFeature(hex, "crater");
    removeFeature(hex, "chasm");
    removeFeature(hex, "precipice");
  });

  const remainingForTowns = baseCandidates.filter(
    (hex) => !hex.features.includes("city"),
  );
  shuffled(remainingForTowns, rand)
    .slice(0, Math.min(townCount, remainingForTowns.length))
    .forEach((hex) => {
      addFeature(hex, "town");
      removeFeature(hex, "resource");
    });

  const remainingForSuburbs = baseCandidates.filter(
    (hex) => !hex.features.includes("city") && !hex.features.includes("town"),
  );
  shuffled(remainingForSuburbs, rand)
    .slice(0, Math.min(suburbCount, remainingForSuburbs.length))
    .forEach((hex) => addFeature(hex, "suburb"));
};

const placeCivilizationLayers = (
  cells: HexCell[],
  world: World,
  rand: () => number,
  tcs: Set<string>,
) => {
  const pop = uwpVal(world.uwp.population);
  const atmo = uwpVal(world.uwp.atmosphere);
  const hydro = uwpVal(world.uwp.hydrographics);
  if (pop <= 0) return;

  const settled = settlementCandidates(cells).filter(
    (hex) =>
      !hex.features.includes("starport") &&
      !hex.features.includes("city") &&
      !hex.features.includes("town") &&
      !hex.features.includes("suburb") &&
      !hex.features.includes("mine") &&
      !hex.features.includes("oil") &&
      hex.terrain !== "lava" &&
      hex.terrain !== "ice" &&
      hex.terrain !== "frozen",
  );

  if (
    tcs.has("Ag") ||
    tcs.has("Ga") ||
    (atmo >= 4 && atmo <= 9 && hydro >= 4)
  ) {
    const cropCandidates = settled.filter(
      (hex) =>
        hex.terrain === "land" ||
        hex.terrain === "woods" ||
        hex.terrain === "marsh" ||
        hex.terrain === "swamp",
    );
    shuffled(cropCandidates, rand)
      .slice(
        0,
        Math.min(
          Math.max(1, Math.floor((rollD6(rand) + hydro) / 4)),
          cropCandidates.length,
        ),
      )
      .forEach((hex) => {
        addFeature(hex, "crop");
        removeFeature(hex, "resource");
      });
  }

  const ruralCandidates = settled.filter(
    (hex) =>
      !hex.features.includes("crop") &&
      (hex.terrain === "land" ||
        hex.terrain === "woods" ||
        hex.terrain === "rough" ||
        hex.terrain === "marsh"),
  );
  if (pop >= 3 && ruralCandidates.length > 0) {
    shuffled(ruralCandidates, rand)
      .slice(
        0,
        Math.min(Math.max(1, Math.floor(pop / 2)), ruralCandidates.length),
      )
      .forEach((hex) => addFeature(hex, "rural"));
  }

  const hostileSurface =
    atmo <= 3 || atmo >= 10 || tcs.has("Va") || tcs.has("Fl") || tcs.has("De");
  if (hostileSurface && pop >= 6) {
    const protectedCandidates = settlementCandidates(cells).filter(
      (hex) =>
        !hex.features.includes("starport") &&
        !hex.features.includes("domedCity") &&
        !hex.features.includes("arcology") &&
        hex.terrain !== "lava" &&
        hex.terrain !== "ice" &&
        hex.terrain !== "frozen",
    );
    const [domed] = shuffled(protectedCandidates, rand);
    if (domed) {
      addFeature(domed, "domedCity");
      removeFeature(domed, "town");
      removeFeature(domed, "suburb");
    }

    if (pop >= 9) {
      const [arcology] = shuffled(
        protectedCandidates.filter((hex) => hex !== domed),
        rand,
      );
      if (arcology) {
        addFeature(arcology, "arcology");
        removeFeature(arcology, "city");
        removeFeature(arcology, "town");
        removeFeature(arcology, "suburb");
      }
    }
  }

  if (
    (world.nobility || "").trim().length > 0 ||
    tcs.has("Ri") ||
    tcs.has("Cp")
  ) {
    const [estate] = shuffled(
      settled.filter(
        (hex) =>
          !hex.features.includes("crop") &&
          !hex.features.includes("rural") &&
          !hex.features.includes("nobleEstate"),
      ),
      rand,
    );
    if (estate) addFeature(estate, "nobleEstate");
  }

  if (
    world.travelZone === "R" ||
    tcs.has("Px") ||
    tcs.has("Pr") ||
    tcs.has("Da")
  ) {
    const [penal] = shuffled(
      settlementCandidates(cells).filter(
        (hex) =>
          !hex.features.includes("starport") &&
          !hex.features.includes("city") &&
          !hex.features.includes("town") &&
          !hex.features.includes("domedCity") &&
          !hex.features.includes("arcology"),
      ),
      rand,
    );
    if (penal) addFeature(penal, "penalSettlement");
  }
};

const getTriangleCenterIndexes = (
  cells: HexCell[],
  triangleId: number,
): number[] => {
  const triangleIndexes = cells
    .map((hex, index) => ({ hex, index }))
    .filter(({ hex }) => hex.triangleId === triangleId);
  if (triangleIndexes.length === 0) return [];

  const average = triangleIndexes.reduce(
    (acc, { hex }) => {
      const center = centerOfHex(hex);
      return { x: acc.x + center.x, y: acc.y + center.y };
    },
    { x: 0, y: 0 },
  );
  average.x /= triangleIndexes.length;
  average.y /= triangleIndexes.length;

  return triangleIndexes
    .map(({ hex, index }) => {
      const center = centerOfHex(hex);
      return {
        index,
        distance: Math.hypot(center.x - average.x, center.y - average.y),
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ index }) => index);
};

export const buildHexGrid = (S: number, L: number, T: number): HexCell[] => {
  const hexes: HexCell[] = [];

  const makeHex = (
    left: number,
    top: number,
    triangleId: number,
    isPolar: boolean,
  ): HexCell => ({
    left,
    top,
    rowNumber: Math.round((top - T) / ROW_H),
    columnNumber: Math.round((left - L) / 16),
    triangleId,
    isPolar,
    terrain: "land",
    features: [],
  });

  for (let id = 0; id < 20; id++) {
    const baseLeft = Math.floor(id / 4);
    const vertPos = id % 4;

    let left = 0,
      top = 0,
      isUp = true,
      isSmall = false;

    switch (vertPos) {
      case 0:
        left = L + 16 + baseLeft * S * HEX_W;
        top = T;
        isUp = true;
        isSmall = true;
        break;
      case 1:
        left = L + 16 + baseLeft * S * HEX_W;
        top = T + (S - 2) * ROW_H;
        isUp = false;
        isSmall = false;
        break;
      case 2:
        left = L + S * 16 + baseLeft * S * HEX_W;
        top = T + S * ROW_H;
        isUp = true;
        isSmall = false;
        break;
      case 3:
        left = L + S * 16 + baseLeft * S * HEX_W + HEX_W;
        top = T + S * 56 - ROW_H;
        isUp = false;
        isSmall = true;
        break;
    }

    const hexPerSide = isSmall ? S - 1 : S;

    if (isUp) {
      for (let i = 0; i < hexPerSide; i++) {
        for (let j = 0; j <= i; j++) {
          hexes.push(
            makeHex(
              left + j * HEX_W + (hexPerSide - i) * 16,
              top + i * ROW_H,
              id,
              isSmall,
            ),
          );
        }
      }
    } else {
      for (let i = 0; i < hexPerSide; i++) {
        for (let j = 0; j < hexPerSide - i; j++) {
          hexes.push(
            makeHex(
              left + j * HEX_W + i * 16,
              top + (i + 1) * ROW_H,
              id,
              isSmall,
            ),
          );
        }
      }
    }
  }

  return hexes;
};

const copyHex = (hex: HexCell, left: number): HexCell => ({
  ...hex,
  features: [...hex.features],
  left,
  columnNumber: Math.round(left / 16),
});

export const buildDisplayHexes = (hexes: HexCell[], S: number): HexCell[] => {
  if (S <= 1) return hexes;

  const displayHexes = [...hexes];
  const byRowCol = new Map<string, HexCell>();
  hexes.forEach((hex) => {
    byRowCol.set(`${hex.columnNumber}:${hex.rowNumber}`, hex);
  });

  const getHex = (column: number, row: number) =>
    byRowCol.get(`${column}:${row}`);

  const wrapOffset = 5 * S * HEX_W;

  hexes
    .filter((hex) => hex.triangleId === 0 || hex.triangleId === 1)
    .forEach((hex) => {
      displayHexes.push(copyHex(hex, hex.left + wrapOffset));
    });

  const totalRows = 3 * S - 1;

  for (let z = 0; z < 5; z++) {
    const startCol = S + S * 2 * z;
    let x = startCol;
    for (let y = 0; y < S - 1; y++) {
      const selected = getHex(x, y);
      if (selected) {
        displayHexes.push(
          copyHex(selected, selected.left + (S - y - 1) * HEX_W),
        );
      }
      x++;
    }
  }

  for (let z = 0; z < 5; z++) {
    const startCol = S * 2 * (z + 1);
    let x = startCol;
    for (let y = totalRows - 1; y > totalRows - S; y--) {
      const selected = getHex(x, y);
      if (selected) {
        const edgeOffset = (S - (totalRows - y)) * HEX_W;
        displayHexes.push(
          copyHex(
            selected,
            selected.left + edgeOffset - (z === 4 ? wrapOffset : 0),
          ),
        );
      }
      x++;
    }
  }

  const triangle18 = hexes.filter((hex) => hex.triangleId === 18);
  const lastTriangle18Hex = triangle18[triangle18.length - 1];
  if (lastTriangle18Hex) {
    displayHexes.push(
      copyHex(lastTriangle18Hex, lastTriangle18Hex.left - wrapOffset),
    );
  }

  return displayHexes;
};

const triangleOutlinePoints = (
  triangleHexes: HexCell[],
  S: number,
): Point[] | null => {
  if (triangleHexes.length === 0) return null;

  const triangleId = triangleHexes[0].triangleId;
  const verticalPos = triangleId % 4;
  const isUp = verticalPos === 0 || verticalPos === 2;
  const isSmall = verticalPos === 0 || verticalPos === 3;

  if (isUp) {
    if (isSmall) {
      return [
        { x: triangleHexes[0].left, y: triangleHexes[0].top - 10 },
        {
          x: triangleHexes[triangleHexes.length - 1].left + 32,
          y: triangleHexes[triangleHexes.length - 1].top + 45,
        },
        {
          x: triangleHexes[triangleHexes.length - S + 1].left - 32,
          y: triangleHexes[triangleHexes.length - S + 1].top + 45,
        },
      ];
    }

    return [
      { x: triangleHexes[0].left, y: triangleHexes[0].top - 10 },
      {
        x: triangleHexes[triangleHexes.length - 1].left + 16,
        y: triangleHexes[triangleHexes.length - 1].top + 17,
      },
      {
        x: triangleHexes[triangleHexes.length - S + 1].left - 48,
        y: triangleHexes[triangleHexes.length - S + 1].top + 17,
      },
    ];
  }

  if (!isSmall) {
    return [
      { x: triangleHexes[0].left - 16, y: triangleHexes[0].top + 17 },
      { x: triangleHexes[S - 1].left + 16, y: triangleHexes[S - 1].top + 17 },
      {
        x: triangleHexes[triangleHexes.length - 1].left,
        y: triangleHexes[triangleHexes.length - 1].top + 45,
      },
    ];
  }

  return [
    { x: triangleHexes[0].left - 32, y: triangleHexes[0].top - 10 },
    { x: triangleHexes[S - 2].left + 32, y: triangleHexes[S - 2].top - 10 },
    {
      x: triangleHexes[triangleHexes.length - 1].left,
      y: triangleHexes[triangleHexes.length - 1].top + 45,
    },
  ];
};

export const buildWorldTriangleOutlines = (
  hexes: HexCell[],
  S: number,
): Array<Point[] | null> =>
  Array.from({ length: 20 }, (_, triangleId) => {
    const triangleHexes = hexes.filter((hex) => hex.triangleId === triangleId);
    return triangleOutlinePoints(triangleHexes, S);
  });

export const buildWorldMapOverlays = (
  hexes: HexCell[],
  S: number,
): WorldMapOverlay[] => {
  if (S <= 1) return [];

  const wrapOffset = 5 * S * HEX_W;
  const topCoverTrianglePoints: Point[] = [];
  const bottomCoverTrianglePoints: Point[] = [];
  const mapCornerPoints: Point[] = [];

  const collectTriangle = (triangleId: number, leftOffset = 0) => {
    const triangleHexes = hexes
      .filter((hex) => hex.triangleId === triangleId)
      .map((hex) => copyHex(hex, hex.left + leftOffset));
    const outline = triangleOutlinePoints(triangleHexes, S);
    if (!outline) return;

    const verticalPos = triangleId % 4;
    if (verticalPos === 0) {
      topCoverTrianglePoints.push(outline[0], outline[1]);
      if (triangleId === 0) mapCornerPoints.push(outline[0]);
    }
    if (verticalPos === 3) {
      bottomCoverTrianglePoints.push(outline[0], outline[2]);
      if (triangleId === 3 || triangleId === 19)
        mapCornerPoints.push(outline[2]);
    }
    if (verticalPos === 1 && triangleId === 1) {
      mapCornerPoints.push(outline[2]);
    }
  };

  for (let triangleId = 0; triangleId < 20; triangleId++) {
    collectTriangle(triangleId);
  }
  collectTriangle(0, wrapOffset);
  collectTriangle(1, wrapOffset);

  const overlays: WorldMapOverlay[] = [];

  for (let i = 0; i < 10; i += 2) {
    overlays.push({
      points: [
        topCoverTrianglePoints[i],
        topCoverTrianglePoints[i + 1],
        topCoverTrianglePoints[i + 2],
      ],
    });
  }

  for (let i = 0; i < 8; i += 2) {
    overlays.push({
      points: [
        bottomCoverTrianglePoints[i + 1],
        bottomCoverTrianglePoints[i + 2],
        bottomCoverTrianglePoints[i + 3],
      ],
    });
  }

  const [leftTop, leftMid, leftBottom, rightBottom, rightTop, rightMid] =
    mapCornerPoints;
  const { svgW } = svgDimensions(S);
  if (leftTop && leftMid && leftBottom) {
    overlays.push({
      points: [
        { x: 0, y: leftTop.y },
        leftTop,
        { x: leftTop.x, y: leftBottom.y + 18 },
        { x: 0, y: leftBottom.y + 18 },
      ],
    });
    overlays.push({
      points: [
        { x: leftMid.x - 1, y: leftMid.y },
        leftBottom,
        { x: leftMid.x - 1, y: leftBottom.y },
      ],
    });
  }

  if (rightTop && rightMid && rightBottom) {
    overlays.push({
      points: [
        rightTop,
        { x: svgW, y: rightTop.y },
        { x: svgW, y: rightMid.y + 18 },
        { x: rightTop.x, y: rightMid.y + 18 },
      ],
    });
    overlays.push({
      points: [
        { x: rightMid.x + 1, y: rightMid.y },
        rightBottom,
        { x: rightMid.x + 1, y: rightBottom.y },
      ],
    });
  }

  return overlays.filter((overlay) => overlay.points.every(Boolean));
};

export const assignTerrain = (
  hexes: HexCell[],
  world: World,
  _totalH: number,
): HexCell[] => {
  void _totalH;
  const rand = mulberry32(hashStr(world.hex + world.name));
  const atmo = uwpVal(world.uwp.atmosphere);
  const hydro = uwpVal(world.uwp.hydrographics);
  const size = uwpVal(world.uwp.size);

  // Trade codes — remarks is string[] in the JSON data
  const tcs = new Set(Array.isArray(world.remarks) ? world.remarks : []);
  const isVac = size === 0 || atmo === 0 || tcs.has("Va");
  const isWa = tcs.has("Wa"); // water world — all ocean
  const isFl = tcs.has("Fl"); // fluid (exotic liquid) oceans
  const isIc = tcs.has("Ic"); // ice-capped — extra polar rows
  const isDe = tcs.has("De"); // desert world
  const isFr = tcs.has("Fr"); // frozen — all surfaces frozen
  const isVh = tcs.has("Vh"); // very hot — baked lands, no liquid
  const isMo = tcs.has("Mo"); // molten — lava oceans, baked land
  const isTu = tcs.has("Tu"); // tundra — frozen polar bands
  const isPo = tcs.has("Po"); // poor — often scarred or exhausted surface
  const isIn = tcs.has("In"); // industrial — visible wasteland pressure

  const cells = hexes.map((h) => ({ ...h, features: [...h.features] }));
  const liquidTerrain: Terrain = isFl ? "fluid" : "ocean";

  // ── Vacuum ──────────────────────────────────────────────────────────────────
  if (isVac) {
    cells.forEach((h) => {
      h.terrain = "vacuum";
      h.features = [];
    });
    placeCraters(cells, rollD6(rand) + rollD6(rand) + rollD6(rand), rand);
    placeFractures(
      cells,
      rollD6(rand),
      Math.max(1, Math.floor(rollD6(rand) / 2)),
      rand,
    );
    return cells;
  }

  // ── Mountains ───────────────────────────────────────────────────────────────
  const triangles = Array.from({ length: 20 }, (_, triangleId) =>
    cells
      .map((hex, index) => ({ hex, index }))
      .filter(({ hex }) => hex.triangleId === triangleId),
  );

  if (size <= 1) {
    shuffled(cells, rand)
      .slice(0, rollD6(rand))
      .forEach((hex) => addFeature(hex, "mountain"));
  } else {
    triangles.forEach((triangle) => {
      const mountainCount = Math.min(rollD6(rand), triangleNumber(size - 1));
      shuffled(triangle, rand)
        .slice(0, mountainCount)
        .forEach(({ hex }) => addFeature(hex, "mountain"));
    });
  }

  // ── Ocean flood fill ────────────────────────────────────────────────────────
  let skipSeas = false;

  if (isWa || hydro === 10) {
    cells.forEach((hex) => setOceanTerrain(hex, liquidTerrain, tcs));
    skipSeas = true;
  } else if (hydro > 0 && size < 5 && hydro > 7) {
    const oceanCount = Math.floor(cells.length * 0.1 * hydro);
    shuffled(cells, rand)
      .slice(0, oceanCount)
      .forEach((hex) => setOceanTerrain(hex, liquidTerrain, tcs));
    skipSeas = true;
  } else if (hydro > 0) {
    shuffled(
      Array.from({ length: 20 }, (_, triangleId) => triangleId),
      rand,
    )
      .slice(0, Math.min(20, hydro * 2))
      .forEach((triangleId) => {
        const ocean = new Set<number>();
        const centerIndexes = getTriangleCenterIndexes(cells, triangleId);
        centerIndexes.forEach((index) => {
          if (!isLiquidTerrain(cells[index].terrain)) ocean.add(index);
        });

        const triangleSize = cells.filter(
          (hex) => hex.triangleId === triangleId,
        ).length;
        while (ocean.size < triangleSize) {
          const edgeIndexes = Array.from(ocean);
          const candidates = new Set<number>();
          edgeIndexes.forEach((index) => {
            neighborIndexes(cells, index).forEach((neighborIndex) => {
              if (
                !ocean.has(neighborIndex) &&
                !isLiquidTerrain(cells[neighborIndex].terrain)
              ) {
                candidates.add(neighborIndex);
              }
            });
          });

          if (candidates.size === 0) break;
          const candidateList = Array.from(candidates);
          ocean.add(candidateList[Math.floor(rand() * candidateList.length)]);
        }

        ocean.forEach((index) =>
          setOceanTerrain(cells[index], liquidTerrain, tcs),
        );
      });
  }

  // ── Seas ────────────────────────────────────────────────────────────────────
  if (!skipSeas && hydro > 0) {
    const continents = triangles
      .map((triangle) => triangle.map(({ hex }) => hex).filter(isLandLike))
      .filter((continent) => continent.length > 0);

    if (continents.length > hydro) {
      shuffled(continents, rand)
        .slice(0, hydro)
        .forEach((continent) => {
          const selected = shuffled(continent, rand)[0];
          if (selected) setOceanTerrain(selected, liquidTerrain, tcs);
        });
    }
  }

  // ── Ice caps ─────────────────────────────────────────────────────────────────
  // Source formula: floor(hydro/2) - 1 rows; Ic adds 1. Row count is relative to
  // actualTotalRows = 3*size - 1 (not our fixed render size), so small worlds get
  // proportionally larger polar caps than large ones at the same hydro value.
  const actualTotalRows = Math.max(1, 3 * size - 1);
  const iceCapRows = Math.floor(hydro / 2) - 1 + (isIc ? rollD6(rand) : 0);

  if (iceCapRows >= 0) {
    cells.forEach((h) => {
      const rowFromSouth = actualTotalRows - h.rowNumber - 1;
      if (h.rowNumber < iceCapRows || rowFromSouth < iceCapRows) {
        removeFeature(h, "island");
        h.terrain = "ice";
      }
    });
  }

  // ── Planet-wide climate transforms ──────────────────────────────────────────
  // Applied after ice caps so source oceans/continents still shape the result.
  if (isFr) {
    cells.forEach(freezeHex);
  }

  if (isVh) {
    cells.forEach(heatHex);
  }

  if (isMo) {
    cells.forEach(moltenHex);
  }

  if (isTu && !isFr && !isVh && !isMo) {
    const tundraRows = rollD6(rand);
    cells.forEach((h) => {
      const rowFromSouth = actualTotalRows - h.rowNumber - 1;
      if (
        h.terrain !== "ice" &&
        (h.rowNumber < tundraRows || rowFromSouth < tundraRows)
      ) {
        freezeHex(h);
      }
    });
  }

  // ── Desert ───────────────────────────────────────────────────────────────────
  if (isDe) {
    cells.forEach((h) => {
      if (h.terrain === "land") h.terrain = "desert";
    });
  }

  // Fallback desert scatter for dry worlds without the De code
  if (!isFr && !isVh && !isMo && hydro <= 2 && atmo >= 2) {
    cells.forEach((h) => {
      if (h.terrain === "land" && rand() < 0.45) h.terrain = "desert";
    });
  }

  // Fallback lava scatter for hot-atmo worlds without Mo code (atmo 10-12, no liquid)
  if (!isFr && !isVh && !isMo && atmo >= 10 && atmo <= 12 && hydro === 0) {
    cells.forEach((h) => {
      if (h.terrain === "land" && rand() < 0.3) h.terrain = "lava";
    });
  }

  // ── Natural terrain ─────────────────────────────────────────────────────────
  // Traveller Worlds adds a sparse natural pass at world-hex scale: rough,
  // woods, wetland, and lakes. Keep it away from harsh climate overrides.
  if (!isFr && !isVh && !isMo && !isDe) {
    const baseLand = naturalLandHexes(cells);
    if (baseLand.length > 0) {
      placeNaturalTerrain(
        cells,
        "rough",
        rollD6(rand) + rollD6(rand),
        rand,
        baseLand,
      );

      if (atmo > 2 && atmo < 11 && hydro > 0) {
        placeNaturalTerrain(
          cells,
          "woods",
          rollD6(rand) + rollD6(rand),
          rand,
          naturalLandHexes(cells),
        );
      }

      if (hydro > 1) {
        shuffled(naturalLandHexes(cells), rand)
          .slice(
            0,
            Math.min(
              rollD6(rand) + rollD6(rand),
              naturalLandHexes(cells).length,
            ),
          )
          .forEach((hex) => {
            hex.terrain = hex.terrain === "woods" ? "swamp" : "marsh";
          });
      }

      if (hydro > 0) {
        placeNaturalTerrain(
          cells,
          "lake",
          rollD6(rand),
          rand,
          naturalLandHexes(cells),
        );
      }
    }

    if (!isFl && hydro > 3) {
      const oceans = cells.filter(
        (hex) => hex.terrain === "ocean" && !hex.features.includes("island"),
      );
      placeNaturalTerrain(
        cells,
        "oceanDepth",
        Math.floor(oceans.length * Math.min(0.6, hydro / 16)),
        rand,
        oceans,
      );

      if (hydro > 6) {
        const depths = cells.filter(
          (hex) =>
            hex.terrain === "oceanDepth" && !hex.features.includes("island"),
        );
        placeNaturalTerrain(
          cells,
          "oceanAbyss",
          Math.floor(depths.length * Math.min(0.45, (hydro - 5) / 10)),
          rand,
          depths,
        );
      }
    }
  }

  // ── Wasteland and exotic terrain ───────────────────────────────────────────
  if (!isFr && !isMo) {
    const wastelandCandidates = cells.filter(
      (hex) =>
        (hex.terrain === "land" ||
          hex.terrain === "rough" ||
          hex.terrain === "desert" ||
          hex.terrain === "baked" ||
          hex.terrain === "wasteland") &&
        !hex.features.includes("island"),
    );
    const wastelandPressure =
      (hydro <= 2 ? rollD6(rand) : 0) +
      (atmo <= 3 || atmo >= 10 ? rollD6(rand) : 0) +
      (isDe || isVh ? rollD6(rand) : 0) +
      (isPo ? 2 : 0) +
      (isIn ? 2 : 0);

    if (wastelandPressure > 0) {
      placeSurfaceTerrain(
        cells,
        "wasteland",
        Math.max(1, Math.floor(wastelandPressure / 2)),
        rand,
        wastelandCandidates,
      );
    }
  }

  if (!isFr && !isMo && !isVh && (isFl || atmo >= 10)) {
    const exoticCandidates = cells.filter(
      (hex) =>
        (hex.terrain === "land" ||
          hex.terrain === "rough" ||
          hex.terrain === "desert" ||
          hex.terrain === "swamp" ||
          hex.terrain === "marsh" ||
          hex.terrain === "wasteland") &&
        !hex.features.includes("island"),
    );
    const exoticPressure =
      (isFl ? rollD6(rand) : 0) + (atmo >= 10 ? rollD6(rand) : 0);
    placeSurfaceTerrain(
      cells,
      "exotic",
      Math.max(1, Math.floor(exoticPressure / 2)),
      rand,
      exoticCandidates,
    );
  }

  // ── Craters ────────────────────────────────────────────────────────────────
  if (atmo <= 3 || hydro <= 1 || isVh || isMo || isDe) {
    const climateBonus = isVh || isMo || isDe ? rollD6(rand) : 0;
    placeCraters(
      cells,
      rollD6(rand) +
        Math.max(0, 4 - atmo) +
        Math.max(0, 2 - hydro) +
        climateBonus,
      rand,
    );
  }

  // ── Volcanoes ──────────────────────────────────────────────────────────────
  if (
    isMo ||
    isVh ||
    atmo >= 10 ||
    cells.some((hex) => hex.terrain === "lava")
  ) {
    const count =
      (isMo ? rollD6(rand) + rollD6(rand) : rollD6(rand)) + (isVh ? 2 : 0);
    placeVolcanoes(cells, count, rand);
  } else if (cells.some((hex) => hex.terrain === "rough") && rand() < 0.35) {
    placeVolcanoes(cells, 1, rand);
  }

  // ── Chasms and precipices ──────────────────────────────────────────────────
  if (
    isMo ||
    isVh ||
    isDe ||
    atmo <= 3 ||
    hydro <= 2 ||
    cells.some((hex) => hex.terrain === "rough")
  ) {
    const climateBonus = isMo || isVh || isDe ? 1 : 0;
    placeFractures(
      cells,
      rollD6(rand) + climateBonus,
      Math.max(1, Math.floor(rollD6(rand) / 2)),
      rand,
    );
  }

  // ── Resources, mines, and oil ──────────────────────────────────────────────
  placeEconomicFeatures(cells, world, rand, tcs);

  // ── Starports, cities, and towns ───────────────────────────────────────────
  placeSettlements(cells, world, rand, tcs);

  // ── Remaining civilization layers ──────────────────────────────────────────
  placeCivilizationLayers(cells, world, rand, tcs);

  return cells;
};
