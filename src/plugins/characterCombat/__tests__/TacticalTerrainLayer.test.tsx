/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalTerrainLayer } from "../TacticalTerrainLayer";

jest.mock("@/plugins/characterCombat/AnimatedCombatantModel", () => ({
  AnimatedCombatantFallback: () => null,
  AnimatedCombatantModel: () => null,
}));

const square = (x: number, y: number, size: number) => [
  { kind: "line" as const, from: { x, y }, to: { x: x + size, y } },
  { kind: "line" as const, from: { x: x + size, y }, to: { x: x + size, y: y + size } },
  { kind: "line" as const, from: { x: x + size, y: y + size }, to: { x, y: y + size } },
  { kind: "line" as const, from: { x, y: y + size }, to: { x, y } },
];

describe("TacticalTerrainLayer natural terrain", () => {
  let consoleError: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  const tacticalMap = () => {
    const map = freshTacticalMap(["crew-1"]);
    map.scenario = {
      ...map.scenario,
      walls: [],
      doors: [],
      objects: [],
      terrainObjects: [],
      drawnTerrainRegions: [
        { id: "meadow", kind: "grass", segments: square(2, 2, 3) },
        { id: "dune", kind: "sand", segments: square(12, 2, 3) },
        { id: "pond", kind: "water", segments: square(7, 2, 3) },
      ],
      naturalTerrainPlacements: [
        { id: "oak", kind: "tree", position: { x: 4, y: 8 }, radius: 2 },
        { id: "hedge", kind: "bush", position: { x: 9, y: 8 }, radius: 1.5 },
        { id: "outcrop", kind: "rock", position: { x: 14, y: 8 }, radius: 1.75 },
      ],
      liquidHydrogenAreas: [],
      closeMachineryCells: [],
      elevationTransitions: [],
      elevationAccessCells: [],
      terrainByCell: {},
      elevationLevelByCell: {},
      drawnRaisedAreas: [],
      drawnRaisedAreaLevels: {},
      bridges: [],
      deploymentCells: [],
    };
    return map;
  };

  it("renders drawn grass, sand, and water as boundary-shaped ground surfaces", () => {
    render(<TacticalTerrainLayer
      section="base"
      tacticalMap={tacticalMap()}
      onSelectCell={jest.fn()}
      onSelectDeploymentCell={jest.fn()}
      onSelectTerrain={jest.fn()}
    />);

    expect(screen.getByTestId("drawn-grass-surface-meadow").getAttribute("position")).toBe("0,0.01,0");
    expect(screen.getByTestId("drawn-sand-surface-dune").getAttribute("position")).toBe("0,0.02,0");
    expect(screen.getByTestId("drawn-water-surface-pond").getAttribute("position")).toBe("0,0.03,0");
  });

  it("renders a fixed tree trunk with scalable tree, bush, and rock formations", () => {
    render(<TacticalTerrainLayer
      section="structures"
      tacticalMap={tacticalMap()}
      onSelectCell={jest.fn()}
      onSelectDeploymentCell={jest.fn()}
      onSelectTerrain={jest.fn()}
    />);

    expect(screen.getByTestId("tactical-tree-oak").querySelector("cylinderGeometry")).toBeTruthy();
    expect(screen.getByTestId("tactical-tree-canopy-oak")).toBeTruthy();
    expect(screen.getByTestId("tactical-bush-canopy-hedge")).toBeTruthy();
    expect(screen.getByTestId("tactical-rock-mass-outcrop")).toBeTruthy();
    expect(screen.getByTestId("tactical-rock-outcrop").querySelectorAll("dodecahedronGeometry")).toHaveLength(3);
  });
});
