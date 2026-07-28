import {
  buildDefaultTacticalMap,
  DEFAULT_TACTICAL_MAP,
} from "../tacticalMapDefaults";

describe("tactical map defaults", () => {
  it("uses the complete setup-state initialization", () => {
    const playerIds = DEFAULT_TACTICAL_MAP.scenario.combatants
      .filter((combatant) => combatant.side === "player")
      .map((combatant) => combatant.id);

    expect(DEFAULT_TACTICAL_MAP).toMatchObject({
      scenarioStatus: "setup",
      lightingPreset: "exterior-dark",
      deploymentCharacterId: playerIds[0],
      deployedCharacterIds: [],
      deploymentLoadoutByCharacterId: {},
      exploredCellKeys: [],
      lastKnownEnemyPositions: {},
      completedConsoleOperationIds: [],
      resolvedConsoleOperationIds: [],
      consoleOperationProgressById: {},
      coweringCombatantIds: [],
      panickedCombatantIds: [],
      pendingCasualtyMoraleChecks: [],
      pendingUnexpectedFireMoraleChecks: [],
      activeCharacterId: null,
    });
    expect(DEFAULT_TACTICAL_MAP.actionPointsByCharacterId).toEqual(
      Object.fromEntries(
        DEFAULT_TACTICAL_MAP.scenario.combatants.map((combatant) => [
          combatant.id,
          0,
        ]),
      ),
    );
  });

  it("builds independent fallback state instances", () => {
    const first = buildDefaultTacticalMap();
    const second = buildDefaultTacticalMap();

    expect(first).not.toBe(second);
    expect(first.scenario).not.toBe(second.scenario);
    expect(first.scenario.combatants).not.toBe(
      second.scenario.combatants,
    );
  });
});
