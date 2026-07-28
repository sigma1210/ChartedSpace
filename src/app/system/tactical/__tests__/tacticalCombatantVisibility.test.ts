import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import type { TacticalMapState } from "@/plugins/characterCombat/types";
import { tacticalVisibleCombatants } from "../tacticalCombatantVisibility";

describe("tactical combatant visibility", () => {
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
        new Map<string, unknown>([["2:2", true]]),
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
        new Map<string, unknown>([["2:2", true]]),
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
        new Map<string, unknown>([["2:2", true]]),
        { [enemy.id]: movement },
      ),
    ).toEqual([]);
  });
});
