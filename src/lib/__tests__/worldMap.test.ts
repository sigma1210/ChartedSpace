import type { World } from "../../types";
import { assignTerrain, buildDisplayHexes, buildHexGrid, buildWorldMapOverlays, svgDimensions } from "../worldMap";
import type { Terrain } from "../worldMap";

const makeWorld = (overrides: Partial<World> = {}): World => ({
  hex: "1910",
  hexX: 19,
  hexY: 10,
  name: "Regina",
  uwp: {
    raw: "A788899-C",
    starport: "A",
    size: "7",
    atmosphere: "8",
    hydrographics: "8",
    population: "8",
    government: "9",
    lawLevel: "9",
    techLevel: "C",
  },
  remarks: ["Ri", "Pa", "Ph", "An", "Cp", "Sa"],
  importance: "",
  economics: "",
  culture: "",
  nobility: "",
  bases: "",
  travelZone: "",
  pbg: { raw: "703", populationMultiplier: 7, belts: 0, gasGiants: 3 },
  worldsInSystem: 5,
  allegiance: "ImDd",
  stellar: "F7 V BD M3 V",
  ...overrides,
});

describe("worldMap geometry", () => {
  it("matches the source base world map geometry for size 7 worlds", () => {
    const size = 7;
    const baseHexes = buildHexGrid(size, 0, 0);

    expect(baseHexes).toHaveLength(490);
    expect(svgDimensions(size)).toEqual({ svgW: 1408, svgH: 616 });
  });

  it("matches the source display pass for size 7 worlds", () => {
    const size = 7;
    const baseHexes = buildHexGrid(size, 0, 0);

    expect(buildDisplayHexes(baseHexes, size)).toHaveLength(600);
    expect(buildWorldMapOverlays(baseHexes, size)).toHaveLength(13);
  });

  it("uses three size-scaled latitude bands", () => {
    const size = 7;
    const rows = new Set(buildHexGrid(size, 0, 0).map((hex) => hex.rowNumber));

    expect(rows.size).toBe(3 * size - 1);
  });

  it("adds phase one terrain features while preserving base terrain", () => {
    const size = 7;
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), makeWorld(), svgDimensions(size).svgH);

    expect(hexes.some((hex) => hex.features.includes("mountain"))).toBe(true);
    expect(hexes.some((hex) => hex.terrain === "ocean")).toBe(true);
    expect(hexes.some((hex) => hex.terrain === "ice")).toBe(true);
  });

  it("turns submerged mountains into islands on water worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A78A899-C",
        starport: "A",
        size: "7",
        atmosphere: "8",
        hydrographics: "A",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Wa"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.every((hex) => ["ocean", "oceanDepth", "oceanAbyss", "ice"].includes(hex.terrain))).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("island"))).toBe(true);
  });

  it("adds natural land and ocean detail on temperate worlds", () => {
    const size = 7;
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), makeWorld(), svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));
    const landDetails: Terrain[] = ["rough", "woods", "swamp", "marsh", "lake"];
    const oceanDetails: Terrain[] = ["oceanDepth", "oceanAbyss"];

    expect(landDetails.some((terrain) => terrains.has(terrain))).toBe(true);
    expect(oceanDetails.some((terrain) => terrains.has(terrain))).toBe(true);
  });

  it("adds craters to vacuum worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A700899-C",
        starport: "A",
        size: "7",
        atmosphere: "0",
        hydrographics: "0",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Va"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.every((hex) => hex.terrain === "vacuum")).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("crater"))).toBe(true);
  });

  it("adds chasms and precipices to vacuum worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A700899-C",
        starport: "A",
        size: "7",
        atmosphere: "0",
        hydrographics: "0",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Va"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.some((hex) => hex.features.includes("chasm"))).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("precipice"))).toBe(true);
  });

  it("adds craters to dry thin-atmosphere worlds off liquid terrain", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A721899-C",
        starport: "A",
        size: "7",
        atmosphere: "2",
        hydrographics: "1",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: [],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const craterHexes = hexes.filter((hex) => hex.features.includes("crater"));

    expect(craterHexes.length).toBeGreaterThan(0);
    expect(craterHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice"].includes(hex.terrain))).toBe(true);
  });

  it("adds chasms and precipices to dry rocky worlds off liquid and frozen terrain", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A721899-C",
        starport: "A",
        size: "7",
        atmosphere: "2",
        hydrographics: "1",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: [],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const fractureHexes = hexes.filter((hex) => hex.features.includes("chasm") || hex.features.includes("precipice"));

    expect(fractureHexes.length).toBeGreaterThan(0);
    expect(fractureHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen"].includes(hex.terrain))).toBe(true);
  });

  it("adds wasteland to dry hostile worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A721899-C",
        starport: "A",
        size: "7",
        atmosphere: "2",
        hydrographics: "1",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Po"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const wastelandHexes = hexes.filter((hex) => hex.terrain === "wasteland");

    expect(wastelandHexes.length).toBeGreaterThan(0);
    expect(wastelandHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen", "vacuum"].includes(hex.terrain))).toBe(true);
  });

  it("adds exotic terrain to fluid or unusual-atmosphere worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A7A8899-C",
        starport: "A",
        size: "7",
        atmosphere: "A",
        hydrographics: "8",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Fl"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const exoticHexes = hexes.filter((hex) => hex.terrain === "exotic");

    expect(exoticHexes.length).toBeGreaterThan(0);
    expect(exoticHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen", "vacuum"].includes(hex.terrain))).toBe(true);
  });

  it("adds resource markers on solid terrain", () => {
    const size = 7;
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), makeWorld(), svgDimensions(size).svgH);
    const resourceHexes = hexes.filter((hex) => hex.features.includes("resource"));

    expect(resourceHexes.length).toBeGreaterThan(0);
    expect(resourceHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen"].includes(hex.terrain))).toBe(true);
  });

  it("adds mines to dry rocky worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A721899-C",
        starport: "A",
        size: "7",
        atmosphere: "2",
        hydrographics: "1",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Po", "In"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const mineHexes = hexes.filter((hex) => hex.features.includes("mine"));

    expect(mineHexes.length).toBeGreaterThan(0);
    expect(mineHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen"].includes(hex.terrain))).toBe(true);
  });

  it("adds oil to wet organic worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A788899-C",
        starport: "A",
        size: "7",
        atmosphere: "8",
        hydrographics: "8",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Ag", "Ga"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const oilHexes = hexes.filter((hex) => hex.features.includes("oil"));

    expect(oilHexes.length).toBeGreaterThan(0);
    expect(oilHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "ice", "frozen", "vacuum"].includes(hex.terrain))).toBe(true);
  });

  it("adds a starport for worlds with a working starport code", () => {
    const size = 7;
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), makeWorld(), svgDimensions(size).svgH);
    const starportHexes = hexes.filter((hex) => hex.features.includes("starport"));

    expect(starportHexes).toHaveLength(1);
    expect(starportHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen", "lava"].includes(hex.terrain))).toBe(true);
  });

  it("does not add a starport for X starport worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "X788899-C",
        starport: "X",
        size: "7",
        atmosphere: "8",
        hydrographics: "8",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.some((hex) => hex.features.includes("starport"))).toBe(false);
  });

  it("adds city, town, and suburb markers for high-population worlds", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Hi"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.some((hex) => hex.features.includes("city"))).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("town"))).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("suburb"))).toBe(true);
  });

  it("adds only town markers for low-population settled worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A784299-C",
        starport: "A",
        size: "7",
        atmosphere: "8",
        hydrographics: "4",
        population: "2",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);

    expect(hexes.some((hex) => hex.features.includes("town"))).toBe(true);
    expect(hexes.some((hex) => hex.features.includes("city"))).toBe(false);
    expect(hexes.some((hex) => hex.features.includes("suburb"))).toBe(false);
  });

  it("freezes frozen worlds without leaving liquid terrain", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Fr"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));

    expect(terrains.has("ice")).toBe(true);
    expect(terrains.has("frozen")).toBe(true);
    expect(terrains.has("ocean")).toBe(false);
    expect(terrains.has("fluid")).toBe(false);
    expect(terrains.has("wasteland")).toBe(false);
    expect(terrains.has("exotic")).toBe(false);
  });

  it("bakes very hot worlds and evaporates liquid terrain", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Vh"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));

    expect(terrains.has("baked")).toBe(true);
    expect(terrains.has("desert")).toBe(true);
    expect(terrains.has("ocean")).toBe(false);
    expect(terrains.has("fluid")).toBe(false);
    expect(terrains.has("ice")).toBe(false);
  });

  it("adds volcanoes to very hot worlds off liquid and frozen terrain", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Vh"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const volcanoHexes = hexes.filter((hex) => hex.features.includes("volcano"));

    expect(volcanoHexes.length).toBeGreaterThan(0);
    expect(volcanoHexes.every((hex) => !["ocean", "oceanDepth", "oceanAbyss", "fluid", "lake", "ice", "frozen"].includes(hex.terrain))).toBe(true);
  });

  it("does not place temperate natural terrain on harsh climate worlds", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Mo"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));
    const naturalTerrains: Terrain[] = ["rough", "woods", "swamp", "marsh", "lake", "oceanDepth", "oceanAbyss"];

    expect(naturalTerrains.some((terrain) => terrains.has(terrain))).toBe(false);
  });

  it("turns molten worlds into baked land and lava fields", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Mo"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));

    expect(terrains.has("baked")).toBe(true);
    expect(terrains.has("lava")).toBe(true);
    expect(terrains.has("ocean")).toBe(false);
    expect(terrains.has("fluid")).toBe(false);
    expect(terrains.has("ice")).toBe(false);
    expect(terrains.has("wasteland")).toBe(false);
    expect(terrains.has("exotic")).toBe(false);
  });

  it("adds volcanoes to molten worlds", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["Mo"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const volcanoHexes = hexes.filter((hex) => hex.features.includes("volcano"));

    expect(volcanoHexes.length).toBeGreaterThan(0);
    expect(volcanoHexes.some((hex) => hex.terrain === "lava" || hex.terrain === "baked")).toBe(true);
  });

  it("turns remaining land into desert on desert worlds", () => {
    const size = 7;
    const world = makeWorld({ remarks: ["De"] });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));

    expect(terrains.has("desert")).toBe(true);
    expect(terrains.has("land")).toBe(false);
    expect(terrains.has("ice")).toBe(true);
    expect(terrains.has("ocean")).toBe(true);
  });

  it("adds frozen polar bands on tundra worlds", () => {
    const size = 7;
    const world = makeWorld({
      uwp: {
        raw: "A780899-C",
        starport: "A",
        size: "7",
        atmosphere: "8",
        hydrographics: "0",
        population: "8",
        government: "9",
        lawLevel: "9",
        techLevel: "C",
      },
      remarks: ["Tu"],
    });
    const hexes = assignTerrain(buildHexGrid(size, 0, 0), world, svgDimensions(size).svgH);
    const terrains = new Set(hexes.map((hex) => hex.terrain));

    expect(terrains.has("frozen")).toBe(true);
    expect(terrains.has("land")).toBe(true);
  });
});
