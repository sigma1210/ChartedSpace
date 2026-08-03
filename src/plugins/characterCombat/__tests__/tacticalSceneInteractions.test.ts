import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import type { Combatant } from "@/plugins/characterCombat/types";
import { resolveTacticalCombatantSelection } from "../tacticalSceneInteractions";

const scenario = buildDefaultTacticalScenario("exterior-dark");
const enemy = scenario.combatants.find(
  (combatant) => combatant.side === "enemy",
);
const player = scenario.combatants.find(
  (combatant) => combatant.side === "player",
);

if (!enemy || !player) {
  throw new Error("Default tactical scenario requires both combat sides");
}

const resolveEnemy = (
  overrides: Partial<{
    coveringFireTargeting: boolean;
    grenadeTargeting: boolean;
    validMeleeDiveTargetIds: ReadonlySet<string>;
    validTargetIds: ReadonlySet<string>;
    validMeleeTargetIds: ReadonlySet<string>;
  }> = {},
) =>
  resolveTacticalCombatantSelection({
    combatant: enemy,
    coveringFireTargeting: false,
    grenadeTargeting: false,
    validMeleeDiveTargetIds: new Set(),
    validTargetIds: new Set(),
    validMeleeTargetIds: new Set(),
    ...overrides,
  });

describe("tactical scene interaction priority", () => {
  it("prioritizes covering fire over every other combatant action", () => {
    expect(
      resolveEnemy({
        coveringFireTargeting: true,
        grenadeTargeting: true,
        validMeleeDiveTargetIds: new Set([enemy.id]),
        validTargetIds: new Set([enemy.id]),
        validMeleeTargetIds: new Set([enemy.id]),
      }),
    ).toEqual({
      type: "preview-covering-fire",
      point: enemy.position,
    });
  });

  it("prioritizes grenade targeting over enemy attacks", () => {
    expect(
      resolveEnemy({
        grenadeTargeting: true,
        validMeleeDiveTargetIds: new Set([enemy.id]),
        validTargetIds: new Set([enemy.id]),
        validMeleeTargetIds: new Set([enemy.id]),
      }),
    ).toEqual({
      type: "preview-grenade",
      point: enemy.position,
    });
  });

  it("prioritizes melee dive over ranged and normal melee", () => {
    expect(
      resolveEnemy({
        validMeleeDiveTargetIds: new Set([enemy.id]),
        validTargetIds: new Set([enemy.id]),
        validMeleeTargetIds: new Set([enemy.id]),
      }),
    ).toEqual({
      type: "preview-melee-dive",
      combatantId: enemy.id,
    });
  });

  it("prioritizes ranged attacks over normal melee", () => {
    expect(
      resolveEnemy({
        validTargetIds: new Set([enemy.id]),
        validMeleeTargetIds: new Set([enemy.id]),
      }),
    ).toEqual({
      type: "select-attack-target",
      combatantId: enemy.id,
    });
  });

  it("selects normal melee when no higher-priority action applies", () => {
    expect(
      resolveEnemy({
        validMeleeTargetIds: new Set([enemy.id]),
      }),
    ).toEqual({
      type: "preview-melee",
      combatantId: enemy.id,
    });
  });

  it("activates a friendly combatant and its profile", () => {
    const friendly: Combatant = {
      ...player,
      sourceCharacterId: "profile-test",
    };

    expect(
      resolveTacticalCombatantSelection({
        combatant: friendly,
        coveringFireTargeting: false,
        grenadeTargeting: false,
        validMeleeDiveTargetIds: new Set(),
        validTargetIds: new Set(),
        validMeleeTargetIds: new Set(),
      }),
    ).toEqual({
      type: "activate-character",
      combatantId: friendly.id,
      profileCharacterId: "profile-test",
    });
  });
});
