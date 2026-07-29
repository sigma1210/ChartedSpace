import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import type { TacticalMapState } from "@/plugins/characterCombat/types";
import { tacticalVisibleCombatants } from "../tacticalCombatantVisibility";

describe("tactical combatant visibility", () => {
  it("keeps enemies hidden during setup even when the board is visible", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const player = scenario.combatants.find(
      (combatant) => combatant.side === "player",
    )!;
    const enemy = scenario.combatants.find(
      (combatant) => combatant.side === "enemy",
    )!;
    const tacticalMap = {
      scenario: {
        ...scenario,
        combatants: [player, enemy],
      },
      scenarioStatus: "setup",
      deployedCharacterIds: [player.id],
      movementAnimationByCharacterId: {},
    } as TacticalMapState;

    expect(
      tacticalVisibleCombatants(
        tacticalMap,
        new Set<string>([
          `${player.position.x}:${player.position.y}`,
          `${enemy.position.x}:${enemy.position.y}`,
        ]),
      ),
    ).toEqual([player]);
  });

  it("keeps an enemy renderable while its observed movement path animates", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const enemy = scenario.combatants.find(
      (combatant) => combatant.side === "enemy",
    )!;
    const hiddenEnemy = {
      ...enemy,
      position: { x: 9, y: 9 },
    };
    const tacticalMap = {
      scenario: {
        ...scenario,
        combatants: [hiddenEnemy],
      },
      scenarioStatus: "active",
      movementAnimationByCharacterId: {
        [hiddenEnemy.id]: {
          sequence: 1,
          path: [
            { x: 2, y: 2 },
            { x: 3, y: 2 },
          ],
          mode: "walk",
        },
      },
    } as TacticalMapState;

    expect(
      tacticalVisibleCombatants(
        tacticalMap,
        new Set<string>(["2:2"]),
      ),
    ).toEqual([hiddenEnemy]);
  });

  it("continues hiding an enemy with no currently observed position or path", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const enemy = scenario.combatants.find(
      (combatant) => combatant.side === "enemy",
    )!;
    const tacticalMap = {
      scenario: {
        ...scenario,
        combatants: [enemy],
      },
      scenarioStatus: "active",
      movementAnimationByCharacterId: {},
    } as TacticalMapState;

    expect(
      tacticalVisibleCombatants(
        tacticalMap,
        new Set<string>(["2:2"]),
      ),
    ).toEqual([]);
  });

  it("hides a path-only enemy again after its movement completes", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const enemy = scenario.combatants.find(
      (combatant) => combatant.side === "enemy",
    )!;
    const movement = {
      sequence: 1,
      path: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      mode: "walk" as const,
    };
    const tacticalMap = {
      scenario: {
        ...scenario,
        combatants: [enemy],
      },
      scenarioStatus: "active",
      movementAnimationByCharacterId: {
        [enemy.id]: movement,
      },
    } as TacticalMapState;

    expect(
      tacticalVisibleCombatants(
        tacticalMap,
        new Set<string>(["2:2"]),
        { [enemy.id]: movement },
      ),
    ).toEqual([]);
  });
});
