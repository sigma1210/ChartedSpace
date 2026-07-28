import { freshTacticalMap } from "../tacticalScenarioReducers";
import { buildTacticalMovementPreview } from "../tacticalMovementPreview";

const movementMap = () => {
  const map = freshTacticalMap(["crew-1"]);
  const player = map.scenario.combatants.find((unit) => unit.side === "player")!;
  const enemy = map.scenario.combatants.find((unit) => unit.side === "enemy")!;
  player.position = { x: 1, y: 1 };
  player.elevationLevel = 0;
  player.facing = "east";
  player.posture = "standing";
  enemy.position = { x: 2, y: 1 };
  enemy.elevationLevel = 0;
  map.scenario = {
    ...map.scenario,
    width: 5,
    height: 5,
    combatants: [player, enemy],
    walls: [],
    doors: [],
    objects: [],
    terrainObjects: [],
    terrainByCell: {},
    elevationLevelByCell: {},
    bridges: [],
    closeMachineryCells: [],
    elevationAccessCells: [],
  };
  map.actionPointsByCharacterId[player.id] = 6;
  map.movementMode = "walk";
  return { enemy, map, player };
};

describe("tactical movement preview", () => {
  it("keeps enemy destinations as HUD candidates but blocks them on the map", () => {
    const { enemy, map, player } = movementMap();
    const preview = buildTacticalMovementPreview(map, player);

    expect(preview.candidateMoves.has(`${enemy.position.x}:${enemy.position.y}`)).toBe(true);
    expect(preview.legalMoves.has(`${enemy.position.x}:${enemy.position.y}`)).toBe(false);
  });

  it("allows the selected enemy-entry destination as the final map step", () => {
    const { enemy, map, player } = movementMap();
    map.plannedEnemyEntryTargetId = enemy.id;

    const preview = buildTacticalMovementPreview(map, player);

    expect(preview.legalMoves.has(`${enemy.position.x}:${enemy.position.y}`)).toBe(true);
  });

  it("returns no movement while the selected combatant is prone", () => {
    const { map, player } = movementMap();
    player.posture = "prone";

    const preview = buildTacticalMovementPreview(map, player);

    expect(preview.candidateMoves.size).toBe(0);
    expect(preview.legalMoves.size).toBe(0);
  });

  it("allows an elevation-access stair square as a destination", () => {
    const { enemy, map, player } = movementMap();
    enemy.position = { x: 4, y: 4 };
    map.scenario.terrainByCell = { "3:1": "elevated" };
    map.scenario.elevationLevelByCell = { "3:1": 1 };
    map.scenario.elevationAccessCells = [{ x: 2, y: 1 }];

    const preview = buildTacticalMovementPreview(map, player);

    expect(preview.legalMoves.get("2:1")).toMatchObject({
      destination: { x: 2, y: 1 },
      finalElevationLevel: 0,
    });
  });
});
