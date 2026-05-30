import type { World } from "../types";

export const RENDER_SIZE = 8;
export const HEX_W = 32;
export const ROW_H  = 28;

export type Terrain = "ocean" | "fluid" | "land" | "ice" | "frozen" | "desert" | "baked" | "lava" | "vacuum";

export interface HexCell {
  left: number;
  top:  number;
  triangleId: number;
  isPolar: boolean;
  terrain: Terrain;
}

export const LAND_BY_ATMO: Record<number, string> = {
  0:  "#111111",
  1:  "#5a2515",
  2:  "#3a6828",
  3:  "#307020",
  4:  "#286018",
  5:  "#255810",
  6:  "#2a6030",
  7:  "#2d6030",
  8:  "#2a5828",
  9:  "#2d6030",
  10: "#4a3410",
  11: "#1a1a40",
  12: "#240808",
  13: "#381010",
  14: "#382010",
  15: "#1c0e06",
};

export const OCEAN_COLOR  = "#1e5a9e";
export const FLUID_COLOR  = "#2a6a40";  // exotic liquid (corrosive/insidious atmo)
export const ICE_COLOR    = "#c4dde8";
export const FROZEN_COLOR = "#5f8fa8";  // frozen tundra — darker blue-grey than ice cap
export const DESERT_COLOR = "#8b6914";
export const BAKED_COLOR  = "#9c5820";  // scorched baked lands (Vh/Mo)
export const LAVA_COLOR   = "#8b1010";
export const VACUUM_COLOR = "#0d0d0d";

export const uwpVal = (c: string): number => {
  if (!c || c === "?") return 0;
  const n = parseInt(c, 16);
  return isNaN(n) ? 0 : n;
};

export const terrainColor = (t: Terrain, landColor: string): string => {
  switch (t) {
    case "ocean":  return OCEAN_COLOR;
    case "fluid":  return FLUID_COLOR;
    case "ice":    return ICE_COLOR;
    case "frozen": return FROZEN_COLOR;
    case "desert": return DESERT_COLOR;
    case "baked":  return BAKED_COLOR;
    case "lava":   return LAVA_COLOR;
    case "vacuum": return VACUUM_COLOR;
    default:       return landColor;
  }
};

export const svgDimensions = (S: number) => ({
  svgW: S * 5.5 * HEX_W + 16,
  svgH: S * 84 - 11,
});

// SVG polygon points string
export const hexPts = (left: number, top: number): string =>
  `${left+16},${top} ${left+32},${top+7} ${left+32},${top+28} ${left+16},${top+35} ${left},${top+28} ${left},${top+7}`;

// Canvas-drawable vertex pairs
export const hexVerts = (left: number, top: number): [number, number][] => [
  [left + 16, top],
  [left + 32, top + 7],
  [left + 32, top + 28],
  [left + 16, top + 35],
  [left,      top + 28],
  [left,      top + 7],
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

export const buildHexGrid = (S: number, L: number, T: number): HexCell[] => {
  const hexes: HexCell[] = [];

  for (let id = 0; id < 20; id++) {
    const baseLeft = Math.floor(id / 4);
    const vertPos  = id % 4;

    let left = 0, top = 0, isUp = true, isSmall = false;

    switch (vertPos) {
      case 0: left = L + 16 + baseLeft * S * HEX_W; top = T;                         isUp = true;  isSmall = true;  break;
      case 1: left = L + 16 + baseLeft * S * HEX_W; top = T + (S - 2) * ROW_H;       isUp = false; isSmall = false; break;
      case 2: left = L + S * 16 + baseLeft * S * HEX_W; top = T + S * ROW_H;         isUp = true;  isSmall = false; break;
      case 3: left = L + S * 16 + baseLeft * S * HEX_W + HEX_W; top = T + S*56-ROW_H; isUp = false; isSmall = true; break;
    }

    const hexPerSide = isSmall ? S - 1 : S;

    if (isUp) {
      for (let i = 0; i < hexPerSide; i++) {
        for (let j = 0; j <= i; j++) {
          hexes.push({ left: left + j*HEX_W + (hexPerSide-i)*16, top: top + i*ROW_H, triangleId: id, isPolar: isSmall, terrain: "land" });
        }
      }
    } else {
      for (let i = 0; i < hexPerSide; i++) {
        for (let j = 0; j < hexPerSide - i; j++) {
          hexes.push({ left: left + j*HEX_W + i*16, top: top + (i+1)*ROW_H, triangleId: id, isPolar: isSmall, terrain: "land" });
        }
      }
    }
  }

  return hexes;
};

export const assignTerrain = (hexes: HexCell[], world: World, totalH: number): HexCell[] => {
  const rand  = mulberry32(hashStr(world.hex + world.name));
  const atmo  = uwpVal(world.uwp.atmosphere);
  const hydro = uwpVal(world.uwp.hydrographics);
  const size  = uwpVal(world.uwp.size);

  // Trade codes — remarks is string[] in the JSON data
  const tcs = new Set(Array.isArray(world.remarks) ? world.remarks : []);
  const isVac = size === 0 || atmo === 0 || tcs.has("Va");
  const isWa  = tcs.has("Wa");   // water world — all ocean
  const isFl  = tcs.has("Fl");   // fluid (exotic liquid) oceans
  const isIc  = tcs.has("Ic");   // ice-capped — extra polar rows
  const isDe  = tcs.has("De");   // desert world
  const isFr  = tcs.has("Fr");   // frozen — all surfaces frozen
  const isVh  = tcs.has("Vh");   // very hot — baked lands, no liquid
  const isMo  = tcs.has("Mo");   // molten — lava oceans, baked land

  const cells = hexes.map(h => ({ ...h }));

  // ── Vacuum ──────────────────────────────────────────────────────────────────
  if (isVac) { cells.forEach(h => { h.terrain = "vacuum"; }); return cells; }

  // ── Water World — fill entirely ─────────────────────────────────────────────
  if (isWa) {
    cells.forEach(h => { h.terrain = isFl ? "fluid" : "ocean"; });
    return cells;
  }

  // ── Ocean flood fill ────────────────────────────────────────────────────────
  const liquidTerrain: Terrain = isFl ? "fluid" : "ocean";
  const oceanFrac = Math.min(1, hydro / 10);
  if (oceanFrac > 0) {
    const target    = Math.floor(cells.length * oceanFrac);
    const seedCount = Math.max(1, Math.round(hydro / 2));
    const ocean = new Set<number>();
    const front: number[] = [];

    for (let i = 0; i < seedCount; i++) {
      const idx = Math.floor(rand() * cells.length);
      if (!ocean.has(idx)) { ocean.add(idx); front.push(idx); }
    }

    while (ocean.size < target && front.length > 0) {
      const fi  = Math.floor(rand() * front.length);
      const cur = front.splice(fi, 1)[0];
      const h   = cells[cur];
      for (let n = 0; n < cells.length; n++) {
        if (ocean.size >= target) break;
        if (!ocean.has(n)) {
          const dx = Math.abs(cells[n].left - h.left);
          const dy = Math.abs(cells[n].top  - h.top);
          if (dx <= HEX_W * 1.5 && dy <= ROW_H * 1.5 && rand() < 0.7) { ocean.add(n); front.push(n); }
        }
      }
    }
    ocean.forEach(i => { cells[i].terrain = liquidTerrain; });
  }

  // ── Ice caps ─────────────────────────────────────────────────────────────────
  // Formula from source: floor(hydro/2) - 1 base rows; Ic code adds 1 bonus row.
  // Polar cap hexes (isPolar) always freeze when iceCapRows >= 0.
  const iceCapRows = Math.floor(hydro / 2) - 1 + (isIc ? 1 : 0);
  const totalRows  = 3 * RENDER_SIZE - 1;  // 23 for S=8

  cells.forEach(h => {
    if (h.terrain !== "land") return;
    if (iceCapRows < 0) return;
    const latFrac  = h.top / totalH;
    const rowApprox = latFrac * totalRows;
    const inNorthCap = h.isPolar && latFrac < 0.5;
    const inSouthCap = h.isPolar && latFrac >= 0.5;
    const inNorthRow = iceCapRows >= 1 && rowApprox < iceCapRows;
    const inSouthRow = iceCapRows >= 1 && (totalRows - rowApprox) < iceCapRows;
    if (inNorthCap || inSouthCap || inNorthRow || inSouthRow) h.terrain = "ice";
  });

  // ── Planet-wide climate overrides ────────────────────────────────────────────
  // Applied after ice caps so poles already have ice; these override remaining land/ocean.

  if (isFr) {
    // Frozen: land → frozen tundra, liquid → ice field
    cells.forEach(h => {
      if (h.terrain === "land")                              h.terrain = "frozen";
      else if (h.terrain === "ocean" || h.terrain === "fluid") h.terrain = "ice";
    });
    return cells;
  }

  if (isVh) {
    // Very Hot: liquid evaporated → desert, land scorched → baked
    cells.forEach(h => {
      if (h.terrain === "land")                              h.terrain = "baked";
      else if (h.terrain === "ocean" || h.terrain === "fluid") h.terrain = "desert";
    });
    return cells;
  }

  if (isMo) {
    // Molten: liquid → lava, land → baked
    cells.forEach(h => {
      if (h.terrain === "land")                              h.terrain = "baked";
      else if (h.terrain === "ocean" || h.terrain === "fluid") h.terrain = "lava";
    });
    return cells;
  }

  // ── Desert ───────────────────────────────────────────────────────────────────
  if (isDe) {
    // De trade code — all remaining land becomes desert
    cells.forEach(h => { if (h.terrain === "land") h.terrain = "desert"; });
    return cells;
  }

  // Fallback desert scatter for dry worlds without the De code
  if (hydro <= 2 && atmo >= 2) {
    cells.forEach(h => { if (h.terrain === "land" && rand() < 0.45) h.terrain = "desert"; });
  }

  // Fallback lava scatter for hot-atmo worlds without Mo code (atmo 10-12, no liquid)
  if ((atmo >= 10 && atmo <= 12) && hydro === 0) {
    cells.forEach(h => { if (h.terrain === "land" && rand() < 0.3) h.terrain = "lava"; });
  }

  return cells;
};
