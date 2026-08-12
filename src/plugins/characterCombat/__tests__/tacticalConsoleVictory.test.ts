import reducer, { attemptTacticalConsoleCheck, deployTacticalCharacter, initializeTacticalDraftPlaytest, resetTacticalDraftPlaytest, selectTacticalDeploymentCharacter, selectTacticalTerrainObject, startTacticalScenario } from "../slice";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "../tacticalScenarioDefinitions";
import { consoleOperationAvailable, validateTacticalConsoleVictoryDefinition, type TacticalConsoleVictoryDefinitionFile } from "../tacticalConsoleVictory";
import { defaultTacticalInteractiveHumanCombatProfile } from "../tacticalInteractiveHuman";

const chainedDefinition: TacticalConsoleVictoryDefinitionFile = {
  schemaVersion: 1,
  id: "default-tactical-control-room",
  scenarioId: "default-tactical-control-room",
  operations: [
    {
      id: "gain-access",
      consolePlacementId: "control-room-alpha",
      label: "Gain Access",
      prerequisites: { mode: "all", operationIds: [] },
      checks: [
        { id: "security", skill: "Security", difficulty: "routine", apCost: 2 },
        { id: "engineering", skill: "Engineering", difficulty: "average", apCost: 2 },
      ],
      criticalSuccessNextCheckModifier: 2,
      criticalFailureNextCheckModifier: -2,
      result: { type: "unlock", operationIds: ["secure-ship"] },
    },
    {
      id: "secure-ship",
      consolePlacementId: "control-room-alpha",
      label: "Secure Ship",
      prerequisites: { mode: "all", operationIds: ["gain-access"] },
      checks: [{ id: "final-security", skill: "Security", difficulty: "average", apCost: 2 }],
      result: { type: "victory" },
    },
  ],
};

const startedConsoleState = () => {
  const scenario = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  let state = reducer(undefined, initializeTacticalDraftPlaytest({
    crew: [{ id: "crew-1", name: "Operator", weaponSkill: 0, skills: [{ name: "Security", level: 1 }, { name: "Engineering", level: 1 }] }],
    definition: scenario,
    consoleVictory: chainedDefinition,
  }));
  state = reducer(state, selectTacticalDeploymentCharacter("crew-1"));
  state = reducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
  state = reducer(state, startTacticalScenario());
  state = {
    ...state,
    tacticalMap: {
      ...state.tacticalMap!,
      activeCharacterId: "crew-1",
      scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 48, y: 41 } } : unit) },
    },
  };
  return reducer(state, selectTacticalTerrainObject("control-room-alpha:terminal"));
};

describe("tactical console victory", () => {
  it("allows an empty operation list for scenarios that are not ready to playtest", () => {
    expect(() => validateTacticalConsoleVictoryDefinition({
      schemaVersion: 1,
      id: "empty-scenario",
      scenarioId: "empty-scenario",
      operations: [],
    }, [])).not.toThrow();
  });

  it("supports ANY and ALL predecessor requirements", () => {
    const anyOperation = { ...chainedDefinition.operations[1], prerequisites: { mode: "any" as const, operationIds: ["a", "b"] } };
    const allOperation = { ...chainedDefinition.operations[1], prerequisites: { mode: "all" as const, operationIds: ["a", "b"] } };
    expect(consoleOperationAvailable(anyOperation, ["a"])).toBe(true);
    expect(consoleOperationAvailable(allOperation, ["a"])).toBe(false);
    expect(consoleOperationAvailable(allOperation, ["a", "b"])).toBe(true);
  });

  it("allows independent transformation outcomes only on interactive humans", () => {
    const transformed = { ...chainedDefinition, operations: [{ ...chainedDefinition.operations[0], successTransformation: "ally" as const, failureTransformation: "enemy" as const, result: { type: "victory" as const } }] };
    expect(() => validateTacticalConsoleVictoryDefinition(transformed, ["control-room-alpha"], [])).toThrow("can transform only an interactive-human placement");
    expect(() => validateTacticalConsoleVictoryDefinition({ ...transformed, operations: [{ ...transformed.operations[0], successTransformation: undefined }] }, ["control-room-alpha"], ["control-room-alpha"])).not.toThrow();
    expect(() => validateTacticalConsoleVictoryDefinition({ ...transformed, operations: [{ ...transformed.operations[0], failureTransformation: undefined }] }, ["control-room-alpha"], ["control-room-alpha"])).not.toThrow();
    expect(() => validateTacticalConsoleVictoryDefinition(transformed, ["control-room-alpha"], ["control-room-alpha"])).not.toThrow();
  });

  it("retains passed checks, permits retries, consumes a carried modifier once, and unlocks victory", () => {
    let state = startedConsoleState();
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "gain-access", dice: { first: 3, second: 3 } }));
    expect(state.tacticalMap?.consoleOperationProgressById?.["gain-access"].completedCheckIds).toEqual(["security"]);

    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "gain-access", dice: { first: 1, second: 1 } }));
    expect(state.tacticalMap?.consoleOperationProgressById?.["gain-access"]).toEqual({ completedCheckIds: ["security"], nextCheckModifier: -2 });

    state = { ...state, tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-1", actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 6 } } };
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "gain-access", dice: { first: 5, second: 5 } }));
    expect(state.tacticalMap?.completedConsoleOperationIds).toEqual(["gain-access"]);
    expect(state.tacticalMap?.consoleOperationProgressById?.["gain-access"].nextCheckModifier).toBeNull();
    expect(state.tacticalMap?.terminalActiveById["control-room-alpha:terminal"]).toBe(false);

    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "secure-ship", dice: { first: 4, second: 4 } }));
    expect(state.tacticalMap?.scenarioStatus).toBe("victory");
    expect(state.tacticalMap?.completedConsoleOperationIds).toEqual(["gain-access", "secure-ship"]);
  });

  it("clears console progress when the draft scenario is reset", () => {
    let state = startedConsoleState();
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "gain-access", dice: { first: 3, second: 3 } }));
    state = reducer(state, resetTacticalDraftPlaytest({ definition: cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition), consoleVictory: chainedDefinition }));
    expect(state.tacticalMap?.completedConsoleOperationIds).toEqual([]);
    expect(state.tacticalMap?.consoleOperationProgressById).toEqual({});
  });

  it("keeps a six-AP quest chain with one character and carries critical failure to final failure", () => {
    const questDefinition: TacticalConsoleVictoryDefinitionFile = {
      schemaVersion: 1,
      id: "quest:test",
      scenarioId: defaultTacticalScenarioDefinition.id,
      operations: [{
        id: "quest:node:chain",
        consolePlacementId: "control-room-alpha",
        label: "Quest chain",
        prerequisites: { mode: "all", operationIds: [] },
        checks: [
          { id: "first", skill: "Security", difficulty: "routine", apCost: 6 },
          { id: "final", skill: "Engineering", difficulty: "average", apCost: 0 },
        ],
        criticalSuccessNextCheckModifier: 2,
        criticalFailureNextCheckModifier: -2,
        result: { type: "victory" },
        quest: { questId: "quest", scenarioInstanceId: "scene", nodeId: "node", chainId: "chain", scenarioVictoryNodeId: "victory" },
      }],
    };
    const scenario = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: [{ id: "crew-1", name: "Operator", weaponSkill: 0, skills: [{ name: "Security", level: 1 }, { name: "Engineering", level: 1 }] }], definition: scenario, consoleVictory: questDefinition }));
    state = reducer(state, selectTacticalDeploymentCharacter("crew-1"));
    state = reducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = reducer(state, startTacticalScenario());
    state = { ...state, tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-1", scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 48, y: 41 } } : unit) } } };
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:terminal"));
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "quest:node:chain", dice: { first: 1, second: 1 } }));
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.consoleOperationProgressById?.["quest:node:chain"]).toMatchObject({ completedCheckIds: ["first"], nextCheckModifier: -2, attemptCharacterId: "crew-1", successImpossible: true });
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "quest:node:chain", dice: { first: 5, second: 5 } }));
    expect(state.tacticalMap?.scenarioStatus).toBe("active");
    expect(state.tacticalMap?.completedConsoleOperationIds).toEqual([]);
    expect(state.tacticalMap?.consoleOperationProgressById?.["quest:node:chain"]).toBeUndefined();
  });

  it("uses an interactive human placement for a skill-check victory task", () => {
    const scenario = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    scenario.terrainPlacements = [{
      id: "informant",
      terrainDefinitionId: "interactive-human",
      origin: { x: 10, y: 10 },
      rotation: 90,
      objectSettings: { terminal: { label: "Mara Venn", combatProfile: { ...defaultTacticalInteractiveHumanCombatProfile, weaponId: "autopistol", weaponSkill: 2, armorId: "flakVest" } } },
    }];
    const interactionDefinition: TacticalConsoleVictoryDefinitionFile = {
      schemaVersion: 1,
      id: scenario.id,
      scenarioId: scenario.id,
      operations: [{
        id: "persuade-informant",
        consolePlacementId: "informant",
        label: "Persuade Mara Venn",
        prerequisites: { mode: "all", operationIds: [] },
        checks: [{ id: "persuade", skill: "Persuade", difficulty: "average", apCost: 2 }],
        successTransformation: "ally",
        failureTransformation: "enemy",
        result: { type: "victory" },
      }],
    };
    let state = reducer(undefined, initializeTacticalDraftPlaytest({
      crew: [{ id: "crew-1", name: "Envoy", weaponSkill: 0, skills: [{ name: "Persuade", level: 1 }] }],
      definition: scenario,
      consoleVictory: interactionDefinition,
    }));
    state = reducer(state, selectTacticalDeploymentCharacter("crew-1"));
    state = reducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = reducer(state, startTacticalScenario());
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        activeCharacterId: "crew-1",
        scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 10, y: 11 } } : unit) },
      },
    };
    state = reducer(state, selectTacticalTerrainObject("informant:terminal"));
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "persuade-informant", dice: { first: 4, second: 4 } }));

    expect(state.tacticalMap?.scenarioStatus).toBe("victory");
    expect(state.tacticalMap?.terminalActiveById["informant:terminal"]).toBe(true);
    expect(state.tacticalMap?.scenario.terrainObjects?.some((object) => object.id === "informant:terminal")).toBe(false);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "informant:combatant")).toMatchObject({ name: "Mara Venn", side: "player", facing: "east", modelPath: "/models/character-combat/female.glb", weapon: { name: "Autopistol" }, weaponSkill: 2, armorName: "Flak Vest" });
    expect(state.tacticalMap?.actionPointsByCharacterId["informant:combatant"]).toBe(0);
    expect(state.tacticalMap?.actedCharacterIds).toContain("informant:combatant");
    expect(state.tacticalMap?.events.some((event) => event.includes("Persuade") && event.includes("raw 2d6 8"))).toBe(true);
  });

  it("transforms an interactive human into an enemy on a failed configured check", () => {
    const scenario = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    scenario.terrainPlacements = [{
      id: "informant",
      terrainDefinitionId: "interactive-human",
      origin: { x: 10, y: 10 },
      rotation: 270,
      objectSettings: { terminal: { label: "Mara Venn", combatProfile: { ...defaultTacticalInteractiveHumanCombatProfile, weaponId: "bodyPistol" } } },
    }];
    const interactionDefinition: TacticalConsoleVictoryDefinitionFile = {
      schemaVersion: 1,
      id: scenario.id,
      scenarioId: scenario.id,
      operations: [{
        id: "persuade-informant",
        consolePlacementId: "informant",
        label: "Persuade Mara Venn",
        prerequisites: { mode: "all", operationIds: [] },
        checks: [{ id: "persuade", skill: "Persuade", difficulty: "average", apCost: 2 }],
        successTransformation: "ally",
        failureTransformation: "enemy",
        result: { type: "victory" },
      }],
    };
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: [{ id: "crew-1", name: "Envoy", weaponSkill: 0, skills: [{ name: "Persuade", level: 1 }] }], definition: scenario, consoleVictory: interactionDefinition }));
    state = reducer(state, selectTacticalDeploymentCharacter("crew-1"));
    state = reducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = reducer(state, startTacticalScenario());
    state = { ...state, tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-1", scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 10, y: 11 } } : unit) } } };
    state = reducer(state, selectTacticalTerrainObject("informant:terminal"));
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "persuade-informant", dice: { first: 1, second: 1 } }));

    expect(state.tacticalMap?.scenarioStatus).toBe("active");
    expect(state.tacticalMap?.completedConsoleOperationIds).not.toContain("persuade-informant");
    expect(state.tacticalMap?.resolvedConsoleOperationIds).toContain("persuade-informant");
    expect(state.tacticalMap?.scenario.terrainObjects?.some((object) => object.id === "informant:terminal")).toBe(false);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "informant:combatant")).toMatchObject({ name: "Mara Venn", side: "enemy", facing: "west", avatarPath: expect.stringMatching(/^\/generated\/avatars\/pool\/.+\.png$/), weapon: { name: "Body Pistol" } });
    expect(state.tacticalMap?.actionPointsByCharacterId["informant:combatant"]).toBe(6);
    expect(state.tacticalMap?.processedEnemyPhaseCombatantIds).not.toContain("informant:combatant");
    expect(state.tacticalMap?.events.some((event) => event.includes("became an enemy") && event.includes("next enemy phase"))).toBe(true);
  });
});
