import characterCombatReducer, { activateTacticalCharacter, aimTacticalAttack, beginTacticalCoveringFire, beginTacticalDragging, beginTacticalGrenadeTargeting, beginTacticalSatchelPlacement, beginTacticalSmokeGrenadeTargeting, braceTacticalWeapon, cancelTacticalAttack, cancelTacticalCoveringFire, cancelTacticalGrenadeTargeting, cancelTacticalMelee, cancelTacticalTreatment, confirmTacticalAttack, confirmTacticalCoveringFire, confirmTacticalExtinguishFire, confirmTacticalGrenade, confirmTacticalMelee, confirmTacticalMove, confirmTacticalSatchelPlacement, confirmTacticalTreatment, defuseTacticalSatchelCharge, deployTacticalCharacter, detonateTacticalSatchelCharge, equipTacticalDeploymentItem, finishTacticalActivation, fireAtTacticalTerrain, initializeTacticalMapSetup, interactWithTacticalTerrain, previewTacticalCoveringFire, previewTacticalEnemyEntry, previewTacticalExtinguishFire, previewTacticalGrenadeTarget, previewTacticalMelee, previewTacticalMeleeDive, previewTacticalMove, previewTacticalTreatment, rallyTacticalCharacter, releaseTacticalDraggedCombatant, reloadTacticalWeapon, resetTacticalScenario, resolveTacticalAdjacencyReaction, resolveTacticalCoveringFireSnap, rotateTacticalDeploymentCharacter, runTacticalEnemyPhase, selectTacticalAttackMode, selectTacticalAttackTarget, selectTacticalDeploymentCharacter, selectTacticalLightingPreset, selectTacticalTerrainObject, selectTacticalWeaponAmmunition, setTacticalDeploymentPosture, setTacticalMovementMode, setTacticalTerrainLights, startTacticalScenario, toggleTacticalPosture, unequipTacticalDeploymentItem } from "../slice";
import { recordTacticalExploration } from "../slice";
import { recordTacticalEnemySightings } from "../slice";
import { initializeTacticalDraftPlaytest, resetTacticalDraftPlaytest } from "../slice";
import { attemptTacticalConsoleCheck } from "../slice";
import { collateralBlastCells, grenadeBlastCells, hasLineOfSight, meleeEnemies, pointKey, tacticalLightingLevelAt, tacticalRangedEnemies } from "../geometry";
import type { CharacterCombatState } from "../types";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "../tacticalScenarioDefinitions";
import { characterCombatArmor, characterCombatWeapons } from "../equipment";

const drawnRectangle = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id,
  segments: [
    { kind: "line" as const, from: { x, y }, to: { x: x + width, y } },
    { kind: "line" as const, from: { x: x + width, y }, to: { x: x + width, y: y + height } },
    { kind: "line" as const, from: { x: x + width, y: y + height }, to: { x, y: y + height } },
    { kind: "line" as const, from: { x, y: y + height }, to: { x, y } },
  ],
});

const tacticalTestInitializationType = "characterCombatTests/initializeActiveTacticalMap";
const tacticalTestLoadoutCatalogItems = {
  scout: { weapon: "weapon-laser-rifle", armor: "armor-flak-vest" },
  breacher: { weapon: "weapon-shotgun", armor: "armor-combat-armor" },
  assault: { weapon: "weapon-smg", armor: "armor-combat-armor" },
  heavy: { weapon: "weapon-gauss-rifle", armor: "armor-battle-dress" },
  plasma: { weapon: "weapon-plasma-gun", armor: "armor-combat-armor" },
  fusion: { weapon: "weapon-fusion-gun", armor: "armor-combat-armor" },
  "action-ram": { weapon: "weapon-4cm-ram", armor: "armor-combat-armor" },
  lag: { weapon: "weapon-light-assault-gun", armor: "armor-combat-armor" },
} as const;
type TacticalTestLoadoutId = keyof typeof tacticalTestLoadoutCatalogItems;
const initializeActiveTacticalTestMap = (
  crew: Parameters<typeof initializeTacticalMapSetup>[0],
  loadoutIds: readonly TacticalTestLoadoutId[] = ["lag", "assault"],
) => ({ type: tacticalTestInitializationType, payload: { crew, loadoutIds } } as const);

const reducer: typeof characterCombatReducer = (state, action) => {
  const initializesActiveTacticalTestMap = action.type === tacticalTestInitializationType;
  const tacticalTestInitialization = initializesActiveTacticalTestMap
    ? action as ReturnType<typeof initializeActiveTacticalTestMap>
    : null;
  const reducerAction = tacticalTestInitialization
    ? initializeTacticalMapSetup(tacticalTestInitialization.payload.crew)
    : action;
  const next = characterCombatReducer(state, reducerAction);
  const initializesLegacyMechanicsFixture = initializesActiveTacticalTestMap
    || initializeTacticalMapSetup.match(action)
    || initializeTacticalDraftPlaytest.match(action)
    || resetTacticalScenario.match(action)
    || resetTacticalDraftPlaytest.match(action);
  if (!initializesLegacyMechanicsFixture || !next.tacticalMap) return next;
  const legacyPositions: Record<string, { x: number; y: number }> = { "crew-1": { x: 48, y: 34 }, "crew-2": { x: 51, y: 34 } };
  const fixture = {
    ...next,
    tacticalMap: {
      ...next.tacticalMap,
      scenario: {
        ...next.tacticalMap.scenario,
        combatants: next.tacticalMap.scenario.combatants.map((unit) => legacyPositions[unit.id] ? { ...unit, position: legacyPositions[unit.id] } : unit.id === "enemy-1" ? {
          ...unit, name: "Security Guard", weapon: { ...characterCombatWeapons.smg }, weaponSkill: 1,
          meleeWeapon: { name: "Baton", penetration: 0 }, armor: characterCombatArmor.flakVest.value, armorName: characterCombatArmor.flakVest.name,
        } : unit.id === "enemy-2" ? {
          ...unit, name: "Control Room Officer", position: { x: 50, y: 43 }, weapon: { ...characterCombatWeapons.autopistol }, weaponSkill: 0,
        } : unit),
      },
      ammunitionByCharacterId: { ...next.tacticalMap.ammunitionByCharacterId, "enemy-1": characterCombatWeapons.smg.magazineSize, "enemy-2": characterCombatWeapons.autopistol.magazineSize },
      actionPhaseStartPositionByCombatantId: { ...next.tacticalMap.actionPhaseStartPositionByCombatantId, ...legacyPositions },
      deployedCharacterIds: next.tacticalMap.scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id),
    },
  };
  if (!initializesActiveTacticalTestMap) return fixture;

  let configured = characterCombatReducer(fixture, selectTacticalLightingPreset("exterior-dark"));
  const loadoutIds = tacticalTestInitialization!.payload.loadoutIds;
  configured.tacticalMap!.scenario.combatants.filter((unit) => unit.side === "player").forEach((unit, index) => {
    const items = tacticalTestLoadoutCatalogItems[loadoutIds[index] ?? (index === 0 ? "lag" : "assault")];
    configured = characterCombatReducer(configured, equipTacticalDeploymentItem({ characterId: unit.id, lockerItemId: `test-weapon-${unit.id}`, catalogItemId: items.weapon }));
    configured = characterCombatReducer(configured, equipTacticalDeploymentItem({ characterId: unit.id, lockerItemId: `test-armor-${unit.id}`, catalogItemId: items.armor }));
  });
  return characterCombatReducer(configured, startTacticalScenario());
};

const stateWithCrewAt = (position: { x: number; y: number }, doorOpenById: Record<string, boolean> = {}): CharacterCombatState => {
  const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
  return {
    ...initialized,
    tacticalMap: {
      ...initialized.tacticalMap!,
      scenario: {
        ...initialized.tacticalMap!.scenario,
        combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position } : unit),
      },
      doorOpenById,
      actionPhaseStartPositionByCombatantId: { ...initialized.tacticalMap!.actionPhaseStartPositionByCombatantId, "crew-1": { ...position } },
      activeCharacterId: "crew-1",
    },
  };
};

const stateWithIrisValve = (): CharacterCombatState => {
  const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  draft.terrainPlacements = [];
  draft.drawnWalls = [
    {
      id: "test-iris-wall",
      from: { x: 46, y: 38 },
      to: { x: 49, y: 38 },
      portals: [{ id: "test-iris", kind: "iris-valve", position: 0.5 }],
    },
    { id: "test-iris-east", from: { x: 49, y: 38 }, to: { x: 49, y: 41 } },
    { id: "test-iris-south", from: { x: 49, y: 41 }, to: { x: 46, y: 41 } },
    { id: "test-iris-west", from: { x: 46, y: 41 }, to: { x: 46, y: 38 } },
  ];
  let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
  state = reducer(state, equipTacticalDeploymentItem({ characterId: "crew-1", lockerItemId: "test-lag", catalogItemId: "weapon-light-assault-gun" }));
  state = reducer(state, startTacticalScenario());
  return {
    ...state,
    tacticalMap: {
      ...state.tacticalMap!,
      scenario: {
        ...state.tacticalMap!.scenario,
        combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 47, y: 37 } } : unit),
      },
      actionPhaseStartPositionByCombatantId: { ...state.tacticalMap!.actionPhaseStartPositionByCombatantId, "crew-1": { x: 47, y: 37 } },
      activeCharacterId: "crew-1",
    },
  };
};

const stateWithHatch = (position = { x: 30, y: 30 }): CharacterCombatState => {
  const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  draft.terrainPlacements.push({ id: "hatch-a", terrainDefinitionId: "hatch-1x1", origin: position, rotation: 0 });
  let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
  state = reducer(state, startTacticalScenario());
  const characterPosition = { x: position.x - 1, y: position.y };
  return {
    ...state,
    tacticalMap: {
      ...state.tacticalMap!,
      scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: characterPosition } : unit) },
      actionPhaseStartPositionByCombatantId: { ...state.tacticalMap!.actionPhaseStartPositionByCombatantId, "crew-1": characterPosition },
      activeCharacterId: "crew-1",
    },
  };
};

const stateWithLiquidHydrogen = (filled: boolean): CharacterCombatState => {
  const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
  draft.terrainPlacements.push({ id: "test-hydrogen", terrainDefinitionId: "liquid-hydrogen-2x2", origin: { x: 49, y: 34 }, rotation: 0, terrainSettings: { filled } });
  let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
  state = reducer(state, startTacticalScenario());
  return { ...state, tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-1" } };
};

describe("tactical terrain interactions", () => {
  it("assigns individual locker equipment during deployment and locks it when combat starts", () => {
    let state = characterCombatReducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    const crew = () => state.tacticalMap!.scenario.combatants.filter((unit) => unit.side === "player");
    expect(crew().map((unit) => ({ weapon: unit.weapon.name, armor: unit.armor }))).toEqual([
      { weapon: "No Ranged Weapon", armor: 0 },
      { weapon: "No Ranged Weapon", armor: 0 },
    ]);

    state = characterCombatReducer(state, equipTacticalDeploymentItem({ characterId: "crew-1", lockerItemId: "locker-weapon-1", catalogItemId: "weapon-autopistol" }));
    state = characterCombatReducer(state, equipTacticalDeploymentItem({ characterId: "crew-1", lockerItemId: "locker-armor-1", catalogItemId: "armor-flak-vest" }));
    expect(crew()[0]).toMatchObject({ weapon: characterCombatWeapons.autopistol, armorName: "Flak Vest", armor: 4 });
    state = characterCombatReducer(state, unequipTacticalDeploymentItem({ characterId: "crew-1", kind: "armor" }));
    expect(crew()[0]).toMatchObject({ armorName: "No Armor", armor: 0 });
    state = characterCombatReducer(state, equipTacticalDeploymentItem({ characterId: "crew-1", lockerItemId: "locker-armor-1", catalogItemId: "armor-flak-vest" }));

    state = characterCombatReducer(state, equipTacticalDeploymentItem({ characterId: "crew-2", lockerItemId: "locker-weapon-1", catalogItemId: "weapon-autopistol" }));
    expect(crew()[0].weapon.name).toBe("No Ranged Weapon");
    expect(crew()[1].weapon.name).toBe("Autopistol");
    expect(state.tacticalMap?.deploymentLoadoutByCharacterId).toMatchObject({
      "crew-1": { armorLockerItemId: "locker-armor-1" },
      "crew-2": { weaponLockerItemId: "locker-weapon-1" },
    });

    state = characterCombatReducer(state, unequipTacticalDeploymentItem({ characterId: "crew-2", kind: "weapon" }));
    expect(crew()[1].weapon.name).toBe("No Ranged Weapon");
    state = characterCombatReducer(state, equipTacticalDeploymentItem({ characterId: "crew-2", lockerItemId: "locker-weapon-1", catalogItemId: "weapon-autopistol" }));
    state = characterCombatReducer(state, selectTacticalDeploymentCharacter("crew-1"));
    state = characterCombatReducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = characterCombatReducer(state, selectTacticalDeploymentCharacter("crew-2"));
    state = characterCombatReducer(state, deployTacticalCharacter({ x: 1, y: 42 }));
    state = characterCombatReducer(state, startTacticalScenario());
    state = characterCombatReducer(state, unequipTacticalDeploymentItem({ characterId: "crew-2", kind: "weapon" }));
    expect(state.tacticalMap?.scenarioStatus).toBe("active");
    expect(crew()[1].weapon.name).toBe("Autopistol");

    state = characterCombatReducer(state, resetTacticalScenario());
    expect(state.tacticalMap?.deploymentLoadoutByCharacterId).toEqual({});
    expect(crew().map((unit) => ({ weapon: unit.weapon.name, armor: unit.armor }))).toEqual([
      { weapon: "No Ranged Weapon", armor: 0 },
      { weapon: "No Ranged Weapon", armor: 0 },
    ]);
  });

  it("requires every crew member to be placed in a deployment zone before starting", () => {
    let state = characterCombatReducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    state = characterCombatReducer(state, startTacticalScenario());
    expect(state.tacticalMap?.scenarioStatus).toBe("setup");

    state = characterCombatReducer(state, selectTacticalDeploymentCharacter("crew-1"));
    state = characterCombatReducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = characterCombatReducer(state, selectTacticalDeploymentCharacter("crew-2"));
    state = characterCombatReducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    expect(state.tacticalMap?.deployedCharacterIds).toEqual(["crew-1"]);

    state = characterCombatReducer(state, deployTacticalCharacter({ x: 1, y: 42 }));
    state = characterCombatReducer(state, startTacticalScenario());
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "active", activeCharacterId: "crew-1", deployedCharacterIds: ["crew-1", "crew-2"] });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 0, y: 42 });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")?.position).toEqual({ x: 1, y: 42 });
  });
  it("preserves deployment facing and posture when gameplay starts", () => {
    let state = characterCombatReducer(undefined, initializeTacticalMapSetup(["crew-1"]));
    state = characterCombatReducer(state, rotateTacticalDeploymentCharacter("right"));
    state = characterCombatReducer(state, setTacticalDeploymentPosture("prone"));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ facing: "south", posture: "standing" });

    state = characterCombatReducer(state, deployTacticalCharacter({ x: 0, y: 42 }));
    state = characterCombatReducer(state, rotateTacticalDeploymentCharacter("right"));
    state = characterCombatReducer(state, rotateTacticalDeploymentCharacter("right"));
    state = characterCombatReducer(state, setTacticalDeploymentPosture("prone"));
    state = characterCombatReducer(state, startTacticalScenario());

    expect(state.tacticalMap?.scenarioStatus).toBe("active");
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ facing: "north", posture: "prone" });
  });
  it("resets the complete tactical scenario while preserving HUD placement", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap([
      { id: "crew-1", weaponSkill: 2 },
      { id: "crew-2", weaponSkill: 1 },
    ]));
    const characterHudLayout = { visible: false, pinned: true, position: { x: 310, y: 120 } };
    const enemyHudLayout = { visible: false, pinned: true, position: { x: 850, y: 120 } };
    const actionHudLayout = { visible: true, pinned: true, position: { x: 640, y: 180 } };
    const characterInformationHudLayout = { visible: true, pinned: false, position: { x: 420, y: 90 } };
    const eventsHudLayout = { visible: false, pinned: true, position: { x: 700, y: 90 } };
    const scenarioHudLayout = { visible: false, pinned: true, position: { x: 500, y: 180 } };
    const navigationHudLayout = { visible: false, pinned: true, position: { x: 900, y: 60 } };
    const changed: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 60, y: 44 }, facing: "west" as const, posture: "prone" as const }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 61, y: 44 }, facing: "east" as const, posture: "prone" as const }
              : unit.side === "enemy"
                ? { ...unit, defeated: true, health: 0 }
                : unit),
        },
        movementAnimationByCharacterId: { "crew-1": { sequence: 4, path: [{ x: 60, y: 44 }], mode: "run" } },
        characterHudLayout,
        enemyHudLayout,
        actionHudLayout,
        characterInformationHudLayout,
        eventsHudLayout,
        scenarioHudLayout,
        navigationHudLayout,
        movementMode: "trot",
        plannedDestination: { x: 62, y: 44 },
        plannedMeleeTargetId: "enemy-1",
        grenadeTargeting: true,
        plannedGrenadeTarget: { x: 61, y: 45 },
        lastGrenadeImpact: { kind: "fragmentation", intended: { x: 61, y: 45 }, landing: { x: 62, y: 45 }, scattered: true, blastCells: [{ x: 62, y: 45 }] },
        lastWeaponImpact: { weaponName: "Test Weapon", ammunitionKind: "test-blast", ammunitionLabel: "Test Blast", point: { x: 62, y: 45 }, blastCells: [{ x: 62, y: 45 }], hit: true },
        coveringFireTargeting: true,
        plannedCoveringFireTarget: { x: 60, y: 46 },
        coveringFireLanes: [{ attackerId: "crew-1", target: { x: 60, y: 46 }, cells: [{ x: 60, y: 45 }, { x: 60, y: 46 }] }],
        plannedTreatmentTargetId: "crew-2",
        draggingCombatantByCarrierId: { "crew-1": "crew-2" },
        ahlMeleeStunUntilTurnById: { "crew-1": 6 },
        selectedTerrainObjectId: "control-room-alpha:terminal",
        doorOpenById: { "control-room-alpha:north:door:4": true },
        terminalActiveById: { "control-room-alpha:terminal": true },
        terrainDamageById: { "control-room-alpha:north:wall:3": 7 },
        destroyedTerrainObjectIds: ["control-room-alpha:north:wall:3"],
        ammunitionByCharacterId: { "crew-1": 1, "crew-2": 0 },
        bracedCombatantIds: ["crew-1"],
        coweringCombatantIds: ["crew-2", "enemy-1"],
        panickedCombatantIds: ["enemy-2"],
        pendingCasualtyMoraleChecks: [{ witnessId: "crew-1", casualtyId: "crew-2", occurrence: 4 }],
        casualtyMoraleOccurrence: 4,
        visibleHostileIdsAtPhaseStartByCombatantId: { "crew-1": ["enemy-1"] },
        pendingUnexpectedFireMoraleChecks: [{ combatantId: "crew-1", attackerId: "enemy-1", occurrence: 3 }],
        unexpectedFireMoraleOccurrence: 3,
        turn: 5,
        actionPointsByCharacterId: { "crew-1": 1, "crew-2": 0 },
        actedCharacterIds: ["crew-2"],
        activeCharacterId: "crew-2",
      },
    };

    const reset = reducer(changed, resetTacticalScenario());

    expect(reset.tacticalMap).toMatchObject({
      scenario: { id: "default-tactical-control-room", width: 72, height: 48 },
      movementAnimationByCharacterId: {},
      characterHudLayout,
      enemyHudLayout,
      actionHudLayout,
      characterInformationHudLayout,
      eventsHudLayout,
      scenarioHudLayout,
      navigationHudLayout,
      movementMode: "walk",
      plannedDestination: null,
      plannedMeleeTargetId: null,
      grenadeTargeting: false,
      plannedGrenadeTarget: null,
      lastGrenadeImpact: null,
      lastWeaponImpact: null,
      coveringFireTargeting: false,
      plannedCoveringFireTarget: null,
      coveringFireLanes: [],
      plannedTreatmentTargetId: null,
      draggingCombatantByCarrierId: {},
      ahlMeleeStunUntilTurnById: {},
      selectedTerrainObjectId: null,
      doorOpenById: {},
      terminalActiveById: {},
      terrainDamageById: {},
      destroyedTerrainObjectIds: [],
      ammunitionByCharacterId: { "crew-1": 0, "crew-2": 0 },
      ammunitionByCombatantAndKind: {},
      deploymentLoadoutByCharacterId: {},
      bracedCombatantIds: [],
      coweringCombatantIds: [],
      panickedCombatantIds: [],
      pendingCasualtyMoraleChecks: [],
      casualtyMoraleOccurrence: 0,
      pendingUnexpectedFireMoraleChecks: [],
      unexpectedFireMoraleOccurrence: 0,
      scenarioStatus: "setup",
      lightingPreset: "exterior-dark",
      turn: 1,
      actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
      actedCharacterIds: [],
      activeCharacterId: null,
    });
    expect(reset.tacticalMap?.scenario.combatants.map((unit) => ({ id: unit.id, side: unit.side, position: unit.position, facing: unit.facing, posture: unit.posture, weaponSkill: unit.weaponSkill, defeated: unit.defeated }))).toEqual([
      { id: "crew-1", side: "player", position: { x: 48, y: 34 }, facing: "south", posture: "standing", weaponSkill: 2, defeated: false },
      { id: "crew-2", side: "player", position: { x: 51, y: 34 }, facing: "south", posture: "standing", weaponSkill: 1, defeated: false },
      { id: "enemy-1", side: "enemy", position: { x: 47, y: 41 }, facing: "north", posture: "standing", weaponSkill: 1, defeated: false },
      { id: "enemy-2", side: "enemy", position: { x: 50, y: 43 }, facing: "north", posture: "standing", weaponSkill: 0, defeated: false },
    ]);
    expect(reset.tacticalMap?.scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.weapon.name)).toEqual(["No Ranged Weapon", "No Ranged Weapon"]);
    expect(reset.tacticalMap?.scenario.combatants.map((unit) => ({ id: unit.id, moraleFactor: unit.moraleFactor, leadershipRating: unit.leadershipRating }))).toEqual([
      { id: "crew-1", moraleFactor: 7, leadershipRating: 1 },
      { id: "crew-2", moraleFactor: 7, leadershipRating: 0 },
      { id: "enemy-1", moraleFactor: 7, leadershipRating: 0 },
      { id: "enemy-2", moraleFactor: 7, leadershipRating: 1 },
    ]);
  });

  it("chooses the exterior light level before starting and preserves it on reset", () => {
    let state = reducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "setup", lightingPreset: "exterior-lit", activeCharacterId: null });
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 44, y: 38 })).toBe("illuminated");
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 43, y: 38 })).toBe("illuminated");

    state = reducer(state, selectTacticalLightingPreset("exterior-dark"));
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 43, y: 38 })).toBe("dark");

    state = reducer(state, selectTacticalLightingPreset("exterior-lit"));
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 52, y: 46 })).toBe("illuminated");
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 53, y: 46 })).toBe("illuminated");

    state = reducer(state, startTacticalScenario());
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "active", lightingPreset: "exterior-lit", activeCharacterId: "crew-1" });
    expect(state.tacticalMap?.actionPointsByCharacterId).toMatchObject({ "crew-1": 6, "crew-2": 6 });

    state = reducer(state, resetTacticalScenario());
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "setup", lightingPreset: "exterior-lit", activeCharacterId: null });
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 44, y: 38 })).toBe("illuminated");
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 43, y: 38 })).toBe("illuminated");
  });

  it("initializes and resets an isolated tactical playtest from its draft definition", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.title = "Draft Playtest";
    draft.objective = "Test the draft without changing the base.";
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));

    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "setup", lightingPreset: "exterior-lit", scenario: { title: "Draft Playtest", objective: "Test the draft without changing the base.", exteriorLighting: "illuminated" } });
    expect(defaultTacticalScenarioDefinition.title).toBe("Control Room Assault");

    state = reducer(state, startTacticalScenario());
    state = reducer(state, resetTacticalDraftPlaytest(draft));
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "setup", scenario: { title: "Draft Playtest" }, turn: 1, activeCharacterId: null });
  });

  it("moves a tactical unit across the top of a drawn raised area", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.terrainPlacements = [];
    draft.drawnRaisedAreas = [drawnRectangle("raised-area-test", 45, 33, 7, 7)];
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
    state = reducer(state, startTacticalScenario());

    state = reducer(state, previewTacticalMove({ x: 49, y: 34 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.terrainByCell?.["48:34"]).toBe("elevated");
    expect(state.tacticalMap?.scenario.terrainByCell?.["49:34"]).toBe("elevated");
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 49, y: 34 });
  });

  it("moves a tactical unit onto a bridge deck at its supported elevation", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.terrainPlacements = [
      { id: "bridge", terrainDefinitionId: "bridge-1x5", origin: { x: 48, y: 34 }, rotation: 0 },
    ];
    draft.drawnRaisedAreas = [
      drawnRectangle("north-platform", 47, 32, 3, 3),
      drawnRectangle("south-platform", 47, 38, 3, 3),
    ];
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
    state = reducer(state, startTacticalScenario());
    state = reducer(state, previewTacticalMove({ x: 48, y: 35 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ position: { x: 48, y: 35 }, elevationLevel: 1 });
  });

  it("spends the full activation entering a tactical close-machinery cell", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.fireCells = [];
    draft.terrainPlacements = [{ id: "close-machinery-test", terrainDefinitionId: "close-machinery-1x1", origin: { x: 48, y: 35 }, rotation: 0 }];
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
    state = reducer(state, startTacticalScenario());

    state = reducer(state, previewTacticalMove({ x: 48, y: 35 }));
    expect(state.tacticalMap?.plannedDestination).toEqual({ x: 48, y: 35 });
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 35 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
  });

  it("toggles terrain lights during setup while fire remains a light source", () => {
    let state = reducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 44, y: 38 })).toBe("illuminated");

    state = reducer(state, setTacticalTerrainLights(false));
    expect(state.tacticalMap?.scenario.lightSources?.every((source) => source.on === false)).toBe(true);
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 44, y: 38 })).toBe("dark");
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 48, y: 35 })).toBe("illuminated");

    state = reducer(state, resetTacticalScenario());
    expect(state.tacticalMap?.scenario.lightSources?.every((source) => source.on === true)).toBe(true);
  });

  it("accumulates explored cells and clears later exploration on reset", () => {
    let state = reducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    const initialExploration = state.tacticalMap?.exploredCellKeys ?? [];
    expect(initialExploration).toEqual([]);

    state = reducer(state, recordTacticalExploration(["48:44"]));
    expect(state.tacticalMap?.exploredCellKeys).toEqual(expect.arrayContaining([...initialExploration, "48:44"]));

    state = reducer(state, resetTacticalScenario());
    expect(state.tacticalMap?.exploredCellKeys).toEqual([]);
  });

  it("records, updates, retains, and clears last-known enemy positions", () => {
    let state = reducer(undefined, initializeTacticalMapSetup(["crew-1", "crew-2"]));
    const firstPosition = { x: 47, y: 41 };

    state = reducer(state, recordTacticalEnemySightings({
      visibleCellKeys: [pointKey(firstPosition)],
      enemies: [{ id: "enemy-1", position: firstPosition }],
    }));
    expect(state.tacticalMap?.lastKnownEnemyPositions?.["enemy-1"]).toEqual(firstPosition);
    const recordedState = state;
    state = reducer(state, recordTacticalEnemySightings({
      visibleCellKeys: [pointKey(firstPosition)],
      enemies: [{ id: "enemy-1", position: firstPosition }],
    }));
    expect(state).toBe(recordedState);

    state = reducer(state, recordTacticalEnemySightings({ visibleCellKeys: ["0:0"], enemies: [] }));
    expect(state.tacticalMap?.lastKnownEnemyPositions?.["enemy-1"]).toEqual(firstPosition);

    const updatedPosition = { x: 48, y: 41 };
    state = reducer(state, recordTacticalEnemySightings({
      visibleCellKeys: [pointKey(updatedPosition)],
      enemies: [{ id: "enemy-1", position: updatedPosition }],
    }));
    expect(state.tacticalMap?.lastKnownEnemyPositions?.["enemy-1"]).toEqual(updatedPosition);

    state = reducer(state, recordTacticalEnemySightings({ visibleCellKeys: [pointKey(updatedPosition)], enemies: [] }));
    expect(state.tacticalMap?.lastKnownEnemyPositions?.["enemy-1"]).toBeUndefined();

    state = reducer(state, recordTacticalEnemySightings({
      visibleCellKeys: [pointKey(firstPosition)],
      enemies: [{ id: "enemy-1", position: firstPosition }],
    }));
    state = reducer(state, resetTacticalScenario());
    expect(state.tacticalMap?.lastKnownEnemyPositions).toEqual({});
  });

  it("does not create movement animations for enemies that remain outside crew LOS", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, finishTacticalActivation());
    state = reducer(state, finishTacticalActivation());
    state = reducer(state, runTacticalEnemyPhase({
      enemyRolls: {
        "enemy-1": { hitDice: { first: 3, second: 4 }, woundDice: { first: 3, second: 4 } },
        "enemy-2": { hitDice: { first: 3, second: 4 }, woundDice: { first: 3, second: 4 } },
      },
    }));

    expect(state.tacticalMap?.movementAnimationByCharacterId).toEqual({});
    expect(state.tacticalMap?.events.some((event) => event.includes("Security Guard") || event.includes("Control Room Officer"))).toBe(false);
    expect(state.tacticalMap?.scenario.combatants.filter((unit) => unit.side === "enemy").map((unit) => ({ id: unit.id, position: unit.position, facing: unit.facing }))).toEqual([
      { id: "enemy-1", position: { x: 48, y: 38 }, facing: "north" },
      { id: "enemy-2", position: { x: 52, y: 42 }, facing: "east" },
    ]);
    expect(state.tacticalMap).toMatchObject({ turn: 2, activeCharacterId: "crew-1" });
  });

  it("clears selected terrain when the active character changes", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, activateTacticalCharacter("crew-2"));
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.selectedTerrainObjectId).toBeNull();
  });

  it("selects a visible enemy and previews the existing snap-shot mode", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    expect(state.tacticalMap?.plannedAttackTargetId).toBe("enemy-1");
    state = reducer(state, selectTacticalAttackMode("snap"));
    expect(state.tacticalMap?.plannedAttackMode).toBe("snap");
    state = reducer(state, cancelTacticalAttack());
    expect(state.tacticalMap?.plannedAttackTargetId).toBeNull();
    expect(state.tacticalMap?.plannedAttackMode).toBeNull();
  });

  it("resolves a tactical snap shot with the existing AP, ammunition, and wound rules", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("snap"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    const enemy = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1");
    expect(enemy).toMatchObject({ health: 0, defeated: true, woundState: "dead" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.plannedAttackTargetId).toBeNull();
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
    expect(state.tacticalMap?.events[0]).toContain("crew-1 snap fired at Security Guard");
  });

  it("aims for 2 AP, applies +1 to the next attack, then clears the aim", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, aimTacticalAttack());
    expect(state.tacticalMap?.aimedTargetId).toBe("enemy-1");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.events[0]).toBe("crew-1 aimed at Security Guard (2 AP)");
    state = reducer(state, selectTacticalAttackMode("snap"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 5, second: 4 }, woundDice: { first: 6, second: 6 } }));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")).toMatchObject({ defeated: true, woundState: "dead" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(1);
    expect(state.tacticalMap?.aimedTargetId).toBeNull();
  });

  it("clears tactical aim when the active character changes", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, aimTacticalAttack());
    state = reducer(state, activateTacticalCharacter("crew-2"));
    expect(state.tacticalMap?.aimedTargetId).toBeNull();
  });

  it("drives tactical ammunition selection, attacks, and reloads from arbitrary weapon profile data", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    const profiles = [
      { kind: "needle-round", label: "Needle", effectiveRange: 8, longRange: 16, extremeRange: 24, penetration: 1, automatic: false, structuralDamage: 1 },
      { kind: "storm-round", label: "Storm", effectiveRange: 12, longRange: 24, extremeRange: 36, penetration: 5, automatic: true, automaticFireBonusByRange: { effective: 2, long: 1 }, collateralBlast: true, structuralDamage: 3 },
    ];
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? {
            ...unit,
            weapon: { ...unit.weapon, name: "Profile Test Weapon", magazineSize: 5, ammunitionKind: "needle-round", ammunitionProfiles: profiles, effectiveRange: 8, longRange: 16, extremeRange: 24, penetration: 1, automatic: false, structuralDamage: 1 },
          } : unit),
        },
        ammunitionByCharacterId: { ...state.tacticalMap!.ammunitionByCharacterId, "crew-1": 3 },
        ammunitionByCombatantAndKind: { ...state.tacticalMap!.ammunitionByCombatantAndKind, "crew-1": { "needle-round": 3, "storm-round": 5 } },
      },
    };

    state = reducer(state, selectTacticalWeaponAmmunition("storm-round"));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.weapon).toMatchObject({ ammunitionKind: "storm-round", penetration: 5, automatic: true, structuralDamage: 3 });
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(5);
    state = reducer(state, selectTacticalWeaponAmmunition("needle-round"));
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(3);
    state = reducer(state, selectTacticalWeaponAmmunition("storm-round"));
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("automatic"));
    expect(state.tacticalMap?.plannedAttackMode).toBe("automatic");
    const targetPosition = state.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-1")!.position;
    const expectedBlastCells = collateralBlastCells(state.tacticalMap!.scenario, targetPosition);
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 }, collateralRolls: {} }));
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(2);
    expect(state.tacticalMap?.ammunitionByCombatantAndKind["crew-1"]).toEqual({ "needle-round": 3, "storm-round": 2 });
    expect(state.tacticalMap?.lastWeaponImpact).toEqual({ weaponName: "Profile Test Weapon", ammunitionKind: "storm-round", ammunitionLabel: "Storm", point: targetPosition, blastCells: expectedBlastCells, hit: true });

    state = {
      ...state,
      tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-1", actedCharacterIds: [], actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 3 } },
    };
    state = reducer(state, reloadTacticalWeapon());
    expect(state.tacticalMap?.ammunitionByCombatantAndKind["crew-1"]).toEqual({ "needle-round": 3, "storm-round": 5 });
  });

  it("previews and cancels a tactical fragmentation grenade without spending it", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, beginTacticalGrenadeTargeting());
    expect(state.tacticalMap).toMatchObject({ grenadeTargeting: true, movementMode: null, lastGrenadeImpact: null });
    state = reducer(state, previewTacticalGrenadeTarget({ x: 47, y: 41 }));
    expect(state.tacticalMap?.plannedGrenadeTarget).toEqual({ x: 47, y: 41 });
    state = reducer(state, cancelTacticalGrenadeTargeting());

    expect(state.tacticalMap).toMatchObject({ grenadeTargeting: false, plannedGrenadeTarget: null, movementMode: "walk" });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.grenades).toBe(1);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("resolves a tactical fragmentation grenade with existing scatter, blast, wound, AP, and inventory rules", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, beginTacticalGrenadeTargeting());
    state = reducer(state, previewTacticalGrenadeTarget({ x: 47, y: 41 }));
    state = reducer(state, confirmTacticalGrenade({
      throwDice: { first: 6, second: 6 },
      scatterDice: { first: 1, second: 1 },
      rollsByCombatantId: { "enemy-1": { first: 6, second: 6 } },
      collateralRolls: { "enemy-1": { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.tacticalMap?.lastGrenadeImpact).toMatchObject({ kind: "fragmentation", intended: { x: 47, y: 41 }, landing: { x: 47, y: 41 }, scattered: false });
    expect(state.tacticalMap?.lastGrenadeImpact?.blastCells).toHaveLength(25);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")).toMatchObject({ defeated: true, woundState: "dead" });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.grenades).toBe(0);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-1 landed a fragmentation grenade at 47,41")]));
  });

  it("gives both tactical test characters one smoke grenade", () => {
    const state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const players = state.tacticalMap!.scenario.combatants.filter((unit) => unit.side === "player");

    expect(players.map((unit) => unit.smokeGrenades)).toEqual([1, 1]);
  });

  it("throws tactical smoke with grenade targeting and scatter rules without causing wounds", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    const targetBefore = state.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    state = reducer(state, beginTacticalSmokeGrenadeTargeting());
    state = reducer(state, previewTacticalGrenadeTarget({ x: 47, y: 41 }));
    state = reducer(state, confirmTacticalGrenade({
      throwDice: { first: 6, second: 6 },
      scatterDice: { first: 1, second: 1 },
      rollsByCombatantId: { "enemy-1": { first: 6, second: 6 } },
      collateralRolls: { "enemy-1": { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    const expectedSmoke = grenadeBlastCells(state.tacticalMap!.scenario, { x: 47, y: 41 });
    const targetAfter = state.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    expect(state.tacticalMap?.lastGrenadeImpact).toEqual({ kind: "smoke", intended: { x: 47, y: 41 }, landing: { x: 47, y: 41 }, scattered: false, blastCells: expectedSmoke });
    expect(state.tacticalMap?.scenario.smokeCells).toEqual(expectedSmoke);
    expect(targetAfter).toMatchObject({ health: targetBefore.health, woundState: targetBefore.woundState, defeated: targetBefore.defeated });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.smokeGrenades).toBe(0);
    expect(state.tacticalMap?.smokeClearsAtTurnByCell).toEqual(Object.fromEntries(expectedSmoke.map((cell) => [pointKey(cell), 4])));
    expect(hasLineOfSight(state.tacticalMap!.scenario, { x: 47, y: 39 }, { x: 47, y: 41 })).toBe(false);
  });

  it("places tactical smoke at the scattered landing square after a missed throw", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, beginTacticalSmokeGrenadeTargeting());
    state = reducer(state, previewTacticalGrenadeTarget({ x: 47, y: 41 }));
    state = reducer(state, confirmTacticalGrenade({
      throwDice: { first: 1, second: 1 },
      scatterDice: { first: 1, second: 1 },
      rollsByCombatantId: {},
      collateralRolls: {},
    }));

    const impact = state.tacticalMap!.lastGrenadeImpact!;
    expect(impact.scattered).toBe(true);
    expect(impact.landing).not.toEqual(impact.intended);
    expect(state.tacticalMap?.scenario.smokeCells).toEqual(grenadeBlastCells(state.tacticalMap!.scenario, impact.landing));
  });

  it("clears tactical smoke after three turns and restores it on scenario reset", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const smokeCell = { x: 48, y: 37 };
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        turn: 3,
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { ...initialized.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0 },
        scenario: { ...initialized.tacticalMap!.scenario, smokeCells: [smokeCell] },
        smokeClearsAtTurnByCell: { [pointKey(smokeCell)]: 4 },
      },
    };

    const nextTurn = reducer(ready, runTacticalEnemyPhase({ enemyRolls: {} }));
    expect(nextTurn.tacticalMap?.turn).toBe(4);
    expect(nextTurn.tacticalMap?.scenario.smokeCells).toEqual([]);
    expect(nextTurn.tacticalMap?.smokeClearsAtTurnByCell).toEqual({});

    const changed: CharacterCombatState = {
      ...nextTurn,
      tacticalMap: {
        ...nextTurn.tacticalMap!,
        scenario: {
          ...nextTurn.tacticalMap!.scenario,
          smokeCells: [smokeCell],
          combatants: nextTurn.tacticalMap!.scenario.combatants.map((unit) => unit.side === "player" ? { ...unit, smokeGrenades: 0 } : unit),
        },
      },
    };
    const reset = reducer(changed, resetTacticalScenario());
    expect(reset.tacticalMap?.scenario.smokeCells ?? []).toEqual([]);
    expect(reset.tacticalMap?.scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.smokeGrenades)).toEqual([1, 1]);
  });

  it("extinguishes adjacent tactical fire for three AP and clears the resulting smoke next turn", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const fire = { x: 48, y: 35 };
    expect(state.tacticalMap?.scenario.fireCells).toContainEqual(fire);
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 49, y: 35 })).toBe("illuminated");

    state = reducer(state, previewTacticalExtinguishFire(fire));
    expect(state.tacticalMap?.plannedExtinguishFire).toEqual(fire);
    state = reducer(state, confirmTacticalExtinguishFire());

    expect(state.tacticalMap?.scenario.fireCells).not.toContainEqual(fire);
    expect(tacticalLightingLevelAt(state.tacticalMap!.scenario, { x: 49, y: 35 })).toBe("dark");
    expect(state.tacticalMap?.scenario.smokeCells).toContainEqual(fire);
    expect(state.tacticalMap?.smokeClearsAtTurnByCell[pointKey(fire)]).toBe(2);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");

    const ready: CharacterCombatState = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0 },
      },
    };
    state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: {} }));
    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.scenario.smokeCells).not.toContainEqual(fire);
    expect(state.tacticalMap?.smokeClearsAtTurnByCell).toEqual({});
  });

  it("rejects distant tactical fire and restores the default fire on reset", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, previewTacticalExtinguishFire({ x: 60, y: 44 }));
    state = reducer(state, confirmTacticalExtinguishFire());
    expect(state.tacticalMap?.plannedExtinguishFire).toBeNull();
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);

    state = reducer(state, previewTacticalExtinguishFire({ x: 48, y: 35 }));
    state = reducer(state, confirmTacticalExtinguishFire());
    state = reducer(state, resetTacticalScenario());
    expect(state.tacticalMap?.scenario.fireCells).toEqual([{ x: 48, y: 35 }]);
    expect(state.tacticalMap?.scenario.smokeCells).toEqual([]);
  });

  it("requires explicit satchel-charge possession and spends the entire activation to emplace one", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    expect(initialized.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.breachingCharges).toBe(1);
    expect(initialized.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")?.breachingCharges ?? 0).toBe(0);

    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: { ...initialized.tacticalMap!, activeCharacterId: "crew-2" },
    };
    state = reducer(state, beginTacticalSatchelPlacement());
    state = reducer(state, confirmTacticalSatchelPlacement());
    expect(state.tacticalMap?.satchelCharges).toEqual([]);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-2"]).toBe(6);

    state = { ...initialized, tacticalMap: { ...initialized.tacticalMap!, scenario: { ...initialized.tacticalMap!.scenario, combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 48, y: 37 } } : unit) } } };
    state = reducer(state, beginTacticalSatchelPlacement());
    state = reducer(state, confirmTacticalSatchelPlacement());
    expect(state.tacticalMap?.satchelCharges[0]).toMatchObject({ placerId: "crew-1", position: { x: 48, y: 37 }, placedTurn: 1 });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.breachingCharges).toBe(0);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
  });

  it("allows only the placer to detonate the satchel for one AP and applies penetration 30 structural damage", () => {
    let state = stateWithCrewAt({ x: 48, y: 37 });
    state = reducer(state, beginTacticalSatchelPlacement());
    state = reducer(state, confirmTacticalSatchelPlacement());
    const chargeId = state.tacticalMap!.satchelCharges[0].id;
    state = reducer({
      ...state,
      tacticalMap: { ...state.tacticalMap!, activeCharacterId: "crew-2", actedCharacterIds: [], actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-2": 6 } },
    }, detonateTacticalSatchelCharge({ chargeId, rollsByCombatantId: {} }));
    expect(state.tacticalMap?.satchelCharges).toHaveLength(1);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-2"]).toBe(6);

    state = reducer({
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: { ...state.tacticalMap!.scenario, combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 48, y: 34 } } : unit) },
        activeCharacterId: "crew-1",
        actedCharacterIds: [],
        actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 6 },
      },
    }, detonateTacticalSatchelCharge({ chargeId, rollsByCombatantId: {} }));

    const northDoorId = "control-room-alpha:north:door:4";
    expect(state.tacticalMap?.satchelCharges).toEqual([]);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(5);
    expect(state.tacticalMap?.terrainDamageById[northDoorId]).toBe(26);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toContain(northDoorId);
    expect(state.tacticalMap?.doorOpenById[northDoorId]).toBe(true);
  });

  it("allows a character in the charge square to spend an entire activation defusing it", () => {
    let state = stateWithCrewAt({ x: 48, y: 37 });
    state = reducer(state, beginTacticalSatchelPlacement());
    state = reducer(state, confirmTacticalSatchelPlacement());
    const chargeId = state.tacticalMap!.satchelCharges[0].id;
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        activeCharacterId: "crew-1",
        actedCharacterIds: [],
        actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 6 },
      },
    };
    state = reducer(state, defuseTacticalSatchelCharge(chargeId));
    expect(state.tacticalMap?.satchelCharges).toEqual([]);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
  });

  it("prematurely detonates a primed satchel that receives collateral damage with penetration 2 or greater", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, beginTacticalSatchelPlacement());
    state = reducer(state, confirmTacticalSatchelPlacement());
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    state = reducer(state, beginTacticalGrenadeTargeting());
    state = reducer(state, previewTacticalGrenadeTarget({ x: 48, y: 34 }));
    state = reducer(state, confirmTacticalGrenade({
      rollsByCombatantId: {},
      throwDice: { first: 4, second: 4 },
      scatterDice: { first: 1, second: 1 },
      collateralRolls: Object.fromEntries(state.tacticalMap!.scenario.combatants.map((unit) => [unit.id, { checkDice: { first: 6, second: 6 }, woundDice: { first: 1, second: 1 } }])),
    }));

    expect(state.tacticalMap?.satchelCharges).toEqual([]);
    expect(state.tacticalMap?.events.some((event) => event.includes("Satchel charge detonated at 48,34"))).toBe(true);
  });

  it("previews and cancels tactical treatment without spending AP or a medkit", () => {
    const initialized = stateWithCrewAt({ x: 47, y: 39 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 47, y: 40 }, woundState: "light" as const } : unit),
        },
      },
    };
    state = reducer(state, previewTacticalTreatment("crew-2"));
    expect(state.tacticalMap).toMatchObject({ plannedTreatmentTargetId: "crew-2", movementMode: null });
    state = reducer(state, cancelTacticalTreatment());

    expect(state.tacticalMap).toMatchObject({ plannedTreatmentTargetId: null, movementMode: "walk" });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.medkits).toBe(1);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("rejects non-adjacent treatment and dragging a dead ally", () => {
    const initialized = stateWithCrewAt({ x: 47, y: 39 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 45, y: 39 }, woundState: "light" as const } : unit),
        },
      },
    };

    state = reducer(state, previewTacticalTreatment("crew-2"));
    expect(state.tacticalMap?.plannedTreatmentTargetId).toBeNull();

    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 46, y: 39 }, woundState: "dead" as const, defeated: true, health: 0 } : unit),
        },
      },
    };
    state = reducer(state, beginTacticalDragging("crew-2"));

    expect(state.tacticalMap?.draggingCombatantByCarrierId).toEqual({});
  });

  it("treats an adjacent light wound for 6 AP and one medkit", () => {
    const initialized = stateWithCrewAt({ x: 47, y: 39 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 47, y: 40 }, woundState: "light" as const } : unit),
        },
      },
    };
    state = reducer(state, previewTacticalTreatment("crew-2"));
    state = reducer(state, confirmTacticalTreatment());

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")).toMatchObject({ woundState: "healthy", seriousWounds: 0, defeated: false });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.medkits).toBe(0);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events[0]).toBe("crew-1 treated crew-2: healthy");
  });

  it("stabilizes an adjacent serious wound without returning the patient to action", () => {
    const initialized = stateWithCrewAt({ x: 47, y: 39 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 47, y: 40 }, woundState: "serious" as const, seriousWounds: 1, defeated: true, health: 0 } : unit),
        },
      },
    };
    state = reducer(state, previewTacticalTreatment("crew-2"));
    state = reducer(state, confirmTacticalTreatment());

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")).toMatchObject({ woundState: "serious", seriousWounds: 1, defeated: true, health: 0 });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.medkits).toBe(0);
    expect(state.tacticalMap?.activeCharacterId).toBeNull();
    expect(state.tacticalMap?.events[0]).toBe("crew-1 treated crew-2: serious stabilized; remains incapacitated");
  });

  it("begins and releases dragging for an adjacent incapacitated non-dead ally", () => {
    const initialized = stateWithCrewAt({ x: 47, y: 39 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 46, y: 39 }, woundState: "serious" as const, seriousWounds: 1, defeated: true, health: 0 } : unit),
        },
      },
    };
    state = reducer(state, beginTacticalDragging("crew-2"));
    expect(state.tacticalMap?.draggingCombatantByCarrierId).toEqual({ "crew-1": "crew-2" });
    expect(state.tacticalMap?.events[0]).toBe("crew-1 began dragging crew-2");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    expect(state.tacticalMap?.plannedAttackTargetId).toBeNull();

    state = reducer(state, releaseTacticalDraggedCombatant());
    expect(state.tacticalMap?.draggingCombatantByCarrierId).toEqual({});
    expect(state.tacticalMap?.events[0]).toBe("crew-2 released");
  });

  it("limits a dragging carrier to two squares and moves the patient behind them", () => {
    const initialized = stateWithCrewAt({ x: 48, y: 34 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 47, y: 34 }, woundState: "serious" as const, seriousWounds: 1, defeated: true, health: 0 } : unit),
        },
      },
    };
    state = reducer(state, beginTacticalDragging("crew-2"));
    state = reducer(state, previewTacticalMove({ x: 48, y: 37 }));
    state = reducer(state, confirmTacticalMove(undefined));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 34 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);

    state = reducer(state, previewTacticalMove({ x: 48, y: 36 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 36 });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")?.position).toEqual({ x: 48, y: 35 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(2);
    expect(state.tacticalMap?.draggingCombatantByCarrierId).toEqual({ "crew-1": "crew-2" });

    state = reducer(state, previewTacticalMove({ x: 48, y: 39 }));
    state = reducer(state, confirmTacticalMove(undefined));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 36 });

  });

  it("previews and cancels a tactical AHL melee exchange without ending activation", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const }
              : unit),
        },
      },
    };
    state = reducer(state, previewTacticalMelee("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedMeleeTargetId: "enemy-1", movementMode: null });
    state = reducer(state, cancelTacticalMelee());

    expect(state.tacticalMap).toMatchObject({ plannedMeleeTargetId: null, movementMode: "walk" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
  });

  it("allows an adjacent target to be deliberately selected for either fire or melee", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const }
              : unit),
        },
      },
    };

    expect(tacticalRangedEnemies(state.tacticalMap!.scenario, "crew-1").map((unit) => unit.id)).toContain("enemy-1");
    expect(meleeEnemies(state.tacticalMap!.scenario, "crew-1").map((unit) => unit.id)).toContain("enemy-1");

    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedAttackTargetId: "enemy-1", plannedMeleeTargetId: null });

    state = reducer(state, previewTacticalMelee("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedAttackTargetId: null, plannedMeleeTargetId: "enemy-1" });
  });

  it("keeps a same-square enemy melee-only", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    const scenario = {
      ...initialized.tacticalMap!.scenario,
      walls: [],
      doors: [],
      objects: [],
      combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
        ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
        : unit.id === "enemy-1"
          ? { ...unit, position: { x: 10, y: 10 }, facing: "west" as const }
          : unit),
    };

    expect(tacticalRangedEnemies(scenario, "crew-1").map((unit) => unit.id)).not.toContain("enemy-1");
    expect(meleeEnemies(scenario, "crew-1").map((unit) => unit.id)).toContain("enemy-1");
  });

  it("resolves tactical AHL melee and its eligible return attack simultaneously", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const, meleeRating: 7, armor: 0, armorName: "Clothing" }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const, meleeRating: 0, armor: 0, armorName: "Clothing" }
              : unit),
        },
      },
    };
    state = reducer(state, previewTacticalMelee("enemy-1"));
    state = reducer(state, confirmTacticalMelee({ attackRoll: 6, responseRoll: 6 }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")).toMatchObject({ woundState: "dead", defeated: true, health: 0 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("AHL melee exchange resolved simultaneously"),
      expect.stringContaining("crew-1 → Security Guard"),
      expect.stringContaining("Security Guard → crew-1"),
    ]));
  });

  it("applies an AHL stun as a temporary light wound without incapacitation", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const, meleeRating: 0, armor: 0, armorName: "Clothing" }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const, meleeRating: 0, armor: 0, armorName: "Clothing" }
              : unit.id === "enemy-2"
                ? { ...unit, defeated: true, health: 0 }
                : unit),
        },
      },
    };

    state = reducer(state, previewTacticalMelee("enemy-1"));
    state = reducer(state, confirmTacticalMelee({ attackRoll: 4, responseRoll: 1 }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")).toMatchObject({ woundState: "light", defeated: false });
    expect(state.tacticalMap?.ahlMeleeStunUntilTurnById["enemy-1"]).toBe(2);
    expect(state.tacticalMap?.pendingCasualtyMoraleChecks).toEqual([]);
  });

  it("previews and resolves an AHL melee dive after the enemy defensive snap", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const, meleeRating: 7, armor: 0, armorName: "Clothing" }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 12, y: 10 }, facing: "west" as const, meleeRating: 0, armor: 0, armorName: "Clothing" }
              : unit.id === "enemy-2"
                ? { ...unit, defeated: true, health: 0 }
                : unit),
        },
      },
    };
    const enemyAmmunition = state.tacticalMap!.ammunitionByCharacterId["enemy-1"];

    state = reducer(state, setTacticalMovementMode("trot"));
    state = reducer(state, previewTacticalMeleeDive("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedMeleeTargetId: "enemy-1", plannedDestination: { x: 12, y: 10 }, movementMode: "trot" });

    const canceled = reducer(state, previewTacticalMove(null));
    expect(canceled.tacticalMap).toMatchObject({ plannedMeleeTargetId: null, plannedDestination: null, movementMode: "trot" });

    state = reducer(canceled, previewTacticalMeleeDive("enemy-1"));
    state = reducer(state, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      enemyReactionRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      meleeDice: { attackRoll: 4, responseRoll: 6 },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 12, y: 10 });
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")).toMatchObject({ position: { x: 12, y: 10 }, woundState: "dead", defeated: true });
    expect(state.tacticalMap?.actionPointsByCharacterId["enemy-1"]).toBe(3);
    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(enemyAmmunition - 1);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("Security Guard defensive snap fired at crew-1"),
      expect.stringContaining("crew-1 dive → Security Guard"),
      expect.stringContaining("roll 4 → 6: dead"),
      expect.stringContaining("AHL melee dive resolved simultaneously"),
    ]));
  });

  it("does not resolve the melee dive when the defensive snap kills the diver", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const, armor: 0, armorName: "Clothing" }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 12, y: 10 }, facing: "west" as const }
              : unit.id === "enemy-2"
                ? { ...unit, defeated: true, health: 0 }
                : unit),
        },
      },
    };

    state = reducer(state, setTacticalMovementMode("trot"));
    state = reducer(state, previewTacticalMeleeDive("enemy-1"));
    state = reducer(state, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      enemyReactionRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
      meleeDice: { attackRoll: 6, responseRoll: 1 },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ defeated: true, position: { x: 11, y: 10 } });
    expect(state.tacticalMap?.events.some((event) => event.includes("AHL melee dive resolved simultaneously"))).toBe(false);
  });

  it("enters an enemy-occupied square, ends movement, and leaves melee optional", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 12, y: 10 }, facing: "west" as const }
              : unit.id === "enemy-2"
                ? { ...unit, defeated: true, health: 0 }
                : unit),
        },
      },
    };
    const enemyAmmunition = state.tacticalMap!.ammunitionByCharacterId["enemy-1"];

    state = reducer(state, previewTacticalEnemyEntry("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedEnemyEntryTargetId: "enemy-1", plannedDestination: { x: 12, y: 10 }, movementMode: "walk" });

    const canceled = reducer(state, previewTacticalMove(null));
    expect(canceled.tacticalMap).toMatchObject({ plannedEnemyEntryTargetId: null, plannedDestination: null, movementMode: "walk" });

    let bypass = reducer(canceled, previewTacticalMove({ x: 13, y: 10 }));
    bypass = reducer(bypass, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
    }));
    expect(bypass.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 10, y: 10 });

    state = reducer(canceled, previewTacticalEnemyEntry("enemy-1"));
    state = reducer(state, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      enemyReactionRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 12, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(1);
    expect(state.tacticalMap?.actionPointsByCharacterId["enemy-1"]).toBe(3);
    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(enemyAmmunition - 1);
    expect(state.tacticalMap).toMatchObject({ activeCharacterId: "crew-1", movementMode: null, enemySquareEnteredCombatantIds: ["crew-1"] });
    expect(state.tacticalMap?.actedCharacterIds).not.toContain("crew-1");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("Security Guard defensive snap fired at crew-1"),
      expect.stringContaining("crew-1 entered Security Guard's square"),
    ]));

    state = reducer(state, setTacticalMovementMode("walk"));
    expect(state.tacticalMap?.movementMode).toBeNull();
    state = reducer(state, previewTacticalMelee("enemy-1"));
    expect(state.tacticalMap).toMatchObject({ plannedMeleeTargetId: "enemy-1", movementMode: null });
  });

  it("commits a tactical covering-fire lane for 3 AP and reserves its ammunition", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, beginTacticalCoveringFire());
    expect(state.tacticalMap).toMatchObject({ coveringFireTargeting: true, movementMode: null });

    state = reducer(state, previewTacticalCoveringFire({ x: 47, y: 41 }));
    expect(state.tacticalMap?.plannedCoveringFireTarget).toEqual({ x: 47, y: 41 });
    state = reducer(state, confirmTacticalCoveringFire());

    expect(state.tacticalMap?.coveringFireLanes).toEqual([{ attackerId: "crew-1", target: { x: 47, y: 41 }, cells: [{ x: 47, y: 40 }, { x: 47, y: 41 }, { x: 47, y: 42 }, { x: 47, y: 43 }, { x: 47, y: 44 }, { x: 47, y: 45 }, { x: 47, y: 46 }] }]);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events[0]).toBe("crew-1 covers lane through 47,41 (3 AP, 1 ammo reserved)");
  });

  it("cancels tactical covering-fire targeting without spending AP or ammunition", () => {
    let state = stateWithCrewAt({ x: 47, y: 39 });
    state = reducer(state, beginTacticalCoveringFire());
    state = reducer(state, previewTacticalCoveringFire({ x: 47, y: 41 }));
    state = reducer(state, cancelTacticalCoveringFire());

    expect(state.tacticalMap).toMatchObject({ coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], movementMode: "walk" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(4);
  });

  it("lets the default LAG select a visible covering-fire square and rejects a square behind the control-room wall", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, beginTacticalCoveringFire());

    state = reducer(state, previewTacticalCoveringFire({ x: 47, y: 41 }));
    expect(state.tacticalMap?.plannedCoveringFireTarget).toBeNull();

    state = reducer(state, previewTacticalCoveringFire({ x: 48, y: 36 }));
    expect(state.tacticalMap?.plannedCoveringFireTarget).toEqual({ x: 48, y: 36 });
  });

  it("fires a committed tactical covering-fire lane when an enemy occupies its danger space", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 50, y: 39 }, facing: "south" as const }
            : unit.id === "crew-2" || unit.id === "enemy-1"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-2"
                ? { ...unit, position: { x: 50, y: 42 }, facing: "north" as const }
                : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coveringFireLanes: [{ attackerId: "crew-1", target: { x: 50, y: 42 }, cells: [{ x: 50, y: 40 }, { x: 50, y: 41 }, { x: 50, y: 42 }] }],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.suppressedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-1 covering fired at Control Room Officer")]));
    expect(state.tacticalMap?.coveringFireLanes).toEqual([]);
  });

  it("clears an untriggered tactical covering-fire area at the end of the enemy phase", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const lane = { attackerId: "crew-1", target: { x: 48, y: 35 }, cells: [{ x: 48, y: 35 }] };
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coveringFireLanes: [lane],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: {
        "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
        "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      },
    }));

    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.coveringFireLanes).toEqual([]);
  });

  it("offers the covering-fire shooter a retained snap shot before beginning the next turn", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 47, y: 39 }, facing: "south" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 47, y: 42 }, facing: "north" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 3, "crew-2": 0, "enemy-1": 0 },
        coveringFireCommittedCombatantIds: ["crew-1"],
        coveringFireLanes: [{ attackerId: "crew-1", target: { x: 48, y: 39 }, cells: [{ x: 48, y: 39 }] }],
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["crew-1"];

    let state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.tacticalMap).toMatchObject({ turn: 1, activeCharacterId: "crew-1", pendingCoveringFireSnapIds: ["crew-1"], coveringFireLanes: [] });
    state = reducer(state, resolveTacticalCoveringFireSnap({
      fire: true,
      targetId: "enemy-1",
      hitDice: { first: 1, second: 1 },
      woundDice: { first: 1, second: 1 },
      phaseRolls: { enemyRolls: {} },
    }));

    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.pendingCoveringFireSnapIds).toEqual([]);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition - 1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-1 retained snap fired at Security Guard")]));
  });

  it("skips the retained covering-fire snap when the shooter has no legal target", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: { ...initialized.tacticalMap!.scenario, combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.side === "enemy" ? { ...unit, defeated: true, health: 0 } : unit) },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 3, "crew-2": 0 },
        coveringFireCommittedCombatantIds: ["crew-1"],
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["crew-1"];
    const state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: {} }));

    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.pendingCoveringFireSnapIds).toEqual([]);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition);
    expect(state.tacticalMap?.events).not.toEqual(expect.arrayContaining([expect.stringContaining("may take the retained snap shot")]));
  });

  it("stops an enemy before a covering-fire danger space after a failed exposure check", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 24,
          height: 6,
          walls: [],
          doors: [],
          objects: [{ id: "cover-console", kind: "console", position: { x: 19, y: 2 }, label: "Cover Console" }],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 2 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 20, y: 2 }, facing: "west" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coveringFireLanes: [{ attackerId: "crew-1", target: { x: 19, y: 1 }, cells: [{ x: 19, y: 1 }, { x: 20, y: 1 }, { x: 19, y: 2 }, { x: 19, y: 3 }, { x: 20, y: 3 }] }],
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["crew-1"];

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      coveringFireMoraleRolls: { "enemy-1": { first: 6, second: 6 } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 20, y: 2 });
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Security Guard exposure-to-covering-fire morale 12/7: stopped before danger space")]));
    expect(state.tacticalMap?.events.some((event) => event.includes("covering fired"))).toBe(false);
  });

  it("allows covering fire to trigger after a passed exposure check", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 24,
          height: 6,
          walls: [],
          doors: [],
          objects: [{ id: "cover-console", kind: "console", position: { x: 19, y: 2 }, label: "Cover Console" }],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 2 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 20, y: 2 }, facing: "west" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coveringFireLanes: [{ attackerId: "crew-1", target: { x: 19, y: 1 }, cells: [{ x: 19, y: 1 }, { x: 20, y: 1 }, { x: 19, y: 2 }, { x: 19, y: 3 }, { x: 20, y: 3 }] }],
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["crew-1"];

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      coveringFireMoraleRolls: { "enemy-1": { first: 1, second: 1 } },
    }));

    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition - 1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("Security Guard exposure-to-covering-fire morale 2/7: passed"),
      expect.stringContaining("crew-1 covering fired as Security Guard crossed the lane"),
    ]));
  });

  it("resolves automatic fire for 6 AP and 3 ammunition with the existing two-hit danger-space limit", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"], ["assault", "breacher"]));
    const enemyTemplate = state.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: [
            ...state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 47, y: 39 } } : unit.id === "enemy-2" ? { ...unit, position: { x: 47, y: 42 } } : unit),
            { ...enemyTemplate, id: "enemy-3", name: "Rear Guard", position: { x: 47, y: 43 } },
          ],
        },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("automatic"));
    expect(state.tacticalMap?.plannedAttackMode).toBe("automatic");
    state = reducer(state, confirmTacticalAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      secondaryRolls: {
        "enemy-2": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } },
        "enemy-3": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } },
      },
    }));
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(27);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.defeated).toBe(true);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-2")?.defeated).toBe(true);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-3")?.woundState).toBe("healthy");
    expect(state.tacticalMap?.events.filter((event) => event.includes("automatic fired")).length).toBe(2);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
  });

  it("uses automatic fire to suppress a tactical target without causing a wound", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"], ["assault", "breacher"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 47, y: 39 } } : unit),
        },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("suppressive"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.suppressedCombatantIds).toContain("enemy-1");
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.woundState).toBe("healthy");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(27);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events[0]).toContain("crew-1 suppressive fired at Security Guard");
  });

  it("spends tactical suppressive-fire AP and ammunition when suppression fails", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"], ["assault", "breacher"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 47, y: 39 } } : unit),
        },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("suppressive"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.suppressedCombatantIds).not.toContain("enemy-1");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(27);
    expect(state.tacticalMap?.events[0]).toContain("held position");
  });

  it("does not spend resources trying to suppress an already suppressed tactical target", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"], ["assault", "breacher"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 47, y: 39 } } : unit),
        },
        suppressedCombatantIds: ["enemy-1"],
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("suppressive"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.plannedAttackMode).toBeNull();
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(30);
  });

  it("rallies a suppressed tactical crew member for 3 AP and preserves the activation", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const suppressed: CharacterCombatState = {
      ...initialized,
      tacticalMap: { ...initialized.tacticalMap!, suppressedCombatantIds: ["crew-1"], plannedDestination: { x: 48, y: 35 } },
    };

    const state = reducer(suppressed, rallyTacticalCharacter());

    expect(state.tacticalMap?.suppressedCombatantIds).not.toContain("crew-1");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
    expect(state.tacticalMap?.plannedDestination).toBeNull();
    expect(state.tacticalMap?.events[0]).toBe("crew-1 rallied (3 AP)");
  });

  it("ends the activation when Rally spends the crew member's last 3 AP", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const suppressed: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        suppressedCombatantIds: ["crew-1"],
        actionPointsByCharacterId: { "crew-1": 3, "crew-2": 6 },
      },
    };

    const state = reducer(suppressed, rallyTacticalCharacter());

    expect(state.tacticalMap?.suppressedCombatantIds).not.toContain("crew-1");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
  });

  it("does not rally an unsuppressed character or one with fewer than 3 AP", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));

    const unsuppressed = reducer(initialized, rallyTacticalCharacter());
    expect(unsuppressed.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(unsuppressed.tacticalMap?.events).toEqual(initialized.tacticalMap?.events);

    const insufficient: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        suppressedCombatantIds: ["crew-1"],
        actionPointsByCharacterId: { ...initialized.tacticalMap!.actionPointsByCharacterId, "crew-1": 2 },
      },
    };
    const unchanged = reducer(insufficient, rallyTacticalCharacter());

    expect(unchanged.tacticalMap?.suppressedCombatantIds).toContain("crew-1");
    expect(unchanged.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(2);
  });

  it("evades exactly one legal square for 6 AP and ends the activation", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, setTacticalMovementMode("evade"));
    state = reducer(state, previewTacticalMove({ x: 48, y: 35 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 35 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.evadingCombatantIds).toEqual(["crew-1"]);
    expect(state.tacticalMap?.actedCharacterIds).toContain("crew-1");
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events[0]).toBe("crew-1 evaded to 48,35 (6 AP)");
  });

  it("sidesteps or backsteps one non-forward square for 4 AP while preserving facing", () => {
    let state = stateWithCrewAt({ x: 10, y: 10 });
    state = reducer(state, setTacticalMovementMode("sidestep"));
    state = reducer(state, previewTacticalMove({ x: 11, y: 10 }));
    state = reducer(state, confirmTacticalMove(undefined));

    const character = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1");
    expect(character?.position).toEqual({ x: 11, y: 10 });
    expect(character?.facing).toBe("south");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(2);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
    expect(state.tacticalMap?.events[0]).toBe("crew-1 sidestepped/backstepped to 11,10 (4 AP)");
  });

  it("does not allow sidestep mode to move into a forward square", () => {
    let state = stateWithCrewAt({ x: 10, y: 10 });
    state = reducer(state, setTacticalMovementMode("sidestep"));
    state = reducer(state, previewTacticalMove({ x: 10, y: 11 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 10, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("charges tactical movement congestion only for active occupants", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    const withOccupant = (defeated: boolean): CharacterCombatState => ({
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "south" as const }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 10, y: 11 }, defeated, health: defeated ? 0 : unit.health, woundState: defeated ? "serious" as const : unit.woundState }
              : unit),
        },
      },
    });

    let activeOccupant = reducer(withOccupant(false), previewTacticalMove({ x: 10, y: 11 }));
    activeOccupant = reducer(activeOccupant, confirmTacticalMove(undefined));
    expect(activeOccupant.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 10, y: 11 });
    expect(activeOccupant.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(activeOccupant.tacticalMap?.events[0]).toBe("crew-1 moved to 10,11 (3 AP)");

    let incapacitatedOccupant = reducer(withOccupant(true), previewTacticalMove({ x: 10, y: 11 }));
    incapacitatedOccupant = reducer(incapacitatedOccupant, confirmTacticalMove(undefined));
    expect(incapacitatedOccupant.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(incapacitatedOccupant.tacticalMap?.events[0]).toBe("crew-1 moved to 10,11 (2 AP)");
  });

  it("stops crew movement before adjacency and snap fires after a failed morale check", () => {
    let state = stateWithCrewAt({ x: 10, y: 10 });
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" || unit.id === "enemy-2"
            ? { ...unit, defeated: true, health: 0 }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 13, y: 10 } }
              : unit),
        },
      },
    };
    const ammunition = state.tacticalMap!.ammunitionByCharacterId["crew-1"];
    state = reducer(state, previewTacticalMove({ x: 12, y: 10 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 6, second: 6 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 11, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition - 1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("crew-1 moving-adjacent morale 12/7: stopped before Security Guard"),
      expect.stringContaining("crew-1 moving-adjacent failure snap fired at Security Guard"),
    ]));
    expect(state.tacticalMap?.movingAdjacentMoraleResultByLeaderId).toEqual({ "crew-1": false });
  });

  it("allows crew movement into adjacency after a passed morale check", () => {
    let state = stateWithCrewAt({ x: 10, y: 10 });
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" || unit.id === "enemy-2"
            ? { ...unit, defeated: true, health: 0 }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 13, y: 10 } }
              : unit),
        },
      },
    };
    state = reducer(state, previewTacticalMove({ x: 12, y: 10 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 1, second: 1 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 12, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-1 moving-adjacent morale 2/7: passed")]));
    expect(state.tacticalMap?.movingAdjacentMoraleResultByLeaderId).toEqual({ "crew-1": true });
  });

  it("applies a passed player leader result to a later friendly moving-adjacent check", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [], doors: [], objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, leadershipRating: 1 }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 10, y: 11 } }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 13, y: 11 } }
                : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: "crew-2",
        movingAdjacentMoraleResultByLeaderId: { "crew-1": true },
      },
    };
    state = reducer(state, previewTacticalMove({ x: 12, y: 11 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 4, second: 4 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")?.position).toEqual({ x: 12, y: 11 });
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-2 moving-adjacent morale 8/8 · leadership +1: passed")]));
  });

  it("subtracts a failed player leader result and clears results on the next turn", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [], doors: [], objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, leadershipRating: 1 }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 10, y: 11 } }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 13, y: 11 } }
                : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: "crew-2",
        movingAdjacentMoraleResultByLeaderId: { "crew-1": false },
      },
    };
    state = reducer(state, previewTacticalMove({ x: 12, y: 11 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 3, second: 4 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } }));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-2")?.position).toEqual({ x: 11, y: 11 });
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-2 moving-adjacent morale 7/6 · leadership -1: stopped before Security Guard")]));

    state = reducer({
      ...state,
      tacticalMap: { ...state.tacticalMap!, activeCharacterId: null, actedCharacterIds: ["crew-1", "crew-2"], actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0 } },
    }, runTacticalEnemyPhase({ enemyRolls: {} }));
    expect(state.tacticalMap?.movingAdjacentMoraleResultByLeaderId).toEqual({});
  });

  it("allows a stationary enemy to spend 3 AP on a defensive snap as crew enters adjacency", () => {
    let state = stateWithCrewAt({ x: 10, y: 10 });
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" || unit.id === "enemy-2"
            ? { ...unit, defeated: true, health: 0 }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 13, y: 10 }, facing: "west" as const }
              : unit),
        },
      },
    };
    const ammunition = state.tacticalMap!.ammunitionByCharacterId["enemy-1"];
    state = reducer(state, previewTacticalMove({ x: 12, y: 10 }));
    const planned = state;
    state = reducer(planned, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      enemyReactionRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 12, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["enemy-1"]).toBe(3);
    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(ammunition - 1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Security Guard defensive snap fired at crew-1")]));

    const stopped = reducer(planned, confirmTacticalMove({
      moraleDice: { first: 1, second: 1 },
      snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      enemyReactionRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));
    expect(stopped.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ position: { x: 12, y: 10 }, defeated: true });
    expect(stopped.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(stopped.tacticalMap).toMatchObject({ scenarioStatus: "defeat", activeCharacterId: null });
    expect(stopped.tacticalMap?.events).toContain("Defeat — all crew are incapacitated");
  });

  it("uses an enemy's remaining 3 AP for a snap instead of a 6-AP attack", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 } }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 12, y: 10 }, facing: "west" as const, weapon: { ...unit.weapon, automatic: false } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { ...initialized.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0, "enemy-1": 3, "enemy-2": 0 },
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["enemy-1"];
    const state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(ammunition - 1);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Security Guard snap fired at crew-1")]));
    expect(state.tacticalMap?.events.some((event) => event.includes("Security Guard aimed fired"))).toBe(false);
  });

  it("uses a snap shot against adjacent crew when the enemy has a ranged weapon", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 } }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { ...initialized.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0, "enemy-1": 6, "enemy-2": 0 },
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Security Guard snap fired at crew-1")]));
    expect(state.tacticalMap?.events.some((event) => event.includes("AHL melee exchange resolved simultaneously"))).toBe(false);
  });

  it("uses melee against adjacent crew when the enemy is unarmed", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 } }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 11, y: 10 }, facing: "west" as const, weapon: { ...characterCombatWeapons.noRangedWeapon } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        ammunitionByCharacterId: { ...initialized.tacticalMap!.ammunitionByCharacterId, "enemy-1": 0 },
        actionPointsByCharacterId: { ...initialized.tacticalMap!.actionPointsByCharacterId, "crew-1": 0, "crew-2": 0, "enemy-1": 6, "enemy-2": 0 },
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("AHL melee exchange resolved simultaneously: Security Guard and crew-1")]));
    expect(state.tacticalMap?.events.some((event) => event.includes("snap fired"))).toBe(false);
  });

  it("braces a prone tactical crew member for 2 AP and adds +1 ranged accuracy", () => {
    const base = stateWithCrewAt({ x: 47, y: 39 });
    const prone: CharacterCombatState = {
      ...base,
      tacticalMap: {
        ...base.tacticalMap!,
        scenario: {
          ...base.tacticalMap!.scenario,
          combatants: base.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, posture: "prone" as const } : unit),
        },
      },
    };
    let unbraced = reducer(prone, selectTacticalAttackTarget("enemy-1"));
    unbraced = reducer(unbraced, selectTacticalAttackMode("snap"));
    unbraced = reducer(unbraced, confirmTacticalAttack({ hitDice: { first: 2, second: 2 }, woundDice: { first: 1, second: 1 } }));

    let braced = reducer(prone, braceTacticalWeapon());
    expect(braced.tacticalMap?.bracedCombatantIds).toEqual(["crew-1"]);
    expect(braced.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(braced.tacticalMap?.events[0]).toBe("crew-1 braced their weapon (2 AP)");
    braced = reducer(braced, selectTacticalAttackTarget("enemy-1"));
    braced = reducer(braced, selectTacticalAttackMode("snap"));
    braced = reducer(braced, confirmTacticalAttack({ hitDice: { first: 2, second: 2 }, woundDice: { first: 1, second: 1 } }));

    const hitTotal = (state: CharacterCombatState) => Number(state.tacticalMap?.events.find((event) => event.includes("snap fired"))?.match(/total (-?\d+)\//)?.[1]);
    expect(hitTotal(braced)).toBe(hitTotal(unbraced) + 1);
  });

  it("rejects tactical bracing while standing or suppressed and clears it on standing", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, braceTacticalWeapon());
    expect(state.tacticalMap?.bracedCombatantIds).toEqual([]);

    state = reducer(state, toggleTacticalPosture());
    state = { ...state, tacticalMap: { ...state.tacticalMap!, suppressedCombatantIds: ["crew-1"] } };
    state = reducer(state, braceTacticalWeapon());
    expect(state.tacticalMap?.bracedCombatantIds).toEqual([]);

    state = { ...state, tacticalMap: { ...state.tacticalMap!, suppressedCombatantIds: [] } };
    state = reducer(state, braceTacticalWeapon());
    expect(state.tacticalMap?.bracedCombatantIds).toEqual(["crew-1"]);
    state = { ...state, tacticalMap: { ...state.tacticalMap!, actionPointsByCharacterId: { ...state.tacticalMap!.actionPointsByCharacterId, "crew-1": 6 } } };
    state = reducer(state, toggleTacticalPosture());
    expect(state.tacticalMap?.bracedCombatantIds).toEqual([]);
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.posture).toBe("standing");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.events[0]).toBe("crew-1 stood up (6 AP)");
  });

  it("requires all 6 AP to stand a prone tactical crew member", () => {
    const base = stateWithCrewAt({ x: 47, y: 39 });
    const prone: CharacterCombatState = {
      ...base,
      tacticalMap: {
        ...base.tacticalMap!,
        scenario: {
          ...base.tacticalMap!.scenario,
          combatants: base.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, posture: "prone" as const } : unit),
        },
        actionPointsByCharacterId: { ...base.tacticalMap!.actionPointsByCharacterId, "crew-1": 5 },
      },
    };

    const state = reducer(prone, toggleTacticalPosture());

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.posture).toBe("prone");
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(5);
  });

  it("rejects an Evade destination more than one square away", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, setTacticalMovementMode("evade"));
    state = reducer(state, previewTacticalMove({ x: 48, y: 36 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 48, y: 34 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.evadingCombatantIds).toEqual([]);
  });

  it("rejects Evade into an active-occupied square because its 6 AP cannot also pay congestion", () => {
    const initialized = stateWithCrewAt({ x: 10, y: 10 });
    let state: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" ? { ...unit, position: { x: 10, y: 11 } } : unit),
        },
      },
    };
    state = reducer(state, setTacticalMovementMode("evade"));
    state = reducer(state, previewTacticalMove({ x: 10, y: 11 }));
    state = reducer(state, confirmTacticalMove(undefined));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.position).toEqual({ x: 10, y: 10 });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.evadingCombatantIds).toEqual([]);
  });

  it("applies the tactical Evade −2 to enemy ranged fire and expires it before the next activation", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 50, y: 39 } }
            : unit.id === "crew-2" || unit.id === "enemy-1"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-2"
                ? { ...unit, position: { x: 50, y: 42 }, facing: "north" as const }
                : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        evadingCombatantIds: ["crew-1"],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 4, second: 4 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")?.woundState).toBe("healthy");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Control Room Officer aimed fired at crew-1: raw 2d6 8 · DM -2 · total 6/8 · miss")]));
    expect(state.tacticalMap?.evadingCombatantIds).toEqual([]);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
  });

  it("does not select an enemy blocked by the closed control-room wall", () => {
    const state = reducer(reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"])), selectTacticalAttackTarget("enemy-1"));
    expect(state.tacticalMap?.plannedAttackTargetId).toBeNull();
  });

  it("reloads for 3 AP, clears targeting, logs the event, and advances an exhausted activation", () => {
    const base = stateWithCrewAt({ x: 47, y: 39 });
    const state = reducer({
      ...base,
      tacticalMap: {
        ...base.tacticalMap!,
        ammunitionByCharacterId: { ...base.tacticalMap!.ammunitionByCharacterId, "crew-1": 1 },
        actionPointsByCharacterId: { ...base.tacticalMap!.actionPointsByCharacterId, "crew-1": 3 },
        plannedAttackTargetId: "enemy-1",
        plannedAttackMode: "snap",
      },
    }, reloadTacticalWeapon());
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.plannedAttackTargetId).toBeNull();
    expect(state.tacticalMap?.plannedAttackMode).toBeNull();
    expect(state.tacticalMap?.events[0]).toBe("crew-1 reloaded (3 AP)");
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
  });

  it("commands an adjacent door to open next action phase for 2 AP", () => {
    let state = stateWithCrewAt({ x: 48, y: 37 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBeUndefined();
    expect(state.tacticalMap?.pendingDoorCommandsById["control-room-alpha:north:door:4"]).toEqual({ open: true, resolvesAtTurn: 2, characterId: "crew-1" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");

    state = { ...state, tacticalMap: { ...state.tacticalMap!, activeCharacterId: null, actedCharacterIds: ["crew-1", "crew-2"] } };
    state = reducer(state, runTacticalEnemyPhase({ enemyRolls: {} }));
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(true);
    expect(state.tacticalMap?.pendingDoorCommandsById).toEqual({});
    expect(state.tacticalMap?.events).toContain("Control-room door opened at the start of Turn 2");
  });

  it("commands an adjacent open door to close next action phase for 2 AP", () => {
    let state = stateWithCrewAt({ x: 48, y: 37 }, { "control-room-alpha:north:door:4": true });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(true);
    expect(state.tacticalMap?.pendingDoorCommandsById["control-room-alpha:north:door:4"]).toEqual({ open: false, resolvesAtTurn: 2, characterId: "crew-1" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
  });

  it("commands an adjacent iris valve for 2 AP", () => {
    let state = stateWithIrisValve();
    state = reducer(state, selectTacticalTerrainObject("test-iris"));
    state = reducer(state, interactWithTacticalTerrain());

    expect(state.tacticalMap?.pendingDoorCommandsById["test-iris"]).toEqual({ open: true, resolvesAtTurn: 2, characterId: "crew-1" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(4);
    expect(state.tacticalMap?.events[0]).toContain("activated the iris valve");
  });

  it("prevents an iris valve opening across a pressure differential", () => {
    let state = stateWithIrisValve();
    state = { ...state, tacticalMap: { ...state.tacticalMap!, scenario: { ...state.tacticalMap!.scenario, vacuumSources: [{ x: 47, y: 37 }] } } };
    state = reducer(state, selectTacticalTerrainObject("test-iris"));
    state = reducer(state, interactWithTacticalTerrain());

    expect(state.tacticalMap?.pendingDoorCommandsById).toEqual({});
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(state.tacticalMap?.events[0]).toContain("pressure differential");
  });

  it("commands a hatch to open next turn for 6 AP", () => {
    let state = stateWithHatch();
    state = reducer(state, selectTacticalTerrainObject("hatch-a:hatch"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.pendingDoorCommandsById["hatch-a:hatch"]).toEqual({ open: true, resolvesAtTurn: 2, characterId: "crew-1" });
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.events[0]).toContain("activated the hatch");

    state = reducer(state, finishTacticalActivation());
    state = reducer(state, runTacticalEnemyPhase({ enemyRolls: {} }));
    expect(state.tacticalMap?.doorOpenById["hatch-a:hatch"]).toBe(true);
    expect(state.tacticalMap?.events).toContain("Hatch opened at the start of Turn 2");
  });

  it("kills a character on the first filled liquid-hydrogen square entered", () => {
    let state = stateWithLiquidHydrogen(true);
    state = reducer(state, previewTacticalMove({ x: 50, y: 34 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 3, second: 3 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, enemyReactionRolls: {} }));
    const character = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1");
    expect(character).toMatchObject({ position: { x: 49, y: 34 }, woundState: "dead", defeated: true });
    expect(state.tacticalMap?.events[0]).toContain("entered liquid hydrogen at 49,34 and was killed");
  });

  it("allows normal movement across an empty liquid-hydrogen area", () => {
    let state = stateWithLiquidHydrogen(false);
    state = reducer(state, previewTacticalMove({ x: 49, y: 34 }));
    state = reducer(state, confirmTacticalMove({ moraleDice: { first: 3, second: 3 }, snapDice: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, enemyReactionRolls: {} }));
    const character = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1");
    expect(character).toMatchObject({ position: { x: 49, y: 34 }, woundState: "healthy", defeated: false });
    expect(state.tacticalMap?.events[0]).toContain("moved to 49,34");
  });

  it("uses the AHL iris-valve penetration modifier and 10-point breach threshold", () => {
    const base = stateWithIrisValve();
    let state: CharacterCombatState = { ...base, tacticalMap: { ...base.tacticalMap!, terrainDamageById: { "test-iris": 9 }, ammunitionByCharacterId: { ...base.tacticalMap!.ammunitionByCharacterId, "crew-1": 4 } } };
    state = reducer(state, selectTacticalTerrainObject("test-iris"));
    state = reducer(state, fireAtTacticalTerrain({ hitDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.terrainDamageById["test-iris"]).toBe(10);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toContain("test-iris");
    expect(state.tacticalMap?.doorOpenById["test-iris"]).toBe(true);
  });

  it("activates the Security Terminal and completes the default scenario", () => {
    let state = stateWithCrewAt({ x: 48, y: 41 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:terminal"));
    state = reducer(state, attemptTacticalConsoleCheck({ operationId: "secure-security-terminal", dice: { first: 4, second: 4 } }));
    expect(state.tacticalMap?.terminalActiveById["control-room-alpha:terminal"]).toBe(true);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap).toMatchObject({ scenarioStatus: "victory", activeCharacterId: null });
    expect(state.tacticalMap?.events[0]).toBe("Victory — crew-1 completed Secure Security Terminal");
    state = reducer(state, activateTacticalCharacter("crew-2"));
    expect(state.tacticalMap?.activeCharacterId).toBeNull();
  });

  it("activates a standalone console without automatically completing the scenario", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.terrainPlacements.push({ id: "test-console", terrainDefinitionId: "console-1x1", origin: { x: 49, y: 34 }, rotation: 0 });
    let state = reducer(undefined, initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
    state = reducer(state, startTacticalScenario());
    state = reducer(state, selectTacticalTerrainObject("test-console:terminal"));
    state = reducer(state, interactWithTacticalTerrain());

    expect(state.tacticalMap?.terminalActiveById["test-console:terminal"]).toBe(true);
    expect(state.tacticalMap?.scenarioStatus).toBe("active");
    expect(state.tacticalMap?.events).toContain("crew-1 activated Console");
  });

  it("rejects terrain interaction when the character is not adjacent", () => {
    let state = stateWithCrewAt({ x: 40, y: 40 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBeUndefined();
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("uses action-phase-start adjacency for tactical sliding-door commands", () => {
    let beganAdjacent = stateWithCrewAt({ x: 48, y: 37 });
    beganAdjacent = {
      ...beganAdjacent,
      tacticalMap: {
        ...beganAdjacent.tacticalMap!,
        scenario: {
          ...beganAdjacent.tacticalMap!.scenario,
          combatants: beganAdjacent.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 40, y: 40 } } : unit),
        },
      },
    };
    beganAdjacent = reducer(beganAdjacent, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    beganAdjacent = reducer(beganAdjacent, interactWithTacticalTerrain());
    expect(beganAdjacent.tacticalMap?.pendingDoorCommandsById["control-room-alpha:north:door:4"]?.open).toBe(true);

    let movedAdjacent = stateWithCrewAt({ x: 40, y: 40 });
    movedAdjacent = {
      ...movedAdjacent,
      tacticalMap: {
        ...movedAdjacent.tacticalMap!,
        scenario: {
          ...movedAdjacent.tacticalMap!.scenario,
          combatants: movedAdjacent.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1" ? { ...unit, position: { x: 48, y: 37 } } : unit),
        },
      },
    };
    movedAdjacent = reducer(movedAdjacent, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    movedAdjacent = reducer(movedAdjacent, interactWithTacticalTerrain());
    expect(movedAdjacent.tacticalMap?.pendingDoorCommandsById).toEqual({});
    expect(movedAdjacent.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("uses the equipped tactical weapon, ammunition, and existing door breach threshold", () => {
    let state: CharacterCombatState = { ...stateWithCrewAt({ x: 48, y: 34 }), tacticalMap: { ...stateWithCrewAt({ x: 48, y: 34 }).tacticalMap!, terrainDamageById: { "control-room-alpha:north:door:4": 4 }, ammunitionByCharacterId: { "crew-1": 4, "crew-2": 6 } } };
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, fireAtTacticalTerrain({ hitDice: { first: 6, second: 6 } }));
    expect(state.tacticalMap?.terrainDamageById["control-room-alpha:north:door:4"]).toBe(6);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toContain("control-room-alpha:north:door:4");
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(true);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
  });

  it("breaches only the selected one-unit wall segment at 25 structural damage", () => {
    const base = stateWithCrewAt({ x: 48, y: 34 });
    let state: CharacterCombatState = { ...base, tacticalMap: { ...base.tacticalMap!, terrainDamageById: { "control-room-alpha:north:wall:3": 24 }, ammunitionByCharacterId: { "crew-1": 4, "crew-2": 6 } } };
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:wall:3"));
    state = reducer(state, fireAtTacticalTerrain({ hitDice: { first: 6, second: 6 } }));
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toEqual(["control-room-alpha:north:wall:3"]);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).not.toContain("control-room-alpha:north:wall:2");
  });

  it("waits for an explicit end turn after every living crew activation is complete", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = reducer(state, finishTacticalActivation());
    state = reducer(state, finishTacticalActivation());

    expect(state.tacticalMap).toMatchObject({
      turn: 1,
      activeCharacterId: null,
      actedCharacterIds: ["crew-1", "crew-2"],
      actionPointsByCharacterId: { "crew-1": 6, "crew-2": 6 },
    });
    state = reducer(state, activateTacticalCharacter("crew-1"));
    expect(state.tacticalMap?.activeCharacterId).toBeNull();
  });

  it("runs enemy fire with the existing wound rules, then refreshes living crew for the next turn", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 50, y: 39 }, armor: 4, armorName: "Flak Vest" }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 51, y: 39 } }
              : unit.id === "enemy-1"
                ? { ...unit, defeated: true, health: 0 }
                : unit.id === "enemy-2"
                  ? { ...unit, position: { x: 50, y: 42 }, facing: "north" as const }
                  : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        lastWeaponImpact: { weaponName: "Profile Test Weapon", ammunitionKind: "storm-round", ammunitionLabel: "Storm", point: { x: 50, y: 42 }, blastCells: [{ x: 50, y: 42 }], hit: true },
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.lastWeaponImpact).toBeNull();
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "crew-1")).toMatchObject({ defeated: true, woundState: "serious" });
    expect(state.tacticalMap?.actionPointsByCharacterId).toEqual({ "crew-1": 0, "crew-2": 6, "enemy-1": 0, "enemy-2": 6 });
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Control Room Officer aimed fired at crew-1")]));
    expect(state.tacticalMap?.events[0]).toBe("Turn 2 begins");
  });

  it("moves default-scenario enemies toward the crew when the control-room wall blocks fire", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
      },
    };
    const starts = Object.fromEntries(ready.tacticalMap!.scenario.combatants.filter((unit) => unit.side === "enemy").map((unit) => [unit.id, unit.position]));

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: {
        "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
        "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } },
      },
    }));

    const movedEnemyIds = state.tacticalMap!.scenario.combatants.filter((unit) => unit.side === "enemy" && (unit.position.x !== starts[unit.id].x || unit.position.y !== starts[unit.id].y)).map((unit) => unit.id);
    expect(movedEnemyIds.length).toBeGreaterThan(0);
    expect(state.tacticalMap?.events.some((event) => event.includes("moved to") || event.includes("opened control-room"))).toBe(false);
  });

  it("opens a route door through mutable scenario state after read-only route calculation", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const doorId = "control-room-alpha:north:door:4";
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 48, y: 36 } }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 48, y: 38 }, facing: "north" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0, "enemy-1": 6, "enemy-2": 0 },
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.doorOpenById[doorId]).toBe(true);
    expect(state.tacticalMap?.scenario.doors.find((door) => door.id === doorId)?.open).toBe(true);
  });

  it("stops enemy movement before adjacency and snap fires after a failed morale check", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const enemyTemplate = initialized.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 } }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 16, y: 10 }, facing: "west" as const, weapon: { ...unit.weapon, effectiveRange: 3, longRange: 3, extremeRange: 3, automatic: false } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["enemy-1"];

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      movingAdjacentMoraleRolls: { "enemy-1": { first: 6, second: 6 } },
      movingAdjacentSnapRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 13, y: 10 });
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("Security Guard moving-adjacent morale 12/7: stopped before crew-1"),
      expect.stringContaining("Security Guard moving-adjacent failure snap fired at crew-1"),
    ]));
    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(ammunition - 1);
    expect(enemyTemplate.weapon.magazineSize).toBe(ammunition);
  });

  it("pauses enemy movement for an eligible stationary crew defensive snap shot", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 11 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 16, y: 10 }, facing: "west" as const, concealed: true, weapon: { ...unit.weapon, effectiveRange: 3, longRange: 3, extremeRange: 3, automatic: false } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 6, "crew-2": 0 },
      },
    };
    const ammunition = ready.tacticalMap!.ammunitionByCharacterId["crew-1"];
    const pending = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      movingAdjacentMoraleRolls: { "enemy-1": { first: 1, second: 1 } },
    }));

    expect(pending.tacticalMap?.turn).toBe(1);
    expect(pending.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 11, y: 11 });
    expect(pending.tacticalMap?.pendingAdjacencyReaction).toEqual({ moverId: "enemy-1", defenderIds: ["crew-1"] });

    const fired = reducer(pending, resolveTacticalAdjacencyReaction({ fire: true, hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(fired.tacticalMap?.pendingAdjacencyReaction).toBeNull();
    expect(fired.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(fired.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition - 1);
    expect(fired.tacticalMap?.events[0]).toContain("crew-1 defensive snap fired at Security Guard");

    const declined = reducer(pending, resolveTacticalAdjacencyReaction({ fire: false, hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(declined.tacticalMap?.pendingAdjacencyReaction).toBeNull();
    expect(declined.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
    expect(declined.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(ammunition);
    expect(declined.tacticalMap?.events[0]).toBe("crew-1 declined the defensive snap shot");
    const resumed = reducer(declined, runTacticalEnemyPhase({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(resumed.tacticalMap?.turn).toBe(2);
    expect(resumed.tacticalMap?.pendingAdjacencyReaction).toBeNull();
  });

  it("does not offer an adjacency reaction to crew who moved", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 16, y: 10 }, facing: "west" as const, weapon: { ...unit.weapon, effectiveRange: 3, longRange: 3, extremeRange: 3, automatic: false } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 3, "crew-2": 0 },
        movedCombatantIds: ["crew-1"],
      },
    };
    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      movingAdjacentMoraleRolls: { "enemy-1": { first: 1, second: 1 } },
    }));

    expect(state.tacticalMap?.pendingAdjacencyReaction).toBeNull();
    expect(state.tacticalMap?.turn).toBe(2);
    expect(state.tacticalMap?.events.some((event) => event.includes("may snap fire"))).toBe(false);
  });

  it("recovers a cowering player at phase start with same-square leadership and no AP cost", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 48, y: 34 }, leadershipRating: 1 }
            : unit.id === "crew-2"
              ? { ...unit, position: { x: 48, y: 34 } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coweringCombatantIds: ["crew-2"],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: {},
      coweringRecoveryRolls: { "crew-2": { first: 4, second: 4 } },
    }));

    expect(state.tacticalMap?.coweringCombatantIds).toEqual([]);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-2"]).toBe(6);
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("crew-2 cowering recovery 8/8 · leadership +1: recovered")]));
  });

  it("queues friendly-casualty morale for a surviving witness with line of sight", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "crew-2"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 12, y: 10 } }
                : { ...unit, position: { x: 12, y: 11 } }),
        },
        activeCharacterId: "crew-1",
        actionPointsByCharacterId: { "crew-1": 6, "crew-2": 0 },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("aimed"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.defeated).toBe(true);
    expect(state.tacticalMap?.pendingCasualtyMoraleChecks).toContainEqual(expect.objectContaining({ witnessId: "enemy-2", casualtyId: "enemy-1" }));
  });

  it("does not queue friendly-casualty morale without line of sight to the casualty", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [{ id: "casualty-screen", from: { x: 9, y: 11 }, to: { x: 11, y: 11 } }],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 8, y: 10 }, facing: "east" as const }
            : unit.id === "crew-2"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 10, y: 10 } }
                : { ...unit, position: { x: 10, y: 12 } }),
        },
        activeCharacterId: "crew-1",
        actionPointsByCharacterId: { "crew-1": 6, "crew-2": 0 },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("aimed"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.defeated).toBe(true);
    expect(state.tacticalMap?.pendingCasualtyMoraleChecks).not.toContainEqual(expect.objectContaining({ witnessId: "enemy-2", casualtyId: "enemy-1" }));
  });

  it("queues unexpected-fire morale when the target did not see the attacker at phase start", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "crew-2"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 12, y: 10 } }
                : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: "crew-1",
        actionPointsByCharacterId: { "crew-1": 6, "crew-2": 0 },
        visibleHostileIdsAtPhaseStartByCombatantId: { "enemy-1": [] },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("aimed"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));

    expect(state.tacticalMap?.pendingUnexpectedFireMoraleChecks).toContainEqual(expect.objectContaining({ combatantId: "enemy-1", attackerId: "crew-1" }));
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.defeated).toBe(false);
  });

  it("does not queue unexpected-fire morale when the attacker was visible at phase start", () => {
    let state = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          walls: [],
          doors: [],
          objects: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 10, y: 10 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 12, y: 10 } }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: "crew-1",
        actionPointsByCharacterId: { "crew-1": 6, "crew-2": 0 },
        visibleHostileIdsAtPhaseStartByCombatantId: { "enemy-1": ["crew-1"] },
      },
    };
    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("aimed"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));

    expect(state.tacticalMap?.pendingUnexpectedFireMoraleChecks).toEqual([]);
  });

  it("sends a failed unexpected-fire target into the existing panic flight", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 8,
          height: 6,
          walls: [{ id: "panic-cover", from: { x: 4, y: 1 }, to: { x: 4, y: 4 } }],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 2 } }
            : unit.id === "crew-2" || unit.id === "enemy-1"
              ? { ...unit, defeated: true, health: 0 }
              : { ...unit, position: { x: 3, y: 2 } }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        pendingUnexpectedFireMoraleChecks: [{ combatantId: "enemy-2", attackerId: "crew-1", occurrence: 1 }],
        unexpectedFireMoraleOccurrence: 1,
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      unexpectedFireMoraleRolls: { "enemy-2": { "crew-1": { first: 6, second: 6 } } },
    }));

    expect(state.tacticalMap?.coweringCombatantIds).toContain("enemy-2");
    expect(state.tacticalMap?.panickedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("Control Room Officer unexpected-fire morale from crew-1: 12/7: panicked")]));
  });

  it("clears a successful unexpected-fire morale check without causing panic", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2" || unit.id === "enemy-1" ? { ...unit, defeated: true, health: 0 } : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        pendingUnexpectedFireMoraleChecks: [{ combatantId: "enemy-2", attackerId: "crew-1", occurrence: 1 }],
        unexpectedFireMoraleOccurrence: 1,
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      unexpectedFireMoraleRolls: { "enemy-2": { "crew-1": { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.pendingUnexpectedFireMoraleChecks).toEqual([]);
    expect(state.tacticalMap?.panickedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.coweringCombatantIds).not.toContain("enemy-2");
  });

  it("forces a failed casualty witness to flee to complete cover and cower", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 8,
          height: 6,
          walls: [{ id: "panic-cover", from: { x: 4, y: 1 }, to: { x: 4, y: 4 } }],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 2 } }
            : unit.id === "crew-2"
              ? { ...unit, defeated: true, health: 0 }
              : unit.id === "enemy-1"
                ? { ...unit, position: { x: 3, y: 3 }, defeated: true, health: 0, woundState: "dead" as const }
                : { ...unit, position: { x: 3, y: 2 } }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        pendingCasualtyMoraleChecks: [{ witnessId: "enemy-2", casualtyId: "enemy-1", occurrence: 1 }],
        casualtyMoraleOccurrence: 1,
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      casualtyMoraleRolls: { "enemy-2": { "enemy-1": { first: 6, second: 6 } } },
    }));
    const witness = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-2");

    expect(witness?.position).not.toEqual({ x: 3, y: 2 });
    expect(state.tacticalMap?.coweringCombatantIds).toContain("enemy-2");
    expect(state.tacticalMap?.panickedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([
      expect.stringContaining("Control Room Officer friendly-casualty morale after Security Guard: 12/7: panicked"),
      expect.stringContaining("Control Room Officer fled to"),
    ]));
  });

  it("clears a successful casualty morale check without causing panic", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-2"
            ? { ...unit, defeated: true, health: 0 }
            : unit.id === "enemy-1"
              ? { ...unit, defeated: true, health: 0, woundState: "dead" as const }
              : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        pendingCasualtyMoraleChecks: [{ witnessId: "enemy-2", casualtyId: "enemy-1", occurrence: 1 }],
        casualtyMoraleOccurrence: 1,
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
      casualtyMoraleRolls: { "enemy-2": { "enemy-1": { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.pendingCasualtyMoraleChecks).toEqual([]);
    expect(state.tacticalMap?.panickedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.coweringCombatantIds).not.toContain("enemy-2");
  });

  it("moves a panicked combatant already in complete cover directly into cowering", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const originalPosition = { x: 5, y: 2 };
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 8,
          height: 6,
          walls: [{ id: "existing-complete-cover", from: { x: 4, y: 1 }, to: { x: 4, y: 4 } }],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 2 } }
            : unit.id === "enemy-2"
              ? { ...unit, position: originalPosition }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        panickedCombatantIds: ["enemy-2"],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));

    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-2")?.position).toEqual(originalPosition);
    expect(state.tacticalMap?.panickedCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.coweringCombatantIds).toContain("enemy-2");
    expect(state.tacticalMap?.movementAnimationByCharacterId["enemy-2"]).toBeUndefined();
  });

  it("bounds panic flight to reachable squares and keeps fleeing when complete cover is unavailable", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          width: 200,
          height: 200,
          walls: [],
          doors: [],
          objects: [],
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 90, y: 100 } }
            : unit.id === "enemy-2"
              ? { ...unit, position: { x: 100, y: 100 }, facing: "east" as const }
              : { ...unit, defeated: true, health: 0 }),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0, "enemy-2": 6 },
        panickedCombatantIds: ["enemy-2"],
      },
    };

    const startedAt = performance.now();
    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } },
    }));
    const elapsed = performance.now() - startedAt;
    const enemy = state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-2");

    expect(enemy?.position.x).toBeGreaterThan(100);
    expect(state.tacticalMap?.panickedCombatantIds).toContain("enemy-2");
    expect(state.tacticalMap?.coweringCombatantIds).not.toContain("enemy-2");
    expect(state.tacticalMap?.events).toEqual(expect.arrayContaining([expect.stringContaining("fled to safer ground")]));
    expect(elapsed).toBeLessThan(250);
  });

  it("keeps a failed cowering enemy from acting during its phase", () => {
    const initialized = reducer(undefined, initializeActiveTacticalTestMap(["crew-1", "crew-2"]));
    const enemy = initialized.tacticalMap!.scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const ready: CharacterCombatState = {
      ...initialized,
      tacticalMap: {
        ...initialized.tacticalMap!,
        scenario: {
          ...initialized.tacticalMap!.scenario,
          combatants: initialized.tacticalMap!.scenario.combatants.map((unit) => unit.id === "enemy-2" ? { ...unit, defeated: true, health: 0 } : unit),
        },
        activeCharacterId: null,
        actedCharacterIds: ["crew-1", "crew-2"],
        actionPointsByCharacterId: { "crew-1": 0, "crew-2": 0 },
        coweringCombatantIds: ["enemy-1"],
      },
    };

    const state = reducer(ready, runTacticalEnemyPhase({
      enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
      coweringRecoveryRolls: { "enemy-1": { first: 6, second: 6 } },
    }));

    expect(state.tacticalMap?.coweringCombatantIds).toContain("enemy-1");
    expect(state.tacticalMap?.scenario.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual(enemy.position);
    expect(state.tacticalMap?.ammunitionByCharacterId["enemy-1"]).toBe(enemy.weapon.magazineSize);
    expect(state.tacticalMap?.events.some((event) => event.includes("Security Guard cowering recovery"))).toBe(false);
  });
});
