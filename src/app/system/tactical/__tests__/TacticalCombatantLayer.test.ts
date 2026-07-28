import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import {
  TACTICAL_WALL_HEIGHT,
  tacticalWorldMovement,
} from "../tacticalSceneGeometry";

describe("TacticalCombatantLayer", () => {
  it("converts movement cells into map-centered world coordinates", () => {
    const scenario = {
      ...buildDefaultTacticalScenario("exterior-dark"),
      width: 10,
      height: 8,
    };

    expect(
      tacticalWorldMovement(
        {
          sequence: 4,
          path: [{ x: 2, y: 3 }],
          mode: "walk",
        },
        scenario,
      ),
    ).toEqual({
      sequence: 4,
      path: [[-2.5, 0.02, -0.5]],
      mode: "walk",
    });
  });

  it("uses the animation elevation level for raised movement paths", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");

    const movement = tacticalWorldMovement(
      {
        sequence: 2,
        path: [{ x: 1, y: 1 }],
        elevationLevels: [2],
        mode: "run",
      },
      scenario,
    );

    expect(movement.path[0]?.[1]).toBeCloseTo(
      TACTICAL_WALL_HEIGHT * 2 + 0.02,
    );
  });
});
