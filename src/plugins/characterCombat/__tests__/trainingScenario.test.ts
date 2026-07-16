// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- retired legacy-melee cases remain skipped until their fixtures are deleted.
import { adjacencyEntryStepIndex, adjacentEnemies, adjacentObjectives, automaticFireSecondaryTargets, breachableDoorsAdjacentTo, closedDoorsAdjacentTo, collateralBlastCells, coverAssessment, coverProtection, decompressionMovesForDoor, depressurizedCells, doorBlastCells, dropDownOptions, elevationAttackModifier, fireLaneCells, grenadeBlastCells, grenadeLandingPoint, grenadeThrowRangeModifier, hasLineOfSight, inFieldOfFire, meleeEnemies, openDoorsAdjacentTo, pointKey, proneRotationForFacing, proposedMoveFor, rangedEnemies, reachableMovement, routeAllowingClosedDoors, shortestPathToAny, structuralVerticalSpan, terrainHeightAt, treatableAllies, validGrenadeTargets, vaultOptions, weaponRecoilDistance, zeroGravityPushes, zeroGravityRecoilPath } from "../geometry";
import reducer, { adjustCameraZoom, beginCoveringFire, beginDragging, beginGrenadeTargeting, beginOverwatch, braceWeapon, cancelMovePreview, clearCombatScenario, closeDoor, confirmAttack, confirmBreachDoor, confirmCoveringFire, confirmExtinguishFire, confirmGrenade, confirmMove, confirmOpenDoor, confirmOverwatch, confirmSecureObjective, confirmTreatment, detonateBreachCharge, disengage, endPlayerTurn, evade, finishActivation, fireHighEnergyAtStructure, focusCameraOnSelected, goProne, loadCombatScenario, openDoor, panCameraBy, previewAttack, previewBreachDetonation, previewBreachDoor, previewCoveringFire, previewDropDown, previewExtinguishFire, previewGrenadeTarget, previewMove, previewOpenDoor, previewOverwatch, previewSecureObjective, previewTreatment, rally, rallyAlly, releaseDraggedCombatant, reloadWeapon, resetCamera, rotateCamera, rotateCameraBy, selectAttackMode, selectPlayerCombatant, selectWeaponAmmunition, setArmoryLoadout, setViewMode, standUp, startTrot, turnCombatant, vaultBarrier } from "../slice";
import { buildTrainingScenario } from "../trainingScenario";
import { buildArmorySweepScenario, buildBlackoutScenario, buildCaptureBridgeScenario, buildCaptureCommanderScenario, buildCargoDeckScenario, buildCarrierDeckScenario, buildDamageControlScenario, buildDoorReactionScenario, buildEngineRoomScenario, buildHoldAirlockScenario, buildHullBreachScenario, buildRescueScenario, buildSuppressStrongpointScenario, buildTerrainTrainingScenario, buildZeroGravityScenario, characterCombatScenarios } from "../scenarios";
import { accumulateWound, attackArcAgainstTarget, automaticFireModifierForRange, resolveAhlMelee, resolveSnapShot, snapShotTarget, woundStateForTotal } from "../combatResolution";
import { distanceInSquares } from "../combatResolution";
import { validateCombatScenario } from "../scenarioValidator";
import { applyArmoryLoadouts, characterCombatArmor, characterCombatWeapons } from "../equipment";
import { equipmentVisualFor, woundBadgeFor } from "../equipmentPresentation";
import { diveOptions, reachableCrawling } from "../geometry";
import { ahlMeleeDiveMoves } from "../geometry";
import { beginDive, previewAhlMeleeDive, previewDive } from "../slice";
import { compareEnemyRangedTargets, shouldImproveEnemyRange } from "../enemyTactics";
import type { WeaponProfile } from "../types";
import { aimAtPlannedTarget, beginDoorCoverage, beginSmokeGrenadeTargeting, beginStunGrenadeTargeting, cancelAttackPreview, cancelDoorCoverage, confirmDoorCoverage, coverDoor, previewDoorCoverage, previewMeleeAttack, previewSubdue, readyWeapon, refreshEnemyObservations, restrainEnemy, scenarioAvoidingVisibleCoveredDoors, searchForEnemies, selectCalledShot, toggleAdvanceReady, toggleCautiousMovement, toggleLamp } from "../slice";
import { clearTarget, resolveAdjacencyReaction } from "../slice";
import { lightingLevelAt, visibilityAssessment } from "../geometry";
import { climbUpOptions } from "../geometry";
import { objectiveContesters, stagedObjectiveStatus } from "../geometry";
import { previewClimbUp } from "../slice";
import { buildElevatedStrongpointScenario } from "../scenarios";
import { beginStructuralTargeting, cancelStructuralTargeting, previewStructuralTarget } from "../slice";
import { collateralCheckPasses } from "../slice";
import { acknowledgeAhlMeleeResolution } from "../slice";
import { defaultCharacterCombatHudLayouts, restoreHud, updateHudLayout } from "../slice";

describe("character combat 2D checkpoint", () => {
  it("provides a movable, dismissible, and restorable enemy roster HUD", () => {
    expect(defaultCharacterCombatHudLayouts.enemyRoster).toMatchObject({ visible: true, pinned: false });
    let state = reducer(undefined, updateHudLayout({ id: "enemyRoster", layout: { visible: false, pinned: false, position: { x: 420, y: 610 } } }));
    expect(state.hudLayouts.enemyRoster).toEqual({ visible: false, pinned: false, position: { x: 420, y: 610 } });
    state = reducer(state, restoreHud("enemyRoster"));
    expect(state.hudLayouts.enemyRoster.visible).toBe(true);
  });

  it("measures AHL fire range with straight squares at one and diagonals at one-and-a-half", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };

    target.position = { x: 5, y: 1 };
    expect(distanceInSquares(attacker, target)).toBe(4);
    target.position = { x: 5, y: 5 };
    expect(distanceInSquares(attacker, target)).toBe(6);
    target.position = { x: 5, y: 4 };
    expect(distanceInSquares(attacker, target)).toBe(6);
    target.position = { x: 3, y: 2 };
    expect(distanceInSquares(attacker, target)).toBe(3);
  });

  it("uses AHL traced range rather than Euclidean distance at a range-band boundary", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    attacker.weapon = { ...attacker.weapon, effectiveRange: 5, longRange: 8, extremeRange: 12 };
    target.position = { x: 5, y: 4 };

    expect(snapShotTarget(attacker, target)).toMatchObject({ range: 6, rangeBand: "long", targetNumber: 10 });
  });

  const missEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } };
  const lethalEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }, "enemy-2": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } };

  it("uses the AHL low-roll collateral checks at one and two squares", () => {
    expect(collateralCheckPasses(0, 12)).toBe(true);
    expect(collateralCheckPasses(1, 10)).toBe(true);
    expect(collateralCheckPasses(1, 11)).toBe(false);
    expect(collateralCheckPasses(2, 8)).toBe(true);
    expect(collateralCheckPasses(2, 9)).toBe(false);
    expect(collateralCheckPasses(3, 2)).toBe(false);
  });

  it("lets a stationary enemy spend 3 AP and one round on an adjacency snap shot", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const mover = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const reactor = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== mover.id && unit.id !== reactor.id).forEach((unit) => { unit.defeated = true; });
    mover.position = { x: 1, y: 1 };
    mover.armor = 0;
    reactor.position = { x: 4, y: 1 };
    reactor.weapon = { ...characterCombatWeapons.autopistol };
    reactor.weaponSkill = 4;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(mover.id));
    state = reducer(state, previewMove({ x: 3, y: 1 }));
    state = reducer(state, confirmMove({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 }, adjacencyReactionRollsByCombatantId: { [reactor.id]: { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === mover.id)).toMatchObject({ position: { x: 3, y: 1 }, defeated: true });
    expect(state.actionPointsById[reactor.id]).toBe(3);
    expect(state.ammunitionById[reactor.id]).toBe(11);
    expect(state.events.some((event) => event.includes("movement stopped by adjacency reaction fire"))).toBe(true);
  });

  it("preserves unused stationary AP for a player adjacency-reaction choice", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const reactor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const mover = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    reactor.position = { x: 2, y: 2 };
    mover.position = { x: 4, y: 2 };
    mover.armor = 0;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(reactor.id));
    state = reducer(state, finishActivation());
    expect(state.adjacencyReactionReserveById?.[reactor.id]).toBe(6);
    state = { ...state, pendingAdjacencyReaction: { reactorId: reactor.id, moverId: mover.id, trigger: { x: 3, y: 2 } } };
    state = reducer(state, resolveAdjacencyReaction({ accept: true, hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    expect(state.adjacencyReactionReserveById?.[reactor.id]).toBe(3);
    expect(state.ammunitionById[reactor.id]).toBe((reactor.weapon.magazineSize ?? 12) - 1);
    expect(state.pendingAdjacencyReaction).toBeNull();
  });

  it("detects the first eight-square adjacency entry without retriggering an already-adjacent mover", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.terrainByCell = {};
    const reactor = { x: 2, y: 2 };
    expect(adjacencyEntryStepIndex(scenario, reactor, { x: 0, y: 2 }, [{ x: 1, y: 2 }])).toBe(0);
    expect(adjacencyEntryStepIndex(scenario, reactor, { x: 0, y: 0 }, [{ x: 1, y: 1 }])).toBe(0);
    expect(adjacencyEntryStepIndex(scenario, reactor, { x: 1, y: 1 }, [{ x: 1, y: 2 }])).toBe(-1);

    scenario.doors = [{ id: "reaction-blocker", from: { x: 2, y: 2 }, to: { x: 2, y: 3 }, open: false }];
    expect(adjacencyEntryStepIndex(scenario, reactor, { x: 0, y: 2 }, [{ x: 1, y: 2 }])).toBe(-1);
    scenario.doors = [];
    scenario.terrainByCell = { "1:1": "elevated" };
    expect(adjacencyEntryStepIndex(scenario, reactor, { x: 0, y: 0 }, [{ x: 1, y: 1 }])).toBe(-1);
  });

  it("fires an adjacency snap shot when player movement enters a diagonal neighboring square", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const mover = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const reactor = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== mover.id && unit.id !== reactor.id).forEach((unit) => { unit.defeated = true; });
    mover.position = { x: 0, y: 0 };
    reactor.position = { x: 2, y: 2 };
    reactor.weapon = { ...characterCombatWeapons.autopistol };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(mover.id));
    state = reducer(state, previewMove({ x: 1, y: 1 }));
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, adjacencyReactionRollsByCombatantId: { [reactor.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.actionPointsById[reactor.id]).toBe(3);
    expect(state.ammunitionById[reactor.id]).toBe(11);
    expect(state.events.some((event) => event.includes("adjacency snap shot"))).toBe(true);
  });

  it("uses AHL wound accumulation without stacking light wounds", () => {
    expect(accumulateWound("healthy", "light")).toEqual({ woundState: "light", seriousWounds: 0 });
    expect(accumulateWound("light", "light")).toEqual({ woundState: "light", seriousWounds: 0 });
    expect(accumulateWound("light", "serious")).toEqual({ woundState: "serious", seriousWounds: 1 });
    expect(accumulateWound("serious", "light", 1)).toEqual({ woundState: "serious", seriousWounds: 1 });
    expect(accumulateWound("serious", "serious", 1)).toEqual({ woundState: "dead", seriousWounds: 2 });
  });

  it("maps wound states to compact roster badge kinds", () => {
    expect(woundBadgeFor("healthy")).toBeNull();
    expect(woundBadgeFor("light")).toBe("light");
    expect(woundBadgeFor("serious")).toBe("serious");
    expect(woundBadgeFor("unconscious")).toBe("serious");
    expect(woundBadgeFor("dead")).toBe("dead");
  });

  it("applies the AHL light-wound penalty to morale checks", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const casualty = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    const survivor = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => ![attacker.id, casualty.id, survivor.id].includes(unit.id)).forEach((unit) => { unit.defeated = true; });
    attacker.position = { x: 1, y: 1 };
    attacker.weapon = { ...characterCombatWeapons.gaussRifle };
    casualty.position = { x: 2, y: 1 };
    casualty.armor = 0;
    survivor.position = { x: 2, y: 4 };
    survivor.woundState = "light";
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(casualty.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 }, moraleRolls: { [survivor.id]: { first: 3, second: 3 } } }));

    expect(state.moraleStateByCombatantId?.[survivor.id]).toBe("shaken");
    expect(state.events.some((event) => event.includes("−1 light wound"))).toBe(true);
  });

  it("switches Action RAM ammunition profiles in Redux", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = { ...state, ammunitionById: { ...state.ammunitionById, [player.id]: 2 } };
    state = reducer(state, selectWeaponAmmunition("heap"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon).toMatchObject({ ammunitionKind: "heap", penetration: 8, woundEscalation: true, collateralBlast: false });
    expect(state.ammunitionById[player.id]).toBe(4);
    expect(state.ammunitionByCombatantAndKind?.[player.id]?.he).toBe(2);
    state = { ...state, ammunitionById: { ...state.ammunitionById, [player.id]: 1 } };
    state = reducer(state, selectWeaponAmmunition("he"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon).toMatchObject({ ammunitionKind: "he", penetration: 3, woundEscalation: true, collateralBlast: true });
    expect(state.ammunitionById[player.id]).toBe(2);
    expect(state.ammunitionByCombatantAndKind?.[player.id]?.heap).toBe(1);
  });

  it("blocks empty alternative ammunition and reloads only the active profile", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = { ...state, ammunitionByCombatantAndKind: { ...state.ammunitionByCombatantAndKind, [player.id]: { ...state.ammunitionByCombatantAndKind?.[player.id], heap: 0 } } };
    state = reducer(state, selectWeaponAmmunition("heap"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon.ammunitionKind).toBe("he");
    state = { ...state, ammunitionById: { ...state.ammunitionById, [player.id]: 0 } };
    state = reducer(state, reloadWeapon());
    expect(state.ammunitionById[player.id]).toBe(4);
    expect(state.ammunitionByCombatantAndKind?.[player.id]).toMatchObject({ he: 4, heap: 0 });
  });

  it("assigns the printed ammunition choices to the correct heavy weapons", () => {
    expect(characterCombatWeapons.actionRam.ammunitionProfiles.map((profile) => profile.kind)).toEqual(["he", "heap", "flechette"]);
    expect(characterCombatWeapons.lightAssaultGun.ammunitionProfiles.map((profile) => profile.kind)).toEqual(["discard-sabot", "he", "flechette"]);
    expect(characterCombatWeapons.actionRam.ammunitionProfiles.find((profile) => profile.kind === "flechette")).toMatchObject({ automatic: true, automaticFireBonusByRange: { effective: 3, long: 1, extreme: 0 } });
  });

  it("enables the printed automatic-fire bonuses only for selected flechette ammunition", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon.automatic).toBe(false);
    state = reducer(state, selectWeaponAmmunition("flechette"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon).toMatchObject({ automatic: true, automaticFireBonusByRange: { effective: 3, long: 1, extreme: 0 } });
    const flechetteBonuses = state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon.automaticFireBonusByRange;
    expect(automaticFireModifierForRange("effective", flechetteBonuses)).toBe(3);
    expect(automaticFireModifierForRange("long", flechetteBonuses)).toBe(1);
    expect(automaticFireModifierForRange("extreme", flechetteBonuses)).toBe(0);
    state = reducer(state, selectWeaponAmmunition("he"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.weapon).toMatchObject({ automatic: false, ammunitionKind: "he" });
  });

  it("raises HE direct-hit wound severity by one level", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    target.armor = 4;
    const he = characterCombatWeapons.actionRam.ammunitionProfiles.find((profile) => profile.kind === "he")!;
    attacker.weapon = { ...structuredClone(characterCombatWeapons.actionRam), ...he, automatic: false };
    expect(resolveSnapShot(attacker, target, { first: 6, second: 6 }, { first: 2, second: 2 }, 0, "aimed")).toMatchObject({ hit: true, woundTotal: 3, woundState: "light" });
  });

  it("records an HE blast area and a direct-only HEAP impact", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    target.position = { x: 2, y: 1 };
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    scenario.combatants.filter((unit) => unit.id !== attacker.id && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 2, second: 2 } }));
    expect(state.lastWeaponImpact).toMatchObject({ ammunitionKind: "he", point: { x: 2, y: 1 } });
    expect(state.lastWeaponImpact?.blastCells.length).toBeGreaterThan(1);
    expect(state.events.some((event) => event.includes("4cm RAM HE impact at 2,1"))).toBe(true);
    state = reducer(state, selectPlayerCombatant(attacker.id));
    expect(state.lastWeaponImpact).toBeNull();

    const heapScenario = buildTrainingScenario();
    heapScenario.walls = [];
    heapScenario.doors = [];
    const heapAttacker = heapScenario.combatants.find((unit) => unit.id === "player-1")!;
    const heapTarget = heapScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    heapAttacker.position = { x: 1, y: 1 };
    heapAttacker.facing = "east";
    heapTarget.position = { x: 2, y: 1 };
    heapAttacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    heapScenario.combatants.filter((unit) => unit.id !== heapAttacker.id && unit.id !== heapTarget.id).forEach((unit) => { unit.defeated = true; });
    state = reducer(undefined, loadCombatScenario(heapScenario));
    state = reducer(state, selectPlayerCombatant(heapAttacker.id));
    state = reducer(state, selectWeaponAmmunition("heap"));
    state = reducer(state, previewAttack(heapTarget.id));
    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 2, second: 2 } }));
    expect(state.lastWeaponImpact).toMatchObject({ ammunitionKind: "heap", blastCells: [{ x: 2, y: 1 }] });
    expect(state.events.some((event) => event.includes("direct penetration; no blast area"))).toBe(true);
  });

  it("uses an expanding forward cone for field of fire", () => {
    const attacker = { position: { x: 5, y: 5 }, facing: "north" as const };

    expect(inFieldOfFire(attacker, { x: 5, y: 4 })).toBe(true);
    expect(inFieldOfFire(attacker, { x: 4, y: 4 })).toBe(true);
    expect(inFieldOfFire(attacker, { x: 3, y: 3 })).toBe(true);
    expect(inFieldOfFire(attacker, { x: 2, y: 3 })).toBe(false);
    expect(inFieldOfFire(attacker, { x: 6, y: 5 })).toBe(false);
    expect(inFieldOfFire(attacker, { x: 5, y: 6 })).toBe(false);
  });

  it("restricts high-energy weapons to braced aimed fire while allowing adjacent aimed targets", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 2, y: 4 };
    attacker.facing = "east";
    attacker.weapon = { ...characterCombatWeapons.plasmaGun };
    target.position = { x: 4, y: 4 };
    scenario.combatants.filter((unit) => unit.id !== attacker.id && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("snap"));
    expect(state.plannedAttackMode).toBeNull();

    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById[attacker.id]).toBe(6);
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.woundState).toBe("healthy");

    state = reducer(state, goProne());
    state = reducer(state, braceWeapon());
    expect(state.actionPointsById[attacker.id]).toBe(3);
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn({ enemyRolls: { [target.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.turn).toBe(2);
    expect(state.bracedCombatantIds).toContain(attacker.id);
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById[attacker.id]).toBe(0);
    expect(state.ammunitionById[attacker.id]).toBe(3);

    const adjacentScenario = buildTrainingScenario();
    const adjacentAttacker = adjacentScenario.combatants.find((unit) => unit.id === "player-1")!;
    const adjacentTarget = adjacentScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    adjacentAttacker.weapon = { ...characterCombatWeapons.plasmaGun };
    adjacentAttacker.position = { x: 5, y: 5 };
    adjacentAttacker.facing = "east";
    adjacentTarget.position = { x: 6, y: 5 };
    expect(rangedEnemies(adjacentScenario, adjacentAttacker.id).some((unit) => unit.id === adjacentTarget.id)).toBe(true);
    let adjacentState = reducer(undefined, loadCombatScenario(adjacentScenario));
    adjacentState = reducer(adjacentState, selectPlayerCombatant(adjacentAttacker.id));
    adjacentState = reducer(adjacentState, previewAttack(adjacentTarget.id));
    adjacentState = reducer(adjacentState, selectAttackMode("aimed"));
    expect(adjacentState.plannedAttackMode).toBe("aimed");
  });

  it("applies AHL fusion collateral at half, quarter, and eighth penetration regardless of visual blockers", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const sameSquare = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const adjacent = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    const outer = { ...adjacent, id: "enemy-outer", name: "Outer Guard", position: { x: 6, y: 4 }, woundState: "healthy" as const, defeated: false, health: 1 };
    scenario.combatants.push(outer);
    attacker.position = { x: 2, y: 4 };
    attacker.facing = "east";
    attacker.posture = "prone";
    attacker.weapon = { ...characterCombatWeapons.fusionGun };
    target.position = { x: 4, y: 4 };
    sameSquare.position = { ...target.position };
    adjacent.position = { x: 5, y: 4 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, bracedCombatantIds: [attacker.id] };
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 2, second: 2 },
      collateralRolls: {
        [sameSquare.id]: { checkDice: { first: 1, second: 1 }, woundDice: { first: 6, second: 6 } },
        [adjacent.id]: { checkDice: { first: 5, second: 5 }, woundDice: { first: 6, second: 6 } },
        [outer.id]: { checkDice: { first: 4, second: 4 }, woundDice: { first: 6, second: 6 } },
      },
    }));
    expect(state.events.some((event) => event.includes(`${sameSquare.name} suffered Fusion Gun collateral`) && event.includes("penetration +7"))).toBe(true);
    expect(state.events.some((event) => event.includes(`${adjacent.name} suffered Fusion Gun collateral`) && event.includes("penetration +3"))).toBe(true);
    expect(state.events.some((event) => event.includes(`${outer.name} suffered Fusion Gun collateral`) && event.includes("penetration +1"))).toBe(true);

    const blockedScenario = buildTrainingScenario();
    blockedScenario.walls = [{ id: "blast-wall", from: { x: 5, y: 3 }, to: { x: 5, y: 6 } }];
    blockedScenario.doors = [];
    blockedScenario.objects = [];
    const blockedAttacker = blockedScenario.combatants.find((unit) => unit.id === "player-1")!;
    const blockedTarget = blockedScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const blockedBystander = blockedScenario.combatants.find((unit) => unit.id === "enemy-2")!;
    blockedAttacker.position = { x: 2, y: 4 };
    blockedAttacker.facing = "east";
    blockedAttacker.posture = "prone";
    blockedAttacker.weapon = { ...characterCombatWeapons.fusionGun };
    blockedTarget.position = { x: 4, y: 4 };
    blockedBystander.position = { x: 5, y: 4 };
    blockedScenario.smokeCells = [{ ...blockedBystander.position }];
    state = reducer(undefined, loadCombatScenario(blockedScenario));
    state = { ...state, bracedCombatantIds: [blockedAttacker.id] };
    state = reducer(state, selectPlayerCombatant(blockedAttacker.id));
    state = reducer(state, previewAttack(blockedTarget.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 2, second: 2 }, collateralRolls: { [blockedBystander.id]: { checkDice: { first: 5, second: 5 }, woundDice: { first: 6, second: 6 } } } }));
    expect(state.events.some((event) => event.includes(`${blockedBystander.name} suffered Fusion Gun collateral`))).toBe(true);
  });

  it("shows the complete AHL two-square collateral footprint including diagonals", () => {
    const scenario = buildTrainingScenario();
    const cells = new Set(collateralBlastCells(scenario, { x: 4, y: 4 }).map(pointKey));
    expect(cells.size).toBe(25);
    expect(cells).toContain(pointKey({ x: 2, y: 2 }));
    expect(cells).toContain(pointKey({ x: 6, y: 6 }));
  });

  it("uses AHL plasma and fusion profiles and lets a braced high-energy shot breach a door", () => {
    expect(characterCombatWeapons.plasmaGun.penetrationByRange).toEqual({ effective: 12, long: 8, extreme: 4 });
    expect(characterCombatWeapons.fusionGun.penetrationByRange).toEqual({ effective: 14, long: 10, extreme: 6 });
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const door = scenario.doors[0];
    attacker.position = { x: 7, y: 3 };
    attacker.posture = "prone";
    attacker.weapon = { ...characterCombatWeapons.fusionGun };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, bracedCombatantIds: [attacker.id] };
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, fireHighEnergyAtStructure({ structureId: door.id, hitDice: { first: 6, second: 6 }, collateralRolls: {} }));
    expect(state.scenario?.doors.find((candidate) => candidate.id === door.id)?.open).toBe(true);
    expect(state.structuralDamageById?.[door.id]).toBe(10);
    expect(state.events.some((event) => event.includes(`${door.id}`) && event.includes("10 structural damage") && event.includes("breached"))).toBe(true);
  });

  it("uses HEAP as concentrated structural penetration without blast collateral", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const door = scenario.doors[0];
    attacker.position = { x: 7, y: 3 };
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, selectWeaponAmmunition("heap"));
    state = reducer(state, fireHighEnergyAtStructure({ structureId: door.id, hitDice: { first: 6, second: 6 }, collateralRolls: Object.fromEntries(scenario.combatants.map((unit) => [unit.id, { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }])) }));
    expect(state.structuralDamageById?.[door.id]).toBe(4);
    expect(state.lastWeaponImpact).toMatchObject({ ammunitionKind: "heap", blastCells: [{ x: 8, y: 3 }] });
    expect(state.events.some((event) => event.includes("concentrated penetration"))).toBe(true);
    expect(state.events.some((event) => event.includes("structural-impact collateral"))).toBe(false);
  });

  it("uses HE blast against structures with low structural damage and a blast area", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const door = scenario.doors[0];
    attacker.position = { x: 7, y: 3 };
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, fireHighEnergyAtStructure({ structureId: door.id, hitDice: { first: 6, second: 6 }, collateralRolls: {} }));
    expect(state.structuralDamageById?.[door.id]).toBe(1);
    expect(state.lastWeaponImpact?.ammunitionKind).toBe("he");
    expect(state.lastWeaponImpact?.blastCells.length).toBeGreaterThan(1);
    expect(state.events.some((event) => event.includes(" · blast"))).toBe(true);
  });

  it("records and reports a missed RAM structural shot", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const door = scenario.doors[0];
    attacker.position = { x: 7, y: 3 };
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    const startingAmmunition = state.ammunitionById[attacker.id];
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, fireHighEnergyAtStructure({ structureId: door.id, hitDice: { first: 1, second: 1 }, collateralRolls: {} }));
    expect(state.lastWeaponImpact).toMatchObject({ ammunitionKind: "he", hit: false, blastCells: [{ x: 8, y: 3 }] });
    expect(state.structuralDamageById?.[door.id]).toBeUndefined();
    expect(state.actionPointsById[attacker.id]).toBe(0);
    expect(state.ammunitionById[attacker.id]).toBe(startingAmmunition - 1);
    expect(state.events[0]).toContain("MISS");
    expect(state.events[0]).toContain("1 ammunition spent");
  });

  it("selects walls and cover through the structural targeting state", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    const wall = scenario.walls[0];
    const cover = scenario.objects.find((object) => object.kind === "cover")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginStructuralTargeting());
    expect(state.structuralTargeting).toBe(true);
    state = reducer(state, previewStructuralTarget(wall.id));
    expect(state.plannedStructuralTargetId).toBe(wall.id);
    state = reducer(state, previewStructuralTarget(cover.id));
    expect(state.plannedStructuralTargetId).toBe(cover.id);
    state = reducer(state, cancelStructuralTargeting());
    expect(state.structuralTargeting).toBe(false);
    expect(state.plannedStructuralTargetId).toBeNull();
  });

  it("destroys cover with a successful HEAP structural attack", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const cover = scenario.objects.find((object) => object.kind === "cover")!;
    attacker.position = { x: cover.position.x - 1, y: cover.position.y };
    attacker.weapon = structuredClone(characterCombatWeapons.actionRam);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, selectWeaponAmmunition("heap"));
    state = reducer(state, fireHighEnergyAtStructure({ structureId: cover.id, hitDice: { first: 6, second: 6 }, collateralRolls: {} }));
    expect(state.structuralDamageById?.[cover.id]).toBe(4);
    expect(state.scenario?.objects.some((object) => object.id === cover.id)).toBe(false);
    expect(state.events.some((event) => event.includes(cover.id) && event.includes("breached"))).toBe(true);
  });

  it("applies structural corner cover only from the protected approach", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.walls = [{ id: "corner-wall", from: { x: 5, y: 5 }, to: { x: 8, y: 5 } }];
    scenario.doors = [];
    scenario.objects = [];
    target.position = { x: 5, y: 5 };
    attacker.position = { x: 2, y: 4 };

    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "corner-cover" });

    attacker.position = { x: 2, y: 6 };
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 0, source: null });
  });

  it("treats an open doorway jamb as directional corner cover", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.walls = [];
    scenario.doors = [{ id: "open-doorway", from: { x: 5, y: 5 }, to: { x: 8, y: 5 }, open: true }];
    scenario.objects = [];
    target.position = { x: 5, y: 5 };
    attacker.position = { x: 2, y: 4 };

    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "corner-cover" });
  });

  it("assigns shared-square corner cover only to the stable first character", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const claimant = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.walls = [{ id: "corner-wall", from: { x: 5, y: 5 }, to: { x: 8, y: 5 } }];
    scenario.doors = [];
    scenario.objects = [];
    attacker.position = { x: 2, y: 4 };
    claimant.position = { x: 5, y: 5 };
    target.position = { x: 5, y: 5 };

    expect(coverProtection(scenario, attacker.id, target.id)).toBe(0);
    claimant.defeated = true;
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(2);
  });

  it("recognizes diagonal low cover, consoles, and close-machinery fire limits", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.walls = [];
    scenario.doors = [];
    attacker.position = { x: 3, y: 3 };
    target.position = { x: 5, y: 5 };
    scenario.objects = [{ id: "diagonal-crate", kind: "cover", position: { x: 4, y: 4 }, label: "Crate", coverType: "low-cover" }];
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "low-cover" });

    scenario.objects = [{ id: "console", kind: "console", position: { x: 4, y: 4 }, label: "Console" }];
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "console" });

    attacker.position = { x: 2, y: 4 };
    target.position = { x: 8, y: 4 };
    scenario.objects = [{ id: "machinery", kind: "cover", position: { x: 5, y: 4 }, label: "Drive Machinery", coverType: "close-machinery" }];
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(false);
    target.position = { x: 6, y: 4 };
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "close-machinery" });
  });

  it("uses cover instead of stacking the evasion modifier", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    const coveredAndEvading = resolveSnapShot(attacker, target, { first: 6, second: 6 }, { first: 1, second: 1 }, 2, "aimed", true)!;
    expect(coveredAndEvading).toMatchObject({ cover: 2, evadeModifier: 0 });
  });

  it("makes an enemy spend AP turning before firing outside its field of fire", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 7, y: 5 };
    enemy.position = { x: 5, y: 5 };
    enemy.facing = "west";
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.facing).toBe("east");
    expect(state.events.some((event) => event.includes(`${enemy.name} turned from west to east (2 AP)`))).toBe(true);
    expect(state.events.some((event) => event.includes(`${enemy.name} aimed fired at ${player.name}`))).toBe(true);
  });

  it("defaults existing scenarios to illuminated visibility", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.fireCells = [];
    scenario.smokeCells = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 4 };
    target.position = { x: 4, y: 4 };
    expect(lightingLevelAt(scenario, target.position)).toBe("illuminated");
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, modifier: 0, level: "illuminated" });
  });

  it("blocks normal vision in darkness while enhanced vision has limited penalized range", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.defaultLighting = "dark";
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 4 };
    target.position = { x: 5, y: 4 };
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: false, reason: "dark" });
    expect(rangedEnemies(scenario, attacker.id).map((unit) => unit.id)).not.toContain(target.id);
    attacker.weapon = { ...characterCombatWeapons.plasmaGun };
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, modifier: -2, reason: "enhanced" });
    target.position = { x: 8, y: 4 };
    expect(visibilityAssessment(scenario, attacker, target).visible).toBe(false);
  });

  it("uses a forward lamp cone in darkness and reveals a lit lamp user", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.defaultLighting = "dark";
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 4, y: 4 };
    attacker.facing = "east";
    attacker.hasLamp = true;
    attacker.lampOn = true;
    target.position = { x: 8, y: 4 };
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, modifier: 0, reason: "lamp" });
    target.position = { x: 2, y: 4 };
    expect(visibilityAssessment(scenario, attacker, target).visible).toBe(false);
    target.lampOn = true;
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, reason: "lamp-revealed" });
  });

  it("lets a normal-vision enemy activate its lamp when darkness hides every target", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.smokeCells = [];
    scenario.combatants.forEach((unit) => {
      if (unit.id === "player-1") unit.position = { x: 9, y: 3 };
      else if (unit.id === "enemy-1") { unit.position = { x: 12, y: 3 }; unit.facing = "west"; }
      else unit.defeated = true;
    });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    const lampEnemy = state.scenario!.combatants.find((unit) => unit.id === "enemy-1")!;
    const player = state.scenario!.combatants.find((unit) => unit.id === "player-1")!;
    expect(lampEnemy.lampOn).toBe(true);
    expect(state.events.some((event) => event.includes("switched lamp on"))).toBe(true);
    expect(state.soundContacts).toEqual([expect.objectContaining({ sourceEnemyId: lampEnemy.id, kind: "equipment", point: { x: 13, y: 4 } })]);
    expect(state.soundContacts?.[0].point).not.toEqual(lampEnemy.position);
    expect(visibilityAssessment(state.scenario!, player, lampEnemy)).toMatchObject({ visible: true, reason: "lamp-revealed" });
  });

  it("stores visible enemies and preserves their last-known position after sight is lost", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.smokeCells = [];
    const observer = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    observer.position = { x: 9, y: 3 };
    observer.facing = "east";
    observer.lampOn = true;
    enemy.position = { x: 11, y: 3 };
    enemy.lampOn = false;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(observer.id));
    state = reducer(state, refreshEnemyObservations());
    expect(state.observedEnemyIds).toContain(enemy.id);
    expect(state.lastKnownEnemyPositions?.[enemy.id]).toEqual({ x: 11, y: 3 });
    state = reducer(state, toggleLamp());
    state = reducer(state, refreshEnemyObservations());
    expect(state.observedEnemyIds).not.toContain(enemy.id);
    expect(state.lastKnownEnemyPositions?.[enemy.id]).toEqual({ x: 11, y: 3 });
  });

  it("shares team observations without granting the selected character a firing solution", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.smokeCells = [];
    const normal = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enhanced = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    normal.position = { x: 2, y: 2 };
    normal.lampOn = false;
    enhanced.position = { x: 9, y: 3 };
    enemy.position = { x: 12, y: 3 };
    enemy.lampOn = false;
    enemy.concealed = false;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(normal.id));
    state = reducer(state, refreshEnemyObservations());
    expect(state.observedEnemyIds).toContain(enemy.id);
    expect(state.observersByEnemyId?.[enemy.id]).toEqual([enhanced.id]);
    expect(rangedEnemies(state.scenario!, normal.id).map((unit) => unit.id)).not.toContain(enemy.id);
    expect(rangedEnemies(state.scenario!, enhanced.id).map((unit) => unit.id)).toContain(enemy.id);
  });

  it("spends 3 AP to search for and reveal a concealed enemy", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.smokeCells = [];
    const searcher = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    searcher.position = { x: 9, y: 3 };
    enemy.position = { x: 14, y: 3 };
    enemy.concealed = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(searcher.id));
    state = reducer(state, refreshEnemyObservations());
    expect(state.observedEnemyIds).not.toContain(enemy.id);
    state = reducer(state, searchForEnemies());
    state = reducer(state, refreshEnemyObservations());
    expect(state.actionPointsById[searcher.id]).toBe(3);
    expect(state.scenario!.combatants.find((unit) => unit.id === enemy.id)?.concealed).toBe(false);
    expect(state.observedEnemyIds).toContain(enemy.id);
    expect(state.events.some((event) => event.includes("searched") && event.includes("detected"))).toBe(true);
  });

  it("doubles cautious movement cost and suppresses player movement noise", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 1, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, toggleCautiousMovement());
    state = reducer(state, previewMove({ x: 2, y: 4 }));
    expect(state.plannedMove?.cost).toBe(4);
    state = reducer(state, confirmMove());
    expect(state.actionPointsById[player.id]).toBe(2);
    expect(state.playerNoiseContacts ?? []).toEqual([]);

    state = reducer(undefined, loadCombatScenario(buildBlackoutScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 2, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.playerNoiseContacts).toEqual([expect.objectContaining({ sourcePlayerId: "player-1", point: { x: 1, y: 4 } })]);
  });

  it("moves a concealed enemy toward an approximate audible movement sector", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.fireCells = [];
    scenario.smokeCells = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 9, y: 4 };
    enemy.position = { x: 13, y: 4 };
    enemy.concealed = true;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 10, y: 4 }));
    state = reducer(state, confirmMove());
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    const movedEnemy = state.scenario!.combatants.find((unit) => unit.id === enemy.id)!;
    expect(movedEnemy.position).toEqual({ x: 12, y: 4 });
    expect(state.investigationTargetByEnemyId?.[enemy.id]).toEqual({ x: 10, y: 4 });
  });

  it("clears blackout intelligence state when switching to Boarding Action", () => {
    let state = reducer(undefined, loadCombatScenario(buildBlackoutScenario()));
    state = {
      ...state,
      grenadeKind: "flare",
      flareClearsAtTurnByCell: { "4:4": 3 },
      observedEnemyIds: ["enemy-1"],
      lastKnownEnemyPositions: { "enemy-1": { x: 9, y: 4 } },
      observersByEnemyId: { "enemy-1": ["player-1"] },
      soundContacts: [{ id: "sound:enemy-1:1", sourceEnemyId: "enemy-1", point: { x: 10, y: 4 }, kind: "movement", expiresAtTurn: 3 }],
      playerNoiseContacts: [{ sourcePlayerId: "player-1", point: { x: 1, y: 4 }, expiresAtTurn: 2 }],
      cautiousMovementCombatantIds: ["player-1"],
      investigationTargetByEnemyId: { "enemy-1": { x: 1, y: 4 } },
    };
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.scenario?.id).toBe("boarding-action");
    expect(state.grenadeKind).toBeNull();
    expect(state.flareClearsAtTurnByCell).toEqual({});
    expect(state.observedEnemyIds).toEqual([]);
    expect(state.lastKnownEnemyPositions).toEqual({});
    expect(state.observersByEnemyId).toEqual({});
    expect(state.soundContacts).toEqual([]);
    expect(state.playerNoiseContacts).toEqual([]);
    expect(state.cautiousMovementCombatantIds).toEqual([]);
    expect(state.investigationTargetByEnemyId).toEqual({});
  });

  it("reserves a closed doorway as a one-shot overwatch lane", () => {
    const scenario = buildBlackoutScenario();
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, coverDoor("engineering-access"));
    expect(state.coveredDoorByCombatantId).toEqual({ "player-1": "engineering-access" });
    expect(state.overwatchLanes).toEqual([expect.objectContaining({ attackerId: "player-1", cells: [{ x: 4, y: 3 }] })]);
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
  });

  it("provides a valid two-route doorway reaction drill", () => {
    const scenario = buildDoorReactionScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    expect(scenario).toMatchObject({ id: "door-reaction-drill", width: 12, height: 8 });
    expect(scenario.doors.map((door) => door.id)).toEqual(["upper-security-door", "lower-security-door"]);
    expect(scenario.doors.every((door) => !door.open)).toBe(true);
    expect(scenario.combatants.filter((unit) => unit.side === "player")).toHaveLength(2);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(3);
  });

  it("routes around a visible covered door when the alternate door remains available", () => {
    const scenario = buildDoorReactionScenario();
    const tactical = scenarioAvoidingVisibleCoveredDoors(scenario, new Set(["upper-security-door"]));
    const route = routeAllowingClosedDoors(tactical, "enemy-1", [{ x: 4, y: 2 }]);
    expect(route?.door?.id).toBe("lower-security-door");
    expect(tactical.walls.some((wall) => wall.id === "avoided:upper-security-door")).toBe(true);
    expect(tactical.doors.some((door) => door.id === "upper-security-door")).toBe(false);
  });

  it("clears covered-door state and its lane when the covering character moves", () => {
    const scenario = buildBlackoutScenario();
    scenario.walls = [];
    scenario.doors = [{ id: "engineering-access", from: { x: 4, y: 3 }, to: { x: 4, y: 4 }, open: false }];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, coverDoor("engineering-access"));
    state = { ...state, actionPointsById: { ...state.actionPointsById, "player-1": 6 }, actedCombatantIds: [] };
    state = reducer(state, previewMove({ x: 2, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.coveredDoorByCombatantId).toEqual({});
    expect(state.overwatchLanes).toEqual([]);
    expect(state.events.some((event) => event.includes("stopped covering engineering-access: character moved"))).toBe(true);
  });

  it("expires unused covered-door state when the next activation begins", () => {
    let state = reducer(undefined, loadCombatScenario(buildBlackoutScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, coverDoor("engineering-access"));
    state = { ...state, actionPointsById: { ...state.actionPointsById, "player-1": 6 }, actedCombatantIds: [] };
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.coveredDoorByCombatantId).toEqual({});
    expect(state.overwatchLanes).toEqual([]);
  });

  it("manually cancels door coverage without refunding AP or consuming ammunition", () => {
    let state = reducer(undefined, loadCombatScenario(buildBlackoutScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    const ammunition = state.ammunitionById["player-1"];
    state = reducer(state, coverDoor("engineering-access"));
    state = reducer(state, cancelDoorCoverage("player-1"));
    expect(state.coveredDoorByCombatantId).toEqual({});
    expect(state.overwatchLanes).toEqual([]);
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.ammunitionById["player-1"]).toBe(ammunition);
    expect(state.events[0]).toContain("manually canceled");
  });

  it("selects and confirms either doorway independently", () => {
    let state = reducer(undefined, loadCombatScenario(buildDoorReactionScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, beginDoorCoverage());
    state = reducer(state, previewDoorCoverage("lower-security-door"));
    expect(state.plannedCoveredDoorId).toBe("lower-security-door");
    state = reducer(state, confirmDoorCoverage());
    expect(state.coveredDoorByCombatantId).toEqual({ "player-1": "lower-security-door" });

    state = reducer(undefined, loadCombatScenario(buildDoorReactionScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, beginDoorCoverage());
    state = reducer(state, previewDoorCoverage("upper-security-door"));
    state = reducer(state, confirmDoorCoverage());
    expect(state.coveredDoorByCombatantId).toEqual({ "player-1": "upper-security-door" });
  });

  it("resolves a breacher's forced entry before clearing covered-door reaction state", () => {
    const scenario = buildDoorReactionScenario();
    const breacher = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    breacher.position = { x: 6, y: 2 };
    scenario.combatants.filter((unit) => unit.id !== "player-1" && unit.id !== breacher.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, coverDoor("upper-security-door"));
    state = reducer(state, endPlayerTurn({ enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } }));
    expect(state.scenario!.doors.find((door) => door.id === "upper-security-door")?.open).toBe(true);
    expect(state.scenario!.combatants.find((unit) => unit.id === "enemy-1")?.breachingCharges).toBe(0);
    expect(state.coveredDoorByCombatantId).toEqual({});
    expect(state.overwatchLanes).toEqual([]);
    expect(state.events.some((event) => event.includes("forcibly breached covered upper-security-door"))).toBe(true);
  });

  it("readies a weapon for +1 and clears readiness when the character moves", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 3 };
    target.position = { x: 3, y: 3 };
    const normal = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 });
    const ready = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "snap", false, false, false, 0, true);
    expect(ready!.hitTotal).toBe(normal!.hitTotal + 1);
    expect(ready!.readyModifier).toBe(1);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, readyWeapon());
    expect(state.weaponReadyCombatantIds).toContain(attacker.id);
    expect(state.actionPointsById[attacker.id]).toBe(4);
    state = reducer(state, previewMove({ x: 2, y: 3 }));
    state = reducer(state, confirmMove());
    expect(state.weaponReadyCombatantIds).not.toContain(attacker.id);
  });

  it("advances up to two squares for 4 AP and ends weapon ready", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    attacker.position = { x: 1, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, toggleAdvanceReady());
    state = reducer(state, previewMove({ x: 3, y: 3 }));
    expect(state.plannedMove?.cost).toBe(4);
    state = reducer(state, confirmMove());
    expect(state.scenario!.combatants.find((unit) => unit.id === attacker.id)?.position).toEqual({ x: 3, y: 3 });
    expect(state.actionPointsById[attacker.id]).toBe(2);
    expect(state.weaponReadyCombatantIds).toContain(attacker.id);
    expect(state.advanceReadyCombatantIds).not.toContain(attacker.id);
  });

  it("aims at a selected target for 2 AP, adds +1, and clears after firing", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 3 };
    target.position = { x: 3, y: 3 };
    const normal = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 });
    const aimed = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "snap", false, false, false, 0, false, true);
    expect(aimed!.hitTotal).toBe(normal!.hitTotal + 1);
    expect(aimed!.aimModifier).toBe(1);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, aimAtPlannedTarget());
    expect(state.actionPointsById[attacker.id]).toBe(4);
    expect(state.aimedTargetByCombatantId?.[attacker.id]).toBe(target.id);
    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.aimedTargetByCombatantId?.[attacker.id]).toBeUndefined();
  });

  it("applies a weapon called shot on a successful aimed hit", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 3 };
    target.position = { x: 3, y: 3 };
    scenario.combatants.filter((unit) => unit.id !== attacker.id && unit.id !== target.id).forEach((unit, index) => { unit.position = { x: 1 + index, y: 6 }; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, aimAtPlannedTarget());
    state = reducer(state, selectCalledShot("weapon"));
    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 1, second: 1 } }));
    expect(state.weaponDamagedCombatantIds).toContain(target.id);
    expect(state.calledShotByCombatantId?.[attacker.id]).toBeUndefined();
  });

  it("applies emergency-light penalties, enhanced-vision immunity, and smoke precedence", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 4 };
    target.position = { x: 4, y: 4 };
    scenario.lightingByCell = { [pointKey(target.position)]: "emergency" };
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, modifier: -2 });
    attacker.visionMode = "enhanced";
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: true, modifier: 0 });
    scenario.smokeCells = [{ x: 3, y: 4 }];
    attacker.hasLamp = true;
    attacker.lampOn = true;
    expect(visibilityAssessment(scenario, attacker, target)).toMatchObject({ visible: false, reason: "blocked" });
  });

  it("applies the shared emergency-light modifier during Redux attack resolution", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 4 };
    target.position = { x: 4, y: 4 };
    scenario.lightingByCell = { [pointKey(target.position)]: "emergency" };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 1, second: 1 } }));
    expect(state.events.some((event) => event.includes("hit 11/8"))).toBe(true);
  });

  it("classifies front, side, and rear exposure relative to every target facing", () => {
    const targetPosition = { x: 5, y: 5 };
    const cases = [
      { facing: "north" as const, front: { x: 5, y: 2 }, side: { x: 8, y: 5 }, rear: { x: 5, y: 8 } },
      { facing: "east" as const, front: { x: 8, y: 5 }, side: { x: 5, y: 8 }, rear: { x: 2, y: 5 } },
      { facing: "south" as const, front: { x: 5, y: 8 }, side: { x: 2, y: 5 }, rear: { x: 5, y: 2 } },
      { facing: "west" as const, front: { x: 2, y: 5 }, side: { x: 5, y: 2 }, rear: { x: 8, y: 5 } },
    ];

    cases.forEach(({ facing, front, side, rear }) => {
      const target = { position: targetPosition, facing };
      expect(attackArcAgainstTarget({ position: front }, target)).toBe("front");
      expect(attackArcAgainstTarget({ position: side }, target)).toBe("side");
      expect(attackArcAgainstTarget({ position: rear }, target)).toBe("rear");
    });
  });

  it.skip("applies front, side, and rear modifiers exactly once to ranged and melee attacks", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    target.position = { x: 5, y: 5 };
    target.facing = "north";
    const rangedTotals = [
      { position: { x: 5, y: 3 }, arc: "front", modifier: 0 },
      { position: { x: 7, y: 5 }, arc: "side", modifier: 1 },
      { position: { x: 5, y: 7 }, arc: "rear", modifier: 2 },
    ].map(({ position, arc, modifier }) => {
      attacker.position = position;
      const result = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed")!;
      expect(result).toMatchObject({ attackArc: arc, arcModifier: modifier });
      return result.hitTotal;
    });
    expect(rangedTotals).toEqual([9, 10, 11]);

    attacker.position = { x: 5, y: 4 };
    const frontMelee = resolveMelee(attacker, target, 3);
    attacker.position = { x: 4, y: 5 };
    const sideMelee = resolveMelee(attacker, target, 3);
    attacker.position = { x: 5, y: 6 };
    const rearMelee = resolveMelee(attacker, target, 3);
    expect([frontMelee.arcModifier, sideMelee.arcModifier, rearMelee.arcModifier]).toEqual([0, 1, 2]);
    expect([frontMelee.total, sideMelee.total, rearMelee.total]).toEqual([4, 5, 6]);
  });

  it.skip("offers unarmed, blade, and rifle-strike melee techniques with distinct costs and modifiers", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    const unarmed = resolveMelee(attacker, target, 3, false, 1, 0);
    const blade = resolveMelee(attacker, target, 3);
    const rifle = resolveMelee(attacker, target, 3, false, -1, attacker.meleeWeapon.penetration + 2);
    expect(unarmed.techniqueHitModifier).toBe(1);
    expect(blade.techniquePenetration).toBe(attacker.meleeWeapon.penetration);
    expect(rifle.techniquePenetration).toBe(attacker.meleeWeapon.penetration + 2);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, selectMeleeMode("unarmed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.actionPointsById[attacker.id]).toBe(4);
    expect(state.events[0]).toContain("used unarmed");
  });

  it("subdues without wounds, stunning on 5+ and failing below 5", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, previewSubdue(target.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 5, second: 1 }, woundDice: { first: 6, second: 6 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "healthy", defeated: false, stunnedUntilTurn: 2 });
    expect(state.actionPointsById[attacker.id]).toBe(3);

    const failedScenario = buildTrainingScenario();
    failedScenario.walls = [];
    failedScenario.doors = [];
    failedScenario.combatants.find((unit) => unit.id === attacker.id)!.position = { x: 1, y: 1 };
    failedScenario.combatants.find((unit) => unit.id === target.id)!.position = { x: 2, y: 1 };
    state = reducer(undefined, loadCombatScenario(failedScenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, previewSubdue(target.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 3, second: 1 }, woundDice: { first: 6, second: 6 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === target.id)?.stunnedUntilTurn).toBeUndefined();
    expect(state.events[0]).toContain("failed to subdue");
  });

  it("keeps adjacent concealed enemies selectable for melee and subdual when they cannot be shot", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    target.concealed = true;
    expect(rangedEnemies(scenario, attacker.id)).not.toContainEqual(expect.objectContaining({ id: target.id }));
    expect(adjacentEnemies(scenario, attacker.id)).toContainEqual(expect.objectContaining({ id: target.id }));
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    expect(state.plannedAttackTargetId).toBe(target.id);
    expect(state.plannedAttackMode).toBe("melee");
    state = reducer(state, previewSubdue(target.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 5, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === target.id)?.stunnedUntilTurn).toBe(2);
  });

  it("keeps a stationary suppressed and panicked guard available to two adjacent melee attackers across turns", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const first = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const second = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const guard = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    first.position = { x: 1, y: 2 };
    first.facing = "east";
    guard.position = { x: 2, y: 2 };
    second.position = { x: 2, y: 3 };
    second.facing = "north";
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, turn: 3, suppressedCombatantIds: [guard.id], moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [guard.id]: "panicked" }, actionPointsById: { ...state.actionPointsById, [first.id]: 6, [second.id]: 6 }, actedCombatantIds: [] };
    expect(adjacentEnemies(state.scenario!, first.id).map((unit) => unit.id)).toContain(guard.id);
    expect(adjacentEnemies(state.scenario!, second.id).map((unit) => unit.id)).toContain(guard.id);
    state = reducer(state, selectPlayerCombatant(first.id));
    state = reducer(state, previewMeleeAttack(guard.id));
    expect(state.plannedAttackTargetId).toBe(guard.id);
    expect(state.plannedAttackMode).toBe("melee");
    state = reducer(state, previewSubdue(guard.id));
    expect(state.plannedMeleeMode).toBe("subdue");
    state = reducer(state, cancelAttackPreview());
    state = reducer(state, selectPlayerCombatant(second.id));
    state = reducer(state, previewAttack(guard.id));
    expect(state.plannedAttackTargetId).toBe(guard.id);
  });

  it("directly subdues and then restrains an adjacent suppressed panicked crew member", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const first = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const second = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const crew = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    first.position = { x: 1, y: 2 };
    crew.position = { x: 2, y: 2 };
    second.position = { x: 2, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, turn: 3, suppressedCombatantIds: [crew.id], moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [crew.id]: "panicked" } };
    state = reducer(state, selectPlayerCombatant(first.id));
    state = reducer(state, previewSubdue(crew.id));
    expect(state).toMatchObject({ plannedAttackTargetId: crew.id, plannedAttackMode: "melee", plannedMeleeMode: "subdue" });
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === crew.id)?.stunnedUntilTurn).toBe(4);
    state = reducer(state, selectPlayerCombatant(second.id));
    state = reducer(state, restrainEnemy(crew.id));
    expect(state.scenario!.combatants.find((unit) => unit.id === crew.id)).toMatchObject({ surrendered: true, defeated: true });
  });

  it("never resolves Subdue as suppressive fire when stale ranged mode remains", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    target.position = { x: 2, y: 1 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    const startingAmmo = state.ammunitionById[attacker.id];
    state = { ...state, selectedCombatantId: attacker.id, plannedAttackTargetId: target.id, plannedAttackMode: "suppressive", plannedMeleeMode: "subdue", events: [`${attacker.name} suppressive fired at ${target.name}: earlier event`] };
    state = reducer(state, confirmAttack({ hitDice: { first: 5, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.ammunitionById[attacker.id]).toBe(startingAmmo);
    expect(state.scenario!.combatants.find((unit) => unit.id === target.id)?.stunnedUntilTurn).toBe(2);
    expect(state.events[0]).toContain("subdued");
    expect(state.events[0]).not.toContain("suppressive fired");
  });

  it.skip("lets melee defense stop subdual and strongly subdues into restraint with morale pressure", () => {
    const defendedScenario = buildTrainingScenario();
    defendedScenario.walls = [];
    defendedScenario.doors = [];
    const defender = defendedScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    defendedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
    defender.position = { x: 2, y: 1 };
    let state = reducer(undefined, loadCombatScenario(defendedScenario));
    state = { ...state, parryingCombatantIds: [defender.id] };
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(defender.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, selectMeleeMode("subdue"));
    state = reducer(state, confirmAttack({ hitDice: { first: 5, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === defender.id)?.stunnedUntilTurn).toBeUndefined();
    expect(state.parryingCombatantIds).not.toContain(defender.id);

    const strongScenario = buildTrainingScenario();
    strongScenario.walls = [];
    strongScenario.doors = [];
    const strongAttacker = strongScenario.combatants.find((unit) => unit.id === "player-1")!;
    const strongTarget = strongScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const witness = strongScenario.combatants.find((unit) => unit.id === "enemy-2")!;
    strongAttacker.position = { x: 1, y: 1 };
    strongAttacker.meleeRating = 4;
    strongTarget.position = { x: 2, y: 1 };
    strongTarget.meleeRating = 0;
    strongTarget.armor = 0;
    witness.position = { x: 3, y: 1 };
    state = reducer(undefined, loadCombatScenario(strongScenario));
    state = reducer(state, selectPlayerCombatant(strongAttacker.id));
    state = reducer(state, previewAttack(strongTarget.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, selectMeleeMode("subdue"));
    state = reducer(state, confirmAttack({ hitDice: { first: 3, second: 1 }, woundDice: { first: 1, second: 1 }, moraleRolls: { [witness.id]: { first: 1, second: 1 } } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === strongTarget.id)).toMatchObject({ surrendered: true, defeated: true, woundState: "healthy" });
    expect(state.moraleStateByCombatantId?.[witness.id]).toBe("shaken");
  });

  it("spends 3 AP to evade ranged fire, leaves melee unchanged, and expires after the enemy phase", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const normalShot = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed")!;
    const evadingShot = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed", true)!;
    expect(evadingShot).toMatchObject({ evadeModifier: -1, hitTotal: normalShot.hitTotal - 1 });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, evade());
    expect(state.evadingCombatantIds).toEqual(["player-1"]);
    expect(state.actionPointsById["player-1"]).toBe(3);
    state = reducer(state, evade());
    expect(state.actionPointsById["player-1"]).toBe(3);
    state = reducer(state, finishActivation());
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.evadingCombatantIds).toEqual([]);
  });

  it.skip("applies prone melee penalties and vulnerabilities without changing standing combat", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 8, y: 3 };
    target.position = { x: 9, y: 3 };
    const standing = resolveMelee(attacker, target, 4);
    attacker.posture = "prone";
    const proneAttacker = resolveMelee(attacker, target, 4);
    attacker.posture = "standing";
    target.posture = "prone";
    const proneTarget = resolveMelee(attacker, target, 4);
    attacker.posture = "prone";
    const bothProne = resolveMelee(attacker, target, 4);

    expect(standing.postureModifier).toBe(0);
    expect(proneAttacker).toMatchObject({ postureModifier: -2, total: standing.total - 2 });
    expect(proneTarget).toMatchObject({ postureModifier: 2, total: standing.total + 2 });
    expect(bothProne).toMatchObject({ postureModifier: 0, total: standing.total });
  });

  it("commits a fresh activation to a six-square trot and blocks attacks until the next turn", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 4 };
    const longMove = [...reachableMovement(scenario, "player-1", 6, true).values()].find((move) => move.cost > 4);
    expect(longMove?.cost).toBeGreaterThan(4);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).toEqual(["player-1"]);
    state = reducer(state, previewAttack("enemy-1"));
    expect(state.plannedAttackTargetId).toBeNull();
    state = reducer(state, beginGrenadeTargeting());
    expect(state.grenadeTargeting).toBe(false);
    state = reducer(state, previewMove(longMove!.destination));
    expect(state.plannedMove?.cost).toBe(longMove!.cost);
    state = reducer(state, confirmMove());
    expect(state.actionPointsById["player-1"]).toBe(6 - longMove!.cost);
    state = reducer(state, finishActivation());
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.trottingCombatantIds).toEqual([]);
  });

  it("does not allow trot after AP has already been spent", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, turnCombatant("left"));
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).toEqual([]);
    expect(state.actionPointsById["player-1"]).toBe(5);
  });

  it("allows a character adjacent to an enemy to begin trotting", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 4, y: 4 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 5, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));

    state = reducer(state, startTrot());

    expect(state.trottingCombatantIds).toContain("player-1");
    expect(state.actionPointsById["player-1"]).toBe(6);
  });

  it("pays 2 AP per 90-degree turn while trotting around an obstacle", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [{ id: "trot-blocker", kind: "cover", position: { x: 3, y: 4 }, label: "Trot Blocker" }];
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    expect(reachableMovement(scenario, player.id, 6, true).get(pointKey({ x: 4, y: 3 }))).toBeUndefined();
    const move = reachableMovement(scenario, player.id, 7, true).get(pointKey({ x: 4, y: 3 }));
    expect(move).toMatchObject({ destination: { x: 4, y: 3 }, cost: 7, finalFacing: "east" });
    expect(move?.costBreakdown).toContain("turn 2");
  });

  it("turns a selected character in 90-degree steps for 1 AP", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.facing).toBe("east");

    state = reducer(state, turnCombatant("left"));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.facing).toBe("north");
    expect(state.actionPointsById["player-1"]).toBe(5);

    state = reducer(state, turnCombatant("right"));
    state = reducer(state, turnCombatant("right"));
    state = reducer(state, turnCombatant("right"));
    state = reducer(state, turnCombatant("right"));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.facing).toBe("north");
    expect(state.actionPointsById["player-1"]).toBe(1);

    state = reducer(state, turnCombatant("left"));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.facing).toBe("west");
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");

    state = reducer(state, turnCombatant("right"));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.facing).toBe("west");
    expect(state.actionPointsById["player-1"]).toBe(0);
  });
  it("defines recognizable rooms, corridor features, objective, cover, and both sides", () => {
    const scenario = buildTrainingScenario();
    expect(scenario.walls.length).toBeGreaterThanOrEqual(10);
    expect(scenario.doors).toHaveLength(1);
    expect(scenario.objects.some((object) => object.kind === "console")).toBe(true);
    expect(scenario.objects.filter((object) => object.kind === "cover")).toHaveLength(2);
    expect(scenario.combatants.filter((unit) => unit.side === "player")).toHaveLength(2);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(2);
  });

  it("stores the authoritative scenario in Redux", () => {
    const scenario = buildTrainingScenario();
    const state = reducer(undefined, loadCombatScenario(scenario));
    expect(state.scenario).toEqual(scenario);
    expect(state.combatantStarts["player-1"]).toMatchObject({ name: "Boarding Lead", woundState: "healthy", grenades: 1, medkits: 1 });
    expect(state.outcome).toBeNull();
  });

  it("clears suppression when a scenario reloads or returns to selection", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = { ...state, suppressedCombatantIds: ["player-1", "enemy-1"] };
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.suppressedCombatantIds).toEqual([]);
    state = { ...state, suppressedCombatantIds: ["player-2"] };
    state = reducer(state, clearCombatScenario());
    expect(state.suppressedCombatantIds).toEqual([]);
    expect(state.scenario).toBeNull();
  });

  it("switches presentation modes without changing authoritative combat state", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    const scenarioBefore = state.scenario;
    const moveBefore = state.plannedMove;
    state = reducer(state, setViewMode("3d"));
    expect(state.viewMode).toBe("3d");
    expect(state.scenario).toEqual(scenarioBefore);
    expect(state.selectedCombatantId).toBe("player-1");
    expect(state.plannedMove).toEqual(moveBefore);
    state = reducer(state, setViewMode("2d"));
    expect(state.viewMode).toBe("2d");
  });

  it("defaults to 3D and preserves an explicit view choice across scenario loads", () => {
    let state = reducer(undefined, { type: "characterCombat/unknown" });
    expect(state.viewMode).toBe("3d");
    state = reducer(state, setViewMode("2d"));
    state = reducer(state, loadCombatScenario(buildEngineRoomScenario()));
    expect(state.viewMode).toBe("2d");
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.viewMode).toBe("2d");
  });

  it("stores constrained 3D camera controls in Redux", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, rotateCamera(-1));
    expect(state.camera.quarterTurn).toBe(3);
    expect(state.camera.azimuth).toBeCloseTo(-Math.PI / 4);
    state = reducer(state, rotateCameraBy({ azimuth: Math.PI / 8, elevation: 100 }));
    expect(state.camera.azimuth).toBeCloseTo(-Math.PI / 8);
    expect(state.camera.elevation).toBeCloseTo(Math.PI * 0.44);
    for (let index = 0; index < 10; index += 1) state = reducer(state, adjustCameraZoom(1));
    expect(state.camera.zoom).toBe(63);
    state = reducer(state, focusCameraOnSelected());
    expect(state.camera).toMatchObject({ focus: { x: 2, y: 4 }, pan: { x: 0, y: 0 } });
    state = reducer(state, panCameraBy({ x: 2, y: -1 }));
    expect(state.camera.pan).toEqual({ x: 2, y: -1 });
    state = reducer(state, panCameraBy({ x: 100, y: -100 }));
    expect(state.camera.pan).toEqual({ x: 9, y: -4 });
    state = reducer(state, resetCamera());
    expect(state.camera).toEqual({ quarterTurn: 0, azimuth: Math.PI / 4, elevation: Math.PI / 4.75, zoom: 42, focus: null, pan: { x: 0, y: 0 } });
  });

  it("provides two distinct selectable scenarios that load and reset independently", () => {
    expect(characterCombatScenarios.map((entry) => entry.id)).toEqual(["boarding-action", "engine-room-sabotage", "engineering-blackout", "door-reaction-drill", "cargo-deck-interdiction", "carrier-deck-assault", "terrain-training", "elevated-strongpoint", "suppress-strongpoint", "capture-commander", "detention-deck-rescue", "hold-the-airlock", "armory-sweep", "capture-the-bridge", "zero-g-drift", "hull-breach", "damage-control"]);
    const boarding = buildTrainingScenario();
    const engine = buildEngineRoomScenario();
    expect(engine).toMatchObject({ id: "engine-room-sabotage", width: 14, height: 9 });
    expect(engine.doors).toHaveLength(2);
    expect(engine.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(3);
    expect(engine.objects.find((object) => object.kind === "console")?.label).toBe("Drive-Control Console");

    let state = reducer(undefined, loadCombatScenario(boarding));
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.selectedCombatantId).toBe("player-1");
    state = reducer(state, loadCombatScenario(engine));
    expect(state).toMatchObject({ status: "active", turn: 1, selectedCombatantId: null, actedCombatantIds: [], events: [] });
    expect(state.scenario?.id).toBe("engine-room-sabotage");
    expect(state.actionPointsById["enemy-3"]).toBe(6);
  });

  it("provides a valid terrain training map with four visually distinct test areas", () => {
    expect(structuralVerticalSpan(0, 0.9)).toEqual({ height: 0.9, centerY: 0.45 });
    expect(structuralVerticalSpan(0.65, 0.9)).toEqual({ height: 1.55, centerY: 0.775 });
    const scenario = buildTerrainTrainingScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    expect(scenario).toMatchObject({ id: "terrain-training", width: 20, height: 14, victoryCondition: "secure-objective" });
    expect(Object.values(scenario.terrainByCell ?? {}).filter((terrain) => terrain === "difficult")).toHaveLength(16);
    expect(Object.values(scenario.terrainByCell ?? {}).filter((terrain) => terrain === "elevated")).toHaveLength(20);
    expect(Object.values(scenario.terrainByCell ?? {}).filter((terrain) => terrain === "hazardous")).toHaveLength(15);
    expect(scenario.objects.filter((object) => object.label === "Low Vault Barrier")).toHaveLength(3);
    expect(scenario.walls.some((wall) => wall.id.startsWith("platform-"))).toBe(false);
    expect(scenario.doors.map((door) => door.id)).toEqual(["hazard-gate"]);
    expect(scenario.elevationAccessCells).toEqual([{ x: 13, y: 6 }]);
    expect(terrainHeightAt(scenario, { x: 13, y: 3 })).toBe(0.65);
    expect(terrainHeightAt(scenario, { x: 5, y: 3 })).toBe(0);
  });

  it("provides a valid five-person elevated strongpoint assault with selectable lead kits", () => {
    const scenario = buildElevatedStrongpointScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    expect(scenario).toMatchObject({ id: "elevated-strongpoint", width: 24, height: 16, victoryCondition: "staged-objectives", stageObjectiveIds: ["west-control", "east-control"] });
    expect(scenario.combatants.filter((unit) => unit.side === "player")).toHaveLength(5);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(7);
    expect(Object.values(scenario.terrainByCell ?? {}).filter((terrain) => terrain === "elevated")).toHaveLength(40);
    expect(scenario.defendedObjectiveByCombatantId).toEqual({
      "enemy-1": "west-control",
      "enemy-2": "west-control",
      "enemy-5": "east-control",
      "enemy-6": "east-control",
      "enemy-7": "east-control",
    });
    expect(scenario.flankBiasByCombatantId).toEqual({ "enemy-3": "left", "enemy-4": "right" });

    const equipped = applyArmoryLoadouts(buildElevatedStrongpointScenario(), ["heavy", "assault"]);
    expect(equipped.combatants.filter((unit) => unit.side === "player").slice(0, 2)).toMatchObject([
      { weapon: characterCombatWeapons.gaussRifle, armorName: "Battle Dress", armor: 8 },
      { weapon: characterCombatWeapons.smg, armorName: "Combat Armor", armor: 6 },
    ]);
  });

  it("keeps an assigned strongpoint defender near its active control station", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 1, y: 3 };
    defender.weapon = { ...defender.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };
    const start = { ...defender.position };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [defender.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === defender.id)?.position).toEqual(start);
    expect(state.events.some((event) => event === "West Gunner held defensive assignment at West Fire-Control Station")).toBe(true);
  });

  it("releases a strongpoint defender after its assigned station is secured", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });
    scenario.objects.find((object) => object.id === "west-control")!.completed = true;
    player.position = { x: 1, y: 3 };
    defender.weapon = { ...defender.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [defender.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.events.some((event) => event.includes("held defensive assignment"))).toBe(false);
  });

  it("sends the strongpoint patrols toward opposite flanks", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const centerPatrol = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    const hazardPatrol = scenario.combatants.find((unit) => unit.id === "enemy-4")!;
    scenario.combatants.filter((unit) => ![player.id, centerPatrol.id, hazardPatrol.id].includes(unit.id)).forEach((unit) => { unit.defeated = true; });
    scenario.terrainByCell = {};
    scenario.objects = [];
    player.position = { x: 5, y: 5 };
    player.facing = "east";
    centerPatrol.position = { x: 9, y: 4 };
    hazardPatrol.position = { x: 9, y: 6 };
    centerPatrol.weapon = { ...centerPatrol.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };
    hazardPatrol.weapon = { ...hazardPatrol.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {
      [centerPatrol.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } },
      [hazardPatrol.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } },
    } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === centerPatrol.id)?.position).toEqual({ x: 8, y: 4 });
    expect(state.scenario?.combatants.find((unit) => unit.id === hazardPatrol.id)?.position).toEqual({ x: 8, y: 6 });
    expect(state.events.some((event) => event.includes("Center Patrol advanced on the left flank"))).toBe(true);
    expect(state.events.some((event) => event.includes("Hazard Patrol advanced on the right flank"))).toBe(true);
  });

  it("requires both elevated strongpoint controls even when defenders remain", () => {
    const scenario = buildElevatedStrongpointScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 10, y: 4 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.position = { x: 18, y: 10 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 12, y: 3 };
    scenario.combatants.find((unit) => unit.id === "enemy-7")!.position = { x: 17, y: 10 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(stagedObjectiveStatus(state.scenario!, "west-control")).toBe("active");
    expect(stagedObjectiveStatus(state.scenario!, "east-control")).toBe("locked");
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, previewSecureObjective("east-control"));
    expect(state.plannedObjectiveId).toBeNull();
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewSecureObjective("west-control"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("active");
    expect(state.scenario?.objects.find((object) => object.id === "west-control")?.completed).toBe(true);
    expect(stagedObjectiveStatus(state.scenario!, "west-control")).toBe("completed");
    expect(stagedObjectiveStatus(state.scenario!, "east-control")).toBe("active");
    expect(state.scenario?.objective).toBe("Current objective: secure East Defense-Control Station.");
    expect(state.events[0]).toContain("East Defense-Control Station is now active");
    expect(state.scenario?.combatants.some((unit) => unit.side === "enemy" && !unit.defeated)).toBe(true);

    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, previewSecureObjective("east-control"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("victory");
  });

  it("blocks a contested strongpoint control until its adjacent defender breaks", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 10, y: 4 };
    defender.position = { x: 9, y: 3 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== defender.id).forEach((unit) => { unit.position = { x: 15 + Number(unit.id.at(-1)), y: 14 }; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(objectiveContesters(state.scenario!, "west-control", state.moraleStateByCombatantId, state.turn).map((unit) => unit.id)).toEqual([defender.id]);
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("west-control"));
    expect(state.plannedObjectiveId).toBeNull();

    state = { ...state, moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [defender.id]: "panicked" } };
    expect(objectiveContesters(state.scenario!, "west-control", state.moraleStateByCombatantId, state.turn)).toEqual([]);
    state = reducer(state, previewSecureObjective("west-control"));
    expect(state.plannedObjectiveId).toBe("west-control");
  });

  it("allows a cleared or stunned strongpoint control to be secured", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 10, y: 4 };
    defender.position = { x: 9, y: 3 };
    defender.stunnedUntilTurn = 1;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(objectiveContesters(state.scenario!, "west-control", state.moraleStateByCombatantId, state.turn)).toEqual([]);
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("west-control"));
    expect(state.plannedObjectiveId).toBe("west-control");

    const clearedScenario = buildElevatedStrongpointScenario();
    clearedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 10, y: 4 };
    clearedScenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    state = reducer(undefined, loadCombatScenario(clearedScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewSecureObjective("west-control"));
    expect(state.plannedObjectiveId).toBe("west-control");
  });

  it("moves an assigned defender to contest a threatened station when it has no shot", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 10, y: 4 };
    defender.position = { x: 9, y: 5 };
    defender.facing = "north";
    defender.weapon = { ...defender.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [defender.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === defender.id)?.position).toEqual({ x: 9, y: 4 });
    expect(state.events.some((event) => event.includes("West Guard moved to contest West Fire-Control Station"))).toBe(true);
  });

  it("keeps an assigned defender firing when it can attack a station threat", () => {
    const scenario = buildElevatedStrongpointScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 10, y: 4 };
    defender.position = { x: 9, y: 5 };
    defender.facing = "east";
    const start = { ...defender.position };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [defender.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === defender.id)?.position).toEqual(start);
    expect(state.events.some((event) => event.includes("West Guard automatic fired at Assault Lead") || event.includes("West Guard suppressive fired at Assault Lead"))).toBe(true);
  });

  it("allows platform movement through the staircase and blocks exposed raised edges", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;

    player.position = { x: 13, y: 7 };
    player.facing = "north";
    expect(reachableMovement(scenario, player.id, 4).has(pointKey({ x: 13, y: 5 }))).toBe(true);

    player.position = { x: 12, y: 6 };
    expect(reachableMovement(scenario, player.id, 1).has(pointKey({ x: 12, y: 5 }))).toBe(false);

    player.position = { x: 13, y: 5 };
    player.facing = "south";
    expect(reachableMovement(scenario, player.id, 2).has(pointKey({ x: 13, y: 6 }))).toBe(true);
  });

  it("moves diagonally forward for 3 AP and charges an additional AP for difficult terrain", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.terrainByCell = {};
    player.position = { x: 1, y: 1 };

    expect(reachableMovement(scenario, player.id, 3).get("2:2")).toMatchObject({ destination: { x: 2, y: 2 }, path: [{ x: 2, y: 2 }], cost: 3 });
    scenario.terrainByCell["2:2"] = "difficult";
    expect(reachableMovement(scenario, player.id, 2).has("2:2")).toBe(false);
    expect(reachableMovement(scenario, player.id, 4).get("2:2")?.cost).toBe(4);
  });

  it("prevents diagonal movement through blocked corners and door boundaries", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [{ id: "corner-cover", kind: "cover", position: { x: 2, y: 1 }, label: "Corner Cover" }];
    player.position = { x: 1, y: 1 };
    expect(reachableMovement(scenario, player.id, 6).get("2:2")?.path).toHaveLength(2);

    scenario.objects = [];
    scenario.doors = [{ id: "corner-door", from: { x: 2, y: 1 }, to: { x: 2, y: 2 }, open: true }];
    const reachable = reachableMovement(scenario, player.id, 6);
    expect(reachable.get("2:1")?.cost).toBe(2);
    expect(reachable.get("2:2")?.path).toHaveLength(2);
  });

  it("previews and confirms a diagonal player move using the shared AP cost", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    player.position = { x: 1, y: 1 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 2, y: 2 }));
    expect(state.plannedMove).toMatchObject({ path: [{ x: 2, y: 2 }], cost: 3, finalFacing: "east" });
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.position).toEqual({ x: 2, y: 2 });
    expect(state.actionPointsById[player.id]).toBe(3);
  });

  it("dives to a legal adjacent square for 3 AP and ends prone", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    player.position = { x: 1, y: 1 };

    expect(diveOptions(scenario, player.id).get("2:2")).toMatchObject({ cost: 3, kind: "dive" });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, beginDive());
    expect(state.diveTargeting).toBe(true);
    state = reducer(state, previewDive({ x: 2, y: 2 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 2, y: 2 }, cost: 3, kind: "dive" });
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)).toMatchObject({ position: { x: 2, y: 2 }, posture: "prone" });
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.events[0]).toContain("dove to 2,2 and went prone");
  });

  it("crawls up to two squares for 2 AP per square and remains prone", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.terrainByCell = {};
    player.position = { x: 1, y: 1 };
    player.posture = "prone";

    const options = reachableCrawling(scenario, player.id, 6);
    expect(options.get("2:2")).toMatchObject({ cost: 2, kind: "crawl", path: [{ x: 2, y: 2 }] });
    expect(options.get("3:3")).toMatchObject({ cost: 4, kind: "crawl", path: [{ x: 2, y: 2 }, { x: 3, y: 3 }] });
    expect(options.has("4:4")).toBe(false);

    scenario.terrainByCell["2:2"] = "difficult";
    expect(reachableCrawling(scenario, player.id, 2).has("2:2")).toBe(false);
    expect(reachableCrawling(scenario, player.id, 3).get("2:2")?.cost).toBe(3);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 2, y: 2 }));
    expect(state.plannedMove).toMatchObject({ cost: 3, kind: "crawl" });
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)).toMatchObject({ position: { x: 2, y: 2 }, posture: "prone" });
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.events[0]).toContain("crawled to 2,2 (3 AP)");
  });

  it.skip("charges up to three squares and immediately resolves the selected melee attack", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    player.position = { x: 1, y: 1 };
    target.position = { x: 4, y: 1 };

    expect(chargeMoves(scenario, player.id).get(target.id)).toMatchObject({ destination: { x: 3, y: 1 }, cost: 6, kind: "charge" });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewCharge(target.id));
    expect(state.plannedMove).toMatchObject({ cost: 6, kind: "charge" });
    expect(state.plannedAttackTargetId).toBe(target.id);
    state = reducer(state, confirmMove({ hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 }, meleeMode: "blade" }));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.position).toEqual({ x: 3, y: 1 });
    expect(state.actionPointsById[player.id]).toBe(0);
    expect(state.events.some((event) => event.includes("charged and used blade"))).toBe(true);

    const distant = buildTrainingScenario();
    distant.walls = [];
    distant.doors = [];
    distant.objects = [];
    distant.combatants.find((unit) => unit.id === player.id)!.position = { x: 1, y: 1 };
    distant.combatants.find((unit) => unit.id === target.id)!.position = { x: 6, y: 1 };
    expect(chargeMoves(distant, player.id).has(target.id)).toBe(false);
  });

  it.skip("lets a melee-oriented enemy charge through a legal path and immediately attack", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 4, y: 1 };
    enemy.meleeRating = 3;
    enemy.weaponSkill = 0;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).toEqual({ x: 2, y: 1 });
    expect(state.events.some((event) => event.startsWith(`${enemy.name} charged and melee attacked ${player.name}`))).toBe(true);
  });

  it("grants high ground to a standing ranged attacker only", () => {
    const scenario = buildTerrainTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;

    attacker.position = { x: 13, y: 3 };
    target.position = { x: 17, y: 3 };
    attacker.posture = "standing";
    expect(elevationAttackModifier(scenario, attacker, target)).toBe(1);

    attacker.posture = "prone";
    expect(elevationAttackModifier(scenario, attacker, target)).toBe(0);

    attacker.posture = "standing";
    target.position = { x: 14, y: 3 };
    expect(elevationAttackModifier(scenario, attacker, target)).toBe(0);
    expect(elevationAttackModifier(scenario, target, attacker)).toBe(0);
  });

  it("lets high ground fire over low cover while walls still block sight", () => {
    const scenario = buildTerrainTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;

    attacker.position = { x: 13, y: 3 };
    target.position = { x: 8, y: 3 };
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(true);
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(0);

    attacker.position = { x: 7, y: 3 };
    target.position = { x: 10, y: 3 };
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(2);

    attacker.position = { x: 13, y: 3 };
    target.position = { x: 8, y: 3 };
    scenario.walls.push({ id: "elevation-los-test-wall", from: { x: 10, y: 2 }, to: { x: 10, y: 5 } });
    expect(hasLineOfSight(scenario, attacker.position, target.position)).toBe(false);
  });

  it("protects an elevated target behind a platform edge but not through its access ramp", () => {
    const scenario = buildTerrainTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;

    attacker.position = { x: 9, y: 5 };
    target.position = { x: 11, y: 5 };
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 2, source: "platform-edge" });

    attacker.position = { x: 13, y: 7 };
    target.position = { x: 13, y: 5 };
    expect(coverAssessment(scenario, attacker.id, target.id)).toEqual({ value: 0, source: null });

    attacker.position = { x: 13, y: 3 };
    target.position = { x: 14, y: 3 };
    expect(coverAssessment(scenario, attacker.id, target.id).source).not.toBe("platform-edge");
  });

  it("offers exposed lower cells for dropping but excludes the ramp and occupied destinations", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 11, y: 5 };
    expect(dropDownOptions(scenario, player.id)).toContainEqual({ x: 10, y: 5 });

    player.position = { x: 13, y: 5 };
    expect(dropDownOptions(scenario, player.id)).not.toContainEqual({ x: 13, y: 6 });

    player.position = { x: 11, y: 5 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 10, y: 5 };
    expect(dropDownOptions(scenario, player.id)).not.toContainEqual({ x: 10, y: 5 });
  });

  it("resolves successful and failed drop-down footing checks", () => {
    const successfulScenario = buildTerrainTrainingScenario();
    successfulScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 11, y: 5 };
    let state = reducer(undefined, loadCombatScenario(successfulScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewDropDown({ x: 10, y: 5 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 10, y: 5 }, cost: 3, kind: "drop" });
    state = reducer(state, confirmMove({ hitDice: { first: 4, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.position).toEqual({ x: 10, y: 5 });
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.posture ?? "standing").toBe("standing");
    expect(state.actionPointsById["player-1"]).toBe(3);

    const failedScenario = buildTerrainTrainingScenario();
    failedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 11, y: 5 };
    state = reducer(undefined, loadCombatScenario(failedScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewDropDown({ x: 10, y: 5 }));
    state = reducer(state, confirmMove({ hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ position: { x: 10, y: 5 }, posture: "prone" });
    expect(state.actionPointsById["player-1"]).toBe(0);
  });

  it("offers exposed elevated cells for climbing but excludes the ramp and occupied destinations", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 10, y: 5 };
    expect(climbUpOptions(scenario, player.id)).toContainEqual({ x: 11, y: 5 });

    player.position = { x: 13, y: 6 };
    expect(climbUpOptions(scenario, player.id)).not.toContainEqual({ x: 13, y: 5 });

    player.position = { x: 10, y: 5 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 11, y: 5 };
    expect(climbUpOptions(scenario, player.id)).not.toContainEqual({ x: 11, y: 5 });
  });

  it("moves up on a successful climb and remains below prone on failure", () => {
    const successfulScenario = buildTerrainTrainingScenario();
    successfulScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 10, y: 5 };
    let state = reducer(undefined, loadCombatScenario(successfulScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewClimbUp({ x: 11, y: 5 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 11, y: 5 }, cost: 6, kind: "climb" });
    state = reducer(state, confirmMove({ hitDice: { first: 4, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.position).toEqual({ x: 11, y: 5 });
    expect(state.actionPointsById["player-1"]).toBe(0);

    const failedScenario = buildTerrainTrainingScenario();
    failedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 10, y: 5 };
    state = reducer(undefined, loadCombatScenario(failedScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewClimbUp({ x: 11, y: 5 }));
    state = reducer(state, confirmMove({ hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ position: { x: 10, y: 5 }, posture: "prone" });
    expect(state.actionPointsById["player-1"]).toBe(0);
  });

  it("prevents melee engagement across exposed platform edges but allows it at the ramp", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });

    player.position = { x: 10, y: 5 };
    enemy.position = { x: 11, y: 5 };
    expect(adjacentEnemies(scenario, player.id)).toEqual([]);
    expect(adjacentEnemies(scenario, enemy.id)).toEqual([]);

    player.position = { x: 13, y: 6 };
    enemy.position = { x: 13, y: 5 };
    expect(adjacentEnemies(scenario, player.id).map((unit) => unit.id)).toEqual([enemy.id]);
    expect(adjacentEnemies(scenario, enemy.id).map((unit) => unit.id)).toEqual([player.id]);

    player.position = { x: 12, y: 3 };
    enemy.position = { x: 13, y: 3 };
    expect(adjacentEnemies(scenario, player.id).map((unit) => unit.id)).toEqual([enemy.id]);
  });

  it("blocks ground-level sight through a raised platform while preserving sight to and from its surface", () => {
    const scenario = buildTerrainTrainingScenario();
    scenario.smokeCells = [];

    expect(hasLineOfSight(scenario, { x: 10, y: 3 }, { x: 16, y: 3 })).toBe(false);
    expect(hasLineOfSight(scenario, { x: 10, y: 3 }, { x: 15, y: 3 })).toBe(true);
    expect(hasLineOfSight(scenario, { x: 11, y: 3 }, { x: 16, y: 3 })).toBe(true);

    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 10, y: 3 };
    enemy.position = { x: 16, y: 3 };
    expect(rangedEnemies(scenario, player.id)).toEqual([]);
    expect(validGrenadeTargets(scenario, player.id).map(pointKey)).toContain(pointKey(enemy.position));
  });

  it("charges two movement points to enter difficult terrain and routes around costly ground", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 3, y: 4 };
    const reachable = reachableMovement(scenario, player.id, 4);
    expect(reachable.get(pointKey({ x: 4, y: 4 }))?.cost).toBe(3);
    expect(reachable.has(pointKey({ x: 5, y: 4 }))).toBe(false);
    expect(reachable.has(pointKey({ x: 6, y: 4 }))).toBe(false);

    scenario.terrainByCell = { "2:1": "difficult", "3:1": "difficult", "4:1": "difficult" };
    player.position = { x: 1, y: 1 };
    const route = shortestPathToAny(scenario, player.id, [{ x: 5, y: 1 }]);
    expect(route).not.toBeNull();
    expect(route?.some((point) => point.y !== 1)).toBe(true);
    expect(route?.some((point) => scenario.terrainByCell?.[pointKey(point)] === "difficult")).toBe(false);
  });

  it("checks hazardous footing once per player move and ends the activation on failure", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 5, y: 8 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 5, y: 9 }));
    state = reducer(state, confirmMove({ hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.posture).toBe("prone");
    expect(state.actionPointsById[player.id]).toBe(0);
    expect(state.events[0]).toBe("Terrain Lead failed hazardous footing 6/7: prone, activation ended");

    const passingScenario = buildTerrainTrainingScenario();
    const passingPlayer = passingScenario.combatants.find((unit) => unit.id === "player-1")!;
    passingPlayer.position = { x: 5, y: 8 };
    state = reducer(undefined, loadCombatScenario(passingScenario));
    state = reducer(state, selectPlayerCombatant(passingPlayer.id));
    state = reducer(state, previewMove({ x: 5, y: 9 }));
    state = reducer(state, confirmMove({ hitDice: { first: 4, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === passingPlayer.id)?.posture ?? "standing").toBe("standing");
    expect(state.actionPointsById[passingPlayer.id]).toBe(3);
    expect(state.events[0]).toBe("Terrain Lead passed hazardous footing 7/7");
  });

  it("applies the same hazardous footing failure to enemy movement", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 5, y: 7 };
    enemy.position = { x: 5, y: 11 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 2, second: 2 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.posture).toBe("prone");
    expect(state.events.some((event) => event === "Course Controller failed hazardous footing 4/7: prone, activation ended")).toBe(true);
  });

  it("vaults a low barrier for 3 AP and rejects occupied landing cells", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 8, y: 3 };
    expect(vaultOptions(scenario, player.id)).toEqual([expect.objectContaining({ barrier: expect.objectContaining({ id: "vault-1" }), landing: { x: 10, y: 3 } })]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, vaultBarrier("vault-1"));
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)).toMatchObject({ position: { x: 10, y: 3 }, facing: "east" });
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.events[0]).toBe("Terrain Lead vaulted Low Vault Barrier to 10,3 (3 AP)");

    const blockedScenario = buildTerrainTrainingScenario();
    blockedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    blockedScenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 10, y: 3 };
    expect(vaultOptions(blockedScenario, "player-1")).toEqual([]);
  });

  it("allows an enemy to vault a low barrier when it improves its approach", () => {
    const scenario = buildTerrainTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    player.position = { x: 7, y: 3 };
    enemy.position = { x: 10, y: 3 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).toEqual({ x: 8, y: 3 });
    expect(state.events.some((event) => event === "Course Controller vaulted Low Vault Barrier to 8,3 (3 AP)")).toBe(true);
  });

  it("applies selected Heavy and Assault kits to the Terrain Training team", () => {
    const scenario = applyArmoryLoadouts(buildTerrainTrainingScenario(), ["heavy", "assault"]);
    const players = scenario.combatants.filter((unit) => unit.side === "player");
    expect(players[0]).toMatchObject({ name: "Terrain Lead", weapon: characterCombatWeapons.gaussRifle, armorName: "Battle Dress", armor: 8 });
    expect(players[1]).toMatchObject({ name: "Terrain Support", weapon: characterCombatWeapons.smg, armorName: "Combat Armor", armor: 6 });
  });

  it("keeps Terrain Training active after all enemies are neutralized and wins only at the finish console", () => {
    const scenario = buildTerrainTrainingScenario();
    const lead = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const support = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const finalEnemy = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== finalEnemy.id).forEach((unit) => { unit.defeated = true; unit.health = 0; unit.woundState = "unconscious"; });
    lead.position = { x: 2, y: 2 };
    support.position = { x: 4, y: 3 };
    finalEnemy.position = { x: 3, y: 2 };
    finalEnemy.facing = "east";
    finalEnemy.meleeRating = 0;
    finalEnemy.armor = 0;
    scenario.objects.find((object) => object.id === "finish-marker")!.position = { x: 4, y: 2 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(lead.id));
    state = reducer(state, previewSubdue(finalEnemy.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 }, attackMode: "melee", meleeMode: "subdue" }));
    expect(state.scenario?.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)).toBe(true);
    expect(state.status).toBe("active");

    state = reducer(state, selectPlayerCombatant(support.id));
    state = reducer(state, previewSecureObjective("finish-marker"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("victory");
    expect(state.events[0]).toBe("Terrain Support secured Terrain Course Finish");
  });

  it("provides a valid five-crew suppression scenario with a concentrated enemy section", () => {
    const scenario = buildSuppressStrongpointScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    expect(scenario.combatants.filter((unit) => unit.side === "player")).toHaveLength(5);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(6);
    expect(characterCombatScenarios.find((entry) => entry.id === scenario.id)?.teamSize).toBe(5);
    expect(scenario.combatants.find((unit) => unit.id === "enemy-1")?.leadershipRating).toBe(2);
  });

  it("provides a valid reachable five-crew commander capture scenario", () => {
    const scenario = buildCaptureCommanderScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    expect(scenario).toMatchObject({ victoryCondition: "capture-target", captureTargetId: "enemy-1" });
    scenario.doors.forEach((door) => { door.open = true; });
    const commander = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId)!;
    const reachable = reachableMovement(scenario, "player-1", 40);
    expect([...reachable.values()].some((move) => Math.abs(move.destination.x - commander.position.x) + Math.abs(move.destination.y - commander.position.y) === 1)).toBe(true);
  });

  it("wins Capture the Commander only when Commander Voss is restrained alive", () => {
    const scenario = buildCaptureCommanderScenario();
    const actor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const commander = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId)!;
    actor.position = { x: commander.position.x - 1, y: commander.position.y };
    commander.stunnedUntilTurn = 2;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(actor.id));
    state = reducer(state, restrainEnemy(commander.id));
    expect(state.status).toBe("victory");
    expect(state.scenario?.combatants.find((unit) => unit.id === commander.id)).toMatchObject({ surrendered: true, woundState: "healthy" });
    expect(state.events).toContain("Commander Voss captured alive");
  });

  it("loses Capture the Commander when Commander Voss is lethally incapacitated", () => {
    const scenario = buildCaptureCommanderScenario();
    scenario.walls = [];
    scenario.doors = [];
    const actor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const commander = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId)!;
    actor.weapon = { ...characterCombatWeapons.gaussRifle };
    actor.position = { x: commander.position.x - 3, y: commander.position.y };
    scenario.combatants.filter((unit) => unit.id !== actor.id && unit.id !== commander.id).forEach((unit, index) => { unit.position = { x: index, y: 0 }; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(actor.id));
    state = reducer(state, previewAttack(commander.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.status).toBe("defeat");
    expect(state.events.some((event) => event.includes("Mission failed: Commander Voss was incapacitated before capture"))).toBe(true);
  });

  it("wins Capture the Commander when Commander Voss surrenders through morale", () => {
    const scenario = buildCaptureCommanderScenario();
    scenario.walls = [];
    scenario.doors = [];
    const actor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const casualty = scenario.combatants.find((unit) => unit.id === "enemy-4")!;
    const commander = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId)!;
    actor.weapon = { ...characterCombatWeapons.gaussRifle };
    actor.position = { x: 13, y: 4 };
    casualty.position = { x: 14, y: 4 };
    commander.position = { x: 15, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [commander.id]: "panicked" } };
    state = reducer(state, selectPlayerCombatant(actor.id));
    state = reducer(state, previewAttack(casualty.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 }, moraleRolls: { [commander.id]: { first: 1, second: 1 } } }));
    expect(state.status).toBe("victory");
    expect(state.scenario?.combatants.find((unit) => unit.id === commander.id)?.surrendered).toBe(true);
  });

  it("loses Capture the Commander when environmental fire incapacitates Commander Voss", () => {
    const scenario = buildCaptureCommanderScenario();
    const commander = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId)!;
    commander.woundState = "light";
    commander.stunnedUntilTurn = 1;
    scenario.fireCells = [{ ...commander.position }];
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== commander.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id) };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [commander.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.status).toBe("defeat");
    expect(state.events.some((event) => event.includes("Mission failed: Commander Voss was incapacitated before capture"))).toBe(true);
  });

  it("uses automatic fire to suppress a visible enemy without causing a wound", () => {
    const scenario = buildSuppressStrongpointScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 6, y: 7 };
    const target = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("suppressive"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 }, moraleRolls: { [target.id]: { first: 1, second: 1 } } }));
    expect(state.suppressedCombatantIds).toContain(target.id);
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.woundState).toBe("healthy");
    expect(state.moraleStateByCombatantId?.[target.id]).toBe("shaken");
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.ammunitionById["player-1"]).toBe(27);
  });

  it("spends suppressive-fire AP and ammunition even when suppression fails", () => {
    const scenario = buildSuppressStrongpointScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 6, y: 7 };
    const target = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("suppressive"));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 6, second: 6 } }));
    expect(state.suppressedCombatantIds).not.toContain(target.id);
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.ammunitionById["player-1"]).toBe(27);
  });

  it("does not spend resources attempting to suppress an already suppressed target", () => {
    const scenario = buildSuppressStrongpointScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 6, y: 7 };
    const target = scenario.combatants.find((unit) => unit.id === "enemy-3")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, suppressedCombatantIds: [target.id] };
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("suppressive"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById["player-1"]).toBe(6);
    expect(state.ammunitionById["player-1"]).toBe(30);
  });

  it("lets an enemy leader spend its activation rallying a nearby suppressed ally", () => {
    const scenario = buildSuppressStrongpointScenario();
    let state = reducer(undefined, loadCombatScenario(scenario));
    const playerIds = scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id);
    state = { ...state, actedCombatantIds: playerIds, suppressedCombatantIds: ["enemy-2"] };
    const enemyRolls = Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "enemy").map((unit) => [unit.id, { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }]));
    enemyRolls["enemy-1"].hitDice = { first: 3, second: 3 };
    state = reducer(state, endPlayerTurn({ enemyRolls }));
    expect(state.suppressedCombatantIds).not.toContain("enemy-2");
    expect(state.events.some((event) => event.includes("Security Lieutenant rallied Security Gunner"))).toBe(true);
  });

  it("lets a suppressed enemy spend its activation rallying itself", () => {
    const scenario = buildSuppressStrongpointScenario();
    let state = reducer(undefined, loadCombatScenario(scenario));
    const playerIds = scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id);
    state = { ...state, actedCombatantIds: playerIds, suppressedCombatantIds: ["enemy-1"] };
    const enemyRolls = Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "enemy").map((unit) => [unit.id, { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }]));
    enemyRolls["enemy-1"].hitDice = { first: 3, second: 3 };
    state = reducer(state, endPlayerTurn({ enemyRolls }));
    expect(state.suppressedCombatantIds).not.toContain("enemy-1");
    expect(state.events.some((event) => event.includes("Security Lieutenant rallied themself"))).toBe(true);
  });

  it("lets a suppressed enemy dive toward adjacent cover when its rally would fail", () => {
    const scenario = buildTrainingScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [{ id: "dive-cover", kind: "cover", position: { x: 5, y: 4 }, label: "Dive Cover" }];
    enemy.position = { x: 3, y: 4 };
    enemy.posture = "standing";
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 0, y: 0 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.position = { x: 0, y: 1 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    const playerIds = scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id);
    state = { ...state, actedCombatantIds: playerIds, suppressedCombatantIds: [enemy.id] };
    const enemyRolls = { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } };
    state = reducer(state, endPlayerTurn({ enemyRolls }));
    const movedEnemy = state.scenario?.combatants.find((unit) => unit.id === enemy.id);
    expect(movedEnemy?.posture).toBe("prone");
    expect(movedEnemy?.position).not.toEqual({ x: 3, y: 4 });
    expect(state.events.some((event) => event.includes("dove to cover") && event.includes("went prone"))).toBe(true);
  });

  it("makes a prone enemy crawl toward a distant player using crawl costs", () => {
    const scenario = buildTrainingScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    enemy.position = { x: 9, y: 7 };
    enemy.posture = "prone";
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 0, y: 0 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } } } }));
    const movedEnemy = state.scenario?.combatants.find((unit) => unit.id === enemy.id);
    expect(movedEnemy?.posture).toBe("prone");
    expect(movedEnemy?.position).not.toEqual({ x: 9, y: 7 });
    expect(state.events.some((event) => event.includes("Security Guard crawled") && event.includes("4 AP"))).toBe(true);
  });

  it("makes a prone enemy stand when every useful crawl is blocked", () => {
    const scenario = buildTrainingScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    scenario.walls = [];
    scenario.doors = [];
    enemy.position = { x: 9, y: 7 };
    enemy.posture = "prone";
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 0, y: 0 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.objects = [
      { id: "block-west", kind: "cover", position: { x: 8, y: 7 }, label: "Block" },
      { id: "block-north", kind: "cover", position: { x: 9, y: 6 }, label: "Block" },
      { id: "block-northwest", kind: "cover", position: { x: 8, y: 6 }, label: "Block" },
      { id: "block-east", kind: "cover", position: { x: 10, y: 7 }, label: "Block" },
    ];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.posture).toBe("standing");
    expect(state.events.some((event) => event.includes("Security Guard stood up (2 AP)"))).toBe(true);
  });

  it("keeps an enemy suppressed after a failed rally attempt", () => {
    const scenario = buildSuppressStrongpointScenario();
    let state = reducer(undefined, loadCombatScenario(scenario));
    const playerIds = scenario.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id);
    state = { ...state, actedCombatantIds: playerIds, suppressedCombatantIds: ["enemy-2"] };
    const enemyRolls = Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "enemy").map((unit) => [unit.id, { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }]));
    state = reducer(state, endPlayerTurn({ enemyRolls }));
    expect(state.suppressedCombatantIds).toContain("enemy-2");
    expect(state.events.some((event) => event.includes("Security Lieutenant failed to rally Security Gunner"))).toBe(true);
  });

  it("has an automatic-weapon enemy suppress the most protected visible player", () => {
    const scenario = buildTrainingScenario();
    scenario.victoryCondition = "hold-zone";
    scenario.holdUntilTurn = 99;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.weapon = { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true, magazineSize: 12 };
    enemy.position = { x: 6, y: 4 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    const protectedPlayer = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const exposedPlayer = scenario.combatants.find((unit) => unit.id === "player-2")!;
    protectedPlayer.position = { x: 2, y: 4 };
    protectedPlayer.armor = 4;
    exposedPlayer.position = { x: 3, y: 4 };
    exposedPlayer.armor = 1;
    scenario.combatants.filter((unit) => unit.side === "player" && unit.id !== protectedPlayer.id && unit.id !== exposedPlayer.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [protectedPlayer.id, exposedPlayer.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } }));
    expect(state.suppressedCombatantIds).toContain(protectedPlayer.id);
    expect(state.suppressedCombatantIds).not.toContain(exposedPlayer.id);
    expect(state.scenario?.combatants.find((unit) => unit.id === protectedPlayer.id)?.woundState).toBe("healthy");
    expect(state.ammunitionById[enemy.id]).toBe(9);
    expect(state.events.some((event) => event.includes(`suppressive fired at ${protectedPlayer.name}`))).toBe(true);
  });

  it("spends enemy ammunition when deliberate suppression fails", () => {
    const scenario = buildTrainingScenario();
    scenario.victoryCondition = "hold-zone";
    scenario.holdUntilTurn = 99;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.weapon = { name: "Carbine", effectiveRange: 4, longRange: 8, extremeRange: 12, penetration: 1, automatic: true, magazineSize: 12 };
    enemy.position = { x: 6, y: 4 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    const target = scenario.combatants.find((unit) => unit.id === "player-1")!;
    target.position = { x: 3, y: 4 };
    target.armor = 4;
    scenario.combatants.filter((unit) => unit.side === "player" && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [target.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 6, second: 6 } } } }));
    expect(state.suppressedCombatantIds).not.toContain(target.id);
    expect(state.ammunitionById[enemy.id]).toBe(9);
    expect(state.events.some((event) => event.includes("held position"))).toBe(true);
  });

  it("has an equipped enemy deploy smoke when exposed to multiple player firing solutions", () => {
    const scenario = buildSuppressStrongpointScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    enemy.position = { x: 7, y: 5 };
    enemy.smokeGrenades = 1;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    const players = scenario.combatants.filter((unit) => unit.side === "player");
    players[0].position = { x: 3, y: 4 };
    players[1].position = { x: 3, y: 6 };
    players.slice(2).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [players[0].id, players[1].id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 6, second: 6 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.smokeGrenades).toBe(0);
    expect(state.lastGrenadeImpact?.kind).toBe("smoke");
    expect(state.scenario?.smokeCells?.map(pointKey)).toContain(pointKey(enemy.position));
    expect(state.events.some((event) => event.includes(`${enemy.name} deployed smoke`))).toBe(true);
  });

  it("does not waste enemy smoke against a single unsuppressed attacker", () => {
    const scenario = buildSuppressStrongpointScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    enemy.position = { x: 7, y: 5 };
    enemy.smokeGrenades = 1;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 3, y: 5 };
    scenario.combatants.filter((unit) => unit.side === "player" && unit.id !== player.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.smokeGrenades).toBe(1);
    expect(state.events.some((event) => event.includes("deployed smoke"))).toBe(false);
  });

  it("provides a traversable route through the engine room to the sabotage objective", () => {
    const scenario = buildEngineRoomScenario();
    scenario.doors.forEach((door) => { door.open = true; });
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    const reachable = reachableMovement(scenario, "player-1", 40);
    expect(reachable.has(pointKey({ x: 7, y: 4 }))).toBe(true);
    expect(reachable.has(pointKey({ x: 11, y: 4 }))).toBe(true);
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 11, y: 4 };
    expect(adjacentObjectives(scenario, player.id).map((objective) => objective.id)).toContain("drive-console");
  });

  it("provides reachable approaches to every Damage Control fire and its console", () => {
    const scenario = buildDamageControlScenario();
    scenario.doors.forEach((door) => { door.open = true; });
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    const playerId = "player-1";
    const adjacentCells = (point: { x: number; y: number }) => [
      { x: point.x + 1, y: point.y }, { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 }, { x: point.x, y: point.y - 1 },
    ];

    expect(scenario).toMatchObject({ id: "damage-control", width: 20, height: 14 });
    expect(scenario.criticalFireCells).toHaveLength(3);
    expect(scenario.criticalFireCells?.every((critical) => scenario.fireCells?.some((fire) => pointKey(fire) === pointKey(critical)))).toBe(true);
    for (const fire of scenario.fireCells ?? []) expect(shortestPathToAny(scenario, playerId, adjacentCells(fire))).not.toBeNull();
    const console = scenario.objects.find((object) => object.id === "damage-control-console")!;
    expect(shortestPathToAny(scenario, playerId, adjacentCells(console.position))).not.toBeNull();
  });

  it("drifts in a straight line to a handhold for 3 AP in zero gravity", () => {
    const scenario = buildZeroGravityScenario();
    const pushes = zeroGravityPushes(scenario, "player-1");
    const eastPush = pushes.get(pointKey({ x: 3, y: 4 }));
    expect(eastPush).toMatchObject({ destination: { x: 3, y: 4 }, cost: 3 });
    expect(eastPush?.path).toEqual([{ x: 3, y: 4 }]);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.position).toEqual({ x: 3, y: 4 });
    expect(state.actionPointsById["player-1"]).toBe(3);
  });

  it("spends AP to go prone and stand up", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, goProne());
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.posture).toBe("prone");
    expect(state.actionPointsById["player-1"]).toBe(5);
    state = reducer(state, standUp());
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.posture).toBe("standing");
    expect(state.actionPointsById["player-1"]).toBe(3);
  });

  it("orients a prone meeple's head toward all four facings", () => {
    expect(proneRotationForFacing("north")).toEqual([-Math.PI / 2, 0, 0]);
    expect(proneRotationForFacing("east")).toEqual([0, 0, -Math.PI / 2]);
    expect(proneRotationForFacing("south")).toEqual([Math.PI / 2, 0, 0]);
    expect(proneRotationForFacing("west")).toEqual([0, 0, Math.PI / 2]);
  });

  it("allows prone crawling up to two squares and prevents trotting", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, goProne());
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).toEqual([]);
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 4, y: 4 }, cost: 4, kind: "crawl" });
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 3, y: 4 }, cost: 2, kind: "crawl" });
  });

  it("applies a minus-two ranged hit modifier against a prone target and resets with a fresh scenario", () => {
    const standingScenario = buildTrainingScenario();
    const standingAttacker = standingScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const standingTarget = standingScenario.combatants.find((unit) => unit.id === "player-1")!;
    standingAttacker.position = { x: 4, y: 4 };
    const standing = resolveSnapShot(standingAttacker, standingTarget, { first: 4, second: 4 }, { first: 1, second: 1 });
    standingTarget.posture = "prone";
    const prone = resolveSnapShot(standingAttacker, standingTarget, { first: 4, second: 4 }, { first: 1, second: 1 });
    expect(prone?.postureModifier).toBe(-2);
    expect(prone?.hitTotal).toBe((standing?.hitTotal ?? 0) - 2);

    let state = reducer(undefined, loadCombatScenario(standingScenario));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.posture).toBe("prone");
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.posture ?? "standing").toBe("standing");
  });

  it("braces a prone weapon for two AP and adds one ranged accuracy", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 7, y: 3 };
    scenario.doors[0].open = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, goProne());
    state = reducer(state, braceWeapon());
    expect(state.bracedCombatantIds).toEqual([attacker.id]);
    expect(state.actionPointsById[attacker.id]).toBe(3);

    const normal = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed", false, false, false);
    const braced = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed", false, false, true);
    expect(braced?.bracedModifier).toBe(1);
    expect(braced?.hitTotal).toBe((normal?.hitTotal ?? 0) + 1);
  });

  it("preserves bracing between turns but clears it on movement, standing, melee, and scenario reset", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, goProne());
    state = reducer(state, braceWeapon());
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"], actionPointsById: { ...state.actionPointsById, "player-1": 3 } };
    state = reducer(state, standUp());
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"], plannedAttackTargetId: "enemy-1" };
    state = reducer(state, selectAttackMode("melee"));
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"], actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.bracedCombatantIds).toContain("player-1");
    state = { ...state, bracedCombatantIds: ["player-1"] };
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.bracedCombatantIds).toEqual([]);
  });

  it("stops zero-G drift before an occupied square", () => {
    const scenario = buildZeroGravityScenario();
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 3, y: 4 };
    const pushes = zeroGravityPushes(scenario, "player-1");
    expect([...pushes.values()].some((move) => move.path.some((point) => pointKey(point) === pointKey({ x: 3, y: 4 })))).toBe(false);
  });

  it.each([
    ["player-1", [{ x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 7, y: 3 }, { x: 9, y: 3 }, { x: 9, y: 4 }]],
    ["player-2", [{ x: 3, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 7, y: 3 }, { x: 9, y: 3 }, { x: 9, y: 4 }]],
  ])("provides %s a complete zero-G route from entry to the command console", (combatantId, destinations) => {
    const scenario = buildZeroGravityScenario();
    scenario.combatants.filter((unit) => unit.id !== combatantId).forEach((unit) => { unit.defeated = true; });
    const unit = scenario.combatants.find((candidate) => candidate.id === combatantId)!;
    destinations.forEach((destination) => {
      if (pointKey(unit.position) === pointKey({ x: 7, y: 3 })) scenario.doors[0].open = true;
      const move = zeroGravityPushes(scenario, combatantId).get(pointKey(destination));
      if (!move) throw new Error(`expected drift from ${unit.position.x},${unit.position.y} to ${destination.x},${destination.y}`);
      unit.position = move!.destination;
    });
    expect(Math.abs(unit.position.x - 10) + Math.abs(unit.position.y - 4)).toBe(1);
  });

  it("applies weapon-specific zero-G recoil unless anchored to a handhold", () => {
    const scenario = buildZeroGravityScenario();
    const unit = scenario.combatants.find((candidate) => candidate.id === "player-1")!;
    scenario.combatants.filter((candidate) => candidate.id !== unit.id).forEach((candidate) => { candidate.defeated = true; });
    unit.position = { x: 6, y: 3 };
    unit.facing = "east";
    unit.weapon = { ...characterCombatWeapons.autopistol };
    expect(weaponRecoilDistance(unit)).toBe(1);
    expect(zeroGravityRecoilPath(scenario, unit.id)).toEqual([{ x: 5, y: 3 }]);
    unit.weapon = { ...characterCombatWeapons.gaussRifle };
    unit.position = { x: 7, y: 1 };
    expect(weaponRecoilDistance(unit)).toBe(3);
    expect(zeroGravityRecoilPath(scenario, unit.id)).toHaveLength(3);
    unit.weapon = { ...characterCombatWeapons.laserRifle };
    expect(zeroGravityRecoilPath(scenario, unit.id)).toEqual([]);
    unit.weapon = { ...characterCombatWeapons.shotgun };
    unit.position = { x: 3, y: 4 };
    expect(zeroGravityRecoilPath(scenario, unit.id)).toEqual([]);
    const normalGravity = buildTrainingScenario();
    expect(zeroGravityRecoilPath(normalGravity, "player-1")).toEqual([]);
  });

  it("resolves a zero-G ranged attack before moving the shooter by recoil", () => {
    const scenario = buildZeroGravityScenario();
    const shooter = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    target.position = { x: 4, y: 4 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(shooter.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 1, second: 1 } }));
    expect(state.events.some((event) => event.includes("fired at"))).toBe(true);
    expect(state.scenario?.combatants.find((unit) => unit.id === shooter.id)?.position).toEqual({ x: 0, y: 4 });
  });

  it("uses a complete legal zero-G push for enemy movement", () => {
    const scenario = buildZeroGravityScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    enemy.position = { x: 9, y: 3 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).toEqual({ x: 8, y: 3 });
    expect(state.events.some((event) => event.includes(`${enemy.name} moved to 8,3 (3 AP)`))).toBe(true);
  });

  it("lets zero-G enemy AI spend its activation opening an adjacent door", () => {
    const scenario = buildZeroGravityScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    enemy.position = { x: 7, y: 3 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.doors[0].open).toBe(true);
    expect(state.events.some((event) => event.includes("opened security-door"))).toBe(true);
  });

  it("contains vacuum behind a closed door and spreads decompression when it opens", () => {
    const scenario = buildHullBreachScenario();
    expect(depressurizedCells(scenario).has(pointKey({ x: 9, y: 3 }))).toBe(true);
    expect(depressurizedCells(scenario).has(pointKey({ x: 7, y: 3 }))).toBe(false);
    scenario.doors[0].open = true;
    expect(depressurizedCells(scenario).has(pointKey({ x: 7, y: 3 }))).toBe(true);
    expect(depressurizedCells(scenario).has(pointKey({ x: 2, y: 4 }))).toBe(true);
  });

  it("equips defenders stationed in the breached compartment with vacc suits", () => {
    const scenario = buildHullBreachScenario();
    expect(scenario.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.vaccSuit)).toBe(true);
  });

  it("makes an unprotected enemy refuse a door that would expose it to vacuum", () => {
    const scenario = buildHullBreachScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.position = { x: 7, y: 3 };
    enemy.vaccSuit = false;
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.doors[0].open).toBe(false);
    expect(state.events.some((event) => event.includes("refused to open security-door into vacuum"))).toBe(true);
  });

  it("allows a suited enemy to open a pressure door", () => {
    const scenario = buildHullBreachScenario();
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.position = { x: 7, y: 3 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.doors[0].open).toBe(true);
  });

  it("previews and applies decompression movement when a player opens a pressure door", () => {
    const scenario = buildHullBreachScenario();
    const opener = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const pulled = scenario.combatants.find((unit) => unit.id === "player-2")!;
    opener.position = { x: 8, y: 3 };
    pulled.position = { x: 6, y: 3 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    const preview = decompressionMovesForDoor(scenario, scenario.doors[0].id);
    expect(preview.get(pulled.id)).toEqual([{ x: 7, y: 3 }]);
    expect(preview.has(opener.id)).toBe(false);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(opener.id));
    state = reducer(state, previewOpenDoor(scenario.doors[0].id));
    expect(state.plannedOpenDoorId).toBe(scenario.doors[0].id);
    state = reducer(state, confirmOpenDoor());
    expect(state.scenario?.doors[0].open).toBe(true);
    expect(state.scenario?.combatants.find((unit) => unit.id === pulled.id)?.position).toEqual({ x: 7, y: 3 });
  });

  it("protects suited characters and escalates unprotected vacuum exposure", () => {
    const scenario = buildHullBreachScenario();
    scenario.doors[0].open = true;
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; unit.woundState = "dead"; });
    const suited = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const unprotected = scenario.combatants.find((unit) => unit.id === "player-2")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    for (const expected of ["light", "serious", "dead"] as const) {
      state = { ...state, actedCombatantIds: state.scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) };
      state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
      expect(state.scenario?.combatants.find((unit) => unit.id === unprotected.id)?.woundState).toBe(expected);
    }
    expect(state.vacuumExposureByCombatantId[unprotected.id]).toBe(3);
    expect(state.vacuumExposureByCombatantId[suited.id]).toBeUndefined();
    expect(state.scenario?.combatants.find((unit) => unit.id === suited.id)?.woundState).toBe("healthy");
  });

  it("defines a valid large cargo deck with two independent objective routes", () => {
    const scenario = buildCargoDeckScenario();
    expect(scenario).toMatchObject({ id: "cargo-deck-interdiction", width: 20, height: 14 });
    expect(scenario.doors).toHaveLength(4);
    expect(scenario.objects.filter((object) => object.kind === "cover")).toHaveLength(8);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(5);

    const occupied = [...scenario.objects.map((object) => object.position), ...scenario.combatants.map((unit) => unit.position)];
    expect(occupied.every((point) => point.x >= 0 && point.y >= 0 && point.x < scenario.width && point.y < scenario.height)).toBe(true);
    expect(new Set(occupied.map(pointKey)).size).toBe(occupied.length);

    const doorCoveredByWall = scenario.doors.some((door) => scenario.walls.some((wall) => {
      if (door.from.x === door.to.x && wall.from.x === wall.to.x && door.from.x === wall.from.x) return Math.min(door.from.y, door.to.y) >= Math.min(wall.from.y, wall.to.y) && Math.max(door.from.y, door.to.y) <= Math.max(wall.from.y, wall.to.y);
      if (door.from.y === door.to.y && wall.from.y === wall.to.y && door.from.y === wall.from.y) return Math.min(door.from.x, door.to.x) >= Math.min(wall.from.x, wall.to.x) && Math.max(door.from.x, door.to.x) <= Math.max(wall.from.x, wall.to.x);
      return false;
    }));
    expect(doorCoveredByWall).toBe(false);

    const routeExists = (openDoorIds: string[]) => {
      const routeScenario = buildCargoDeckScenario();
      routeScenario.doors.forEach((door) => { door.open = openDoorIds.includes(door.id); });
      routeScenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
      return reachableMovement(routeScenario, "player-1", 60).has(pointKey({ x: 17, y: 7 }));
    };
    expect(routeExists(["airlock-upper", "data-room-upper"])).toBe(true);
    expect(routeExists(["airlock-lower", "data-room-lower"])).toBe(true);
  });

  it("defines a valid 30 by 20 carrier deck with two cross-deck routes", () => {
    const scenario = buildCarrierDeckScenario();
    expect(scenario).toMatchObject({ id: "carrier-deck-assault", width: 30, height: 20 });
    expect(scenario.doors).toHaveLength(6);
    expect(scenario.objects.filter((object) => object.kind === "cover")).toHaveLength(10);
    expect(scenario.combatants.filter((unit) => unit.side === "enemy")).toHaveLength(7);
    expect(validateCombatScenario(scenario)).toEqual([]);

    const routeExists = (openDoorIds: string[]) => {
      const routeScenario = buildCarrierDeckScenario();
      routeScenario.doors.forEach((door) => { door.open = openDoorIds.includes(door.id); });
      routeScenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
      return reachableMovement(routeScenario, "player-1", 100).has(pointKey({ x: 27, y: 10 }));
    };
    expect(routeExists(["entry-upper", "operations-upper", "flight-upper"])).toBe(true);
    expect(routeExists(["entry-lower", "operations-lower", "flight-lower"])).toBe(true);
  });

  it("releases a captive without ending the rescue mission and wins only when the captive extracts", () => {
    const scenario = buildRescueScenario();
    const lead = scenario.combatants.find((unit) => unit.id === "player-1")!;
    lead.position = { x: 14, y: 5 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(lead.id));
    state = reducer(state, previewSecureObjective("prisoner-lock"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("active");
    expect(state.scenario?.objects.find((object) => object.id === "prisoner-lock")?.completed).toBe(true);
    expect(state.scenario?.combatants.find((unit) => unit.id === "captive-1")).toMatchObject({ defeated: false, health: 1, woundState: "healthy" });

    state = {
      ...state,
      scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === "captive-1" ? { ...unit, position: { x: 2, y: 7 } } : unit) },
      actionPointsById: { ...state.actionPointsById, "captive-1": 6 },
      actedCombatantIds: state.actedCombatantIds.filter((id) => id !== "captive-1"),
    };
    state = reducer(state, selectPlayerCombatant("captive-1"));
    state = reducer(state, previewSecureObjective("extraction-zone"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("victory");
    expect(state.events[0]).toBe("Scout Vale reached extraction");
  });

  it("wins when the rescued captive moves onto extraction but not when another player does", () => {
    const scenario = buildRescueScenario();
    scenario.objects.find((object) => object.id === "prisoner-lock")!.completed = true;
    const captive = scenario.combatants.find((unit) => unit.id === "captive-1")!;
    captive.defeated = false;
    captive.health = 1;
    captive.woundState = "healthy";
    captive.position = { x: 2, y: 7 };
    const lead = scenario.combatants.find((unit) => unit.id === "player-1")!;
    lead.position = { x: 2, y: 6 };
    let state = reducer(undefined, loadCombatScenario(scenario));

    state = reducer(state, selectPlayerCombatant(lead.id));
    state = reducer(state, previewMove({ x: 1, y: 6 }));
    state = reducer(state, confirmMove());
    expect(state.status).toBe("active");

    state = reducer(state, selectPlayerCombatant(captive.id));
    state = reducer(state, previewMove({ x: 1, y: 7 }));
    state = reducer(state, confirmMove());
    expect(state.status).toBe("victory");
    expect(state.scenario?.objects.find((object) => object.id === "extraction-zone")?.completed).toBe(true);
    expect(state.events[0]).toBe("Scout Vale reached extraction");
  });

  it("fails only when the released captive is incapacitated", () => {
    const releasedScenario = buildRescueScenario();
    releasedScenario.walls = [];
    releasedScenario.doors = [];
    releasedScenario.objects.find((object) => object.id === "prisoner-lock")!.completed = true;
    const captive = releasedScenario.combatants.find((unit) => unit.id === "captive-1")!;
    captive.defeated = false;
    captive.health = 1;
    captive.woundState = "healthy";
    captive.position = { x: 8, y: 3 };
    const captor = releasedScenario.combatants.find((unit) => unit.id === "enemy-1")!;
    captor.position = { x: 8, y: 4 };
    captor.facing = "north";
    captor.meleeRating = 9;
    captive.meleeRating = 0;
    captive.armorName = "Clothing";
    releasedScenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== "enemy-1").forEach((unit) => { unit.defeated = true; });
    releasedScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
    releasedScenario.combatants.find((unit) => unit.id === "player-2")!.position = { x: 1, y: 2 };

    let state = reducer(undefined, loadCombatScenario(releasedScenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2", "captive-1"] };
    state = reducer(state, endPlayerTurn(lethalEnemyTurn));
    expect(state.status).toBe("defeat");
    expect(state.events[0]).toBe("Rescue failed: Scout Vale was incapacitated before extraction");

    const unreleasedScenario = buildRescueScenario();
    state = reducer(undefined, loadCombatScenario(unreleasedScenario));
    expect(state.status).toBe("active");
    expect(state.scenario?.combatants.find((unit) => unit.id === "captive-1")?.defeated).toBe(true);
    expect(state.scenario?.objects.find((object) => object.id === "prisoner-lock")?.completed).not.toBe(true);
  });

  it("activates defensive reinforcements on schedule and relocates an occupied spawn", () => {
    const scenario = buildHoldAirlockScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 7, y: 1 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && !unit.reinforcementTurn).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.turn).toBe(2);
    const arrivals = state.scenario!.combatants.filter((unit) => unit.reinforcementTurn === 2);
    expect(arrivals.every((unit) => !unit.defeated)).toBe(true);
    expect(arrivals.find((unit) => unit.id === "wave-2-a")?.position).not.toEqual({ x: 7, y: 1 });
    expect(state.events.some((event) => event.includes("arrived as reinforcement"))).toBe(true);
  });

  it("loses when an enemy captures the hold zone and wins after defending through turn five", () => {
    const captured = buildHoldAirlockScenario();
    captured.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 6 };
    captured.combatants.find((unit) => unit.id === "enemy-1")!.meleeRating = 0;
    captured.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(captured));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.status).toBe("defeat");
    expect(state.events[0]).toContain("captured the control zone");

    const held = buildHoldAirlockScenario();
    held.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    state = reducer(undefined, loadCombatScenario(held));
    for (let completedTurns = 1; completedTurns <= 5; completedTurns += 1) {
      state = { ...state, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.side === "enemy" ? { ...unit, defeated: true } : unit) }, actedCombatantIds: ["player-1", "player-2"] };
      state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    }
    expect(state.status).toBe("victory");
    expect(state.events[0]).toBe("Control zone held through turn 5");
  });

  it("moves defensive enemies toward the control zone instead of a distant player", () => {
    const scenario = buildHoldAirlockScenario();
    scenario.walls = [];
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 14, y: 1 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 1, y: 6 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 2, y: 6 });
    expect(state.status).toBe("active");
  });

  it("routes the upper defensive wave through its security door while leaving the lower entrance open", () => {
    const scenario = buildHoldAirlockScenario();
    expect(scenario.doors).toEqual([expect.objectContaining({ id: "upper-bay-security-door", open: false })]);
    const upperWave = scenario.combatants.find((unit) => unit.id === "wave-2-a")!;
    upperWave.defeated = false;
    upperWave.health = 1;
    upperWave.woundState = "healthy";
    upperWave.position = { x: 7, y: 2 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== upperWave.id).forEach((unit) => { unit.defeated = true; });
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 14, y: 5 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.position = { x: 14, y: 7 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, turn: 2, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.doors[0].open).toBe(true);
    expect(state.events.some((event) => event.includes("opened upper-bay-security-door"))).toBe(true);

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.combatants.find((unit) => unit.id === upperWave.id)?.position.y).toBeGreaterThan(2);
  });

  it("opens only a closed door required by the enemy route and navigates through it next turn", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 6;
    scenario.height = 1;
    scenario.walls = [
      { id: "top", from: { x: 0, y: 0 }, to: { x: 6, y: 0 } },
      { id: "bottom", from: { x: 0, y: 1 }, to: { x: 6, y: 1 } },
      { id: "left", from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
      { id: "right", from: { x: 6, y: 0 }, to: { x: 6, y: 1 } },
    ];
    scenario.doors = [{ id: "route-door", from: { x: 3, y: 0 }, to: { x: 3, y: 1 }, open: false }];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 0, y: 0 };
    enemy.position = { x: 3, y: 0 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 0, longRange: 0, extremeRange: 0 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;

    expect(shortestPathToAny(scenario, enemy.id, [{ x: 1, y: 0 }])).toBeNull();
    expect(routeAllowingClosedDoors(scenario, enemy.id, [{ x: 1, y: 0 }])).toMatchObject({ door: { id: "route-door" }, doorStepIndex: 0 });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.doors[0].open).toBe(true);
    expect(state.events.some((event) => event === "Security Guard opened route-door (6 AP)")).toBe(true);

    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).toEqual({ x: 2, y: 0 });
  });

  it("provides distinct weapon ranges, penetration, automatic fire, and armor protection", () => {
    const scenario = buildArmorySweepScenario();
    expect(validateCombatScenario(scenario)).toEqual([]);
    const laser = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const shotgun = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const commander = scenario.combatants.find((unit) => unit.id === "enemy-4")!;
    expect(laser.weapon).toEqual(characterCombatWeapons.laserRifle);
    expect(shotgun.weapon).toEqual(characterCombatWeapons.shotgun);
    expect(commander).toMatchObject({ weapon: characterCombatWeapons.gaussRifle, armor: characterCombatArmor.battleDress.value, armorName: "Battle Dress" });
    expect(characterCombatWeapons.smg.automatic).toBe(true);
    expect(characterCombatWeapons.shotgun.automatic).toBe(false);

    const target = { ...commander, position: { x: 31, y: 4 }, armor: characterCombatArmor.clothing.value };
    laser.position = { x: 1, y: 4 };
    shotgun.position = { x: 1, y: 4 };
    expect(snapShotTarget(laser, target)?.rangeBand).toBe("effective");
    expect(snapShotTarget(shotgun, target)?.rangeBand).toBe("long");

    const lightArmorResult = resolveSnapShot(laser, target, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    const heavyArmorResult = resolveSnapShot(laser, { ...target, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(lightArmorResult.woundTotal).toBeGreaterThan(heavyArmorResult.woundTotal!);
    expect(lightArmorResult.woundState).not.toBe(heavyArmorResult.woundState);
  });

  it("applies laser accuracy, holdout penalties, shotgun falloff, and gauss penetration", () => {
    const scenario = buildArmorySweepScenario();
    const laser = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const shotgun = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    laser.position = { x: 1, y: 1 };
    target.position = { x: 5, y: 1 };
    const laserResult = resolveSnapShot(laser, target, { first: 4, second: 4 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(laserResult.weaponAccuracy).toBe(1);
    expect(laserResult.hitModifier).toBe(laser.weaponSkill + 1);

    const holdoutAttacker = { ...target, position: { x: 1, y: 1 }, weapon: { ...characterCombatWeapons.holdoutPistol } };
    const holdoutResult = resolveSnapShot(holdoutAttacker, { ...laser, position: { x: 6, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(holdoutResult.rangeBand).toBe("long");
    expect(holdoutResult.weaponAccuracy).toBe(-1);

    shotgun.position = { x: 1, y: 1 };
    const closeShotgun = resolveSnapShot(shotgun, { ...target, position: { x: 3, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    const distantShotgun = resolveSnapShot(shotgun, { ...target, position: { x: 22, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(closeShotgun.weaponPenetration).toBe(3);
    expect(distantShotgun.weaponPenetration).toBe(0);

    const gaussAttacker = { ...laser, weapon: { ...characterCombatWeapons.gaussRifle } };
    const gaussResult = resolveSnapShot(gaussAttacker, { ...target, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(gaussResult.weaponPenetration).toBe(6);
    expect(gaussResult.woundTotal).toBe(6);

    const fusionAttacker = { ...laser, position: { x: 1, y: 1 }, weapon: { ...characterCombatWeapons.fusionGun } };
    const effectiveFusion = resolveSnapShot(fusionAttacker, { ...target, position: { x: 201, y: 1 }, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 1, second: 1 }, 0, "aimed")!;
    const longFusion = resolveSnapShot(fusionAttacker, { ...target, position: { x: 202, y: 1 }, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 1, second: 1 }, 0, "aimed")!;
    const extremeFusion = resolveSnapShot(fusionAttacker, { ...target, position: { x: 402, y: 1 }, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 1, second: 1 }, 0, "aimed")!;
    expect([effectiveFusion.weaponPenetration, longFusion.weaponPenetration, extremeFusion.weaponPenetration]).toEqual([14, 10, 6]);
    expect(effectiveFusion).toMatchObject({ woundTotal: 8, woundState: "serious" });
  });

  it("uses AHL 1.5 meter squares for weapon range and penetration bands", () => {
    expect(characterCombatWeapons.holdoutPistol).toMatchObject({ effectiveRange: 4, longRange: 8, extremeRange: 13, penetrationByRange: { effective: 1, long: 0, extreme: 0 } });
    expect(characterCombatWeapons.autopistol).toMatchObject({ effectiveRange: 6, longRange: 13, extremeRange: 33, penetrationByRange: { effective: 1, long: 0, extreme: 0 } });
    expect(characterCombatWeapons.shotgun).toMatchObject({ effectiveRange: 20, longRange: 40, extremeRange: 40, penetrationByRange: { effective: 3, long: 0, extreme: 0 } });
    expect(characterCombatWeapons.smg).toMatchObject({ effectiveRange: 13, longRange: 26, extremeRange: 40, penetrationByRange: { effective: 2, long: 1, extreme: 0 } });
    expect(characterCombatWeapons.laserRifle).toMatchObject({ effectiveRange: 400, longRange: 800, extremeRange: 800, penetrationByRange: { effective: 6, long: 3, extreme: 3 } });
    expect(characterCombatWeapons.gaussRifle).toMatchObject({ effectiveRange: 266, longRange: 533, extremeRange: 533, penetrationByRange: { effective: 6, long: 3, extreme: 3 } });
    expect(characterCombatWeapons.plasmaGun).toMatchObject({ effectiveRange: 200, longRange: 400, extremeRange: 666, penetrationByRange: { effective: 12, long: 8, extreme: 4 } });
    expect(characterCombatWeapons.fusionGun).toMatchObject({ effectiveRange: 200, longRange: 400, extremeRange: 666, penetrationByRange: { effective: 14, long: 10, extreme: 6 } });
  });

  it("stores valid Armory Sweep kits in Redux and applies them without allowing two Heavy kits", () => {
    let state = reducer(undefined, setArmoryLoadout({ index: 0, loadoutId: "heavy" }));
    state = reducer(state, setArmoryLoadout({ index: 1, loadoutId: "heavy" }));
    expect(state.armoryLoadoutIds).toEqual(["heavy", "breacher"]);
    state = reducer(state, setArmoryLoadout({ index: 1, loadoutId: "assault" }));
    expect(state.armoryLoadoutIds).toEqual(["heavy", "assault"]);

    const scenario = applyArmoryLoadouts(buildArmorySweepScenario(), state.armoryLoadoutIds);
    const players = scenario.combatants.filter((unit) => unit.side === "player");
    expect(players[0]).toMatchObject({ weapon: characterCombatWeapons.gaussRifle, armorName: "Battle Dress", armor: 8 });
    expect(players[1]).toMatchObject({ weapon: characterCombatWeapons.smg, armorName: "Combat Armor", armor: 6 });
    state = reducer(state, loadCombatScenario(scenario));
    state = reducer(state, { type: "characterCombat/clearCombatScenario" });
    expect(state.armoryLoadoutIds).toEqual(["heavy", "assault"]);
  });

  it("stores and applies five team loadouts while enforcing one Heavy kit across every slot", () => {
    let state = reducer(undefined, setArmoryLoadout({ index: 2, loadoutId: "assault" }));
    state = reducer(state, setArmoryLoadout({ index: 3, loadoutId: "heavy" }));
    state = reducer(state, setArmoryLoadout({ index: 4, loadoutId: "scout" }));
    state = reducer(state, setArmoryLoadout({ index: 0, loadoutId: "heavy" }));
    expect(state.extendedArmoryLoadoutIds).toEqual(["scout", "breacher", "assault", "heavy", "scout"]);

    const scenario = applyArmoryLoadouts(buildElevatedStrongpointScenario(), state.extendedArmoryLoadoutIds!);
    const players = scenario.combatants.filter((unit) => unit.side === "player");
    expect(players.map((unit) => unit.weapon.name)).toEqual(["Laser Rifle", "Shotgun", "Submachine Gun", "Gauss Rifle", "Laser Rifle"]);
    expect(players.map((unit) => unit.armorName)).toEqual(["Flak Vest", "Combat Armor", "Combat Armor", "Battle Dress", "Flak Vest"]);
  });

  it("derives consistent weapon and armor presentation for both combat boards", () => {
    const scenario = buildArmorySweepScenario();
    const laser = equipmentVisualFor(scenario.combatants.find((unit) => unit.id === "player-1")!);
    const shotgun = equipmentVisualFor(scenario.combatants.find((unit) => unit.id === "player-2")!);
    const heavy = equipmentVisualFor(scenario.combatants.find((unit) => unit.id === "enemy-4")!);
    expect(laser).toMatchObject({ weaponCategory: "laser-rifle", weaponLabel: "LSR", armorClass: "combat" });
    expect(shotgun).toMatchObject({ weaponCategory: "shotgun", weaponLabel: "SG", armorClass: "flak" });
    expect(heavy).toMatchObject({ weaponCategory: "gauss-rifle", weaponLabel: "GSS", armorClass: "battle-dress", armorLabel: "Battle Dress" });
  });

  it("spends ammunition by fire mode, blocks empty weapons, and reloads for 3 AP", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 3, y: 1 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(state.ammunitionById["player-1"]).toBe(12);
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("automatic"));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.ammunitionById["player-1"]).toBe(9);

    state = { ...state, ammunitionById: { ...state.ammunitionById, "player-1": 0 }, actionPointsById: { ...state.actionPointsById, "player-1": 3 }, actedCombatantIds: [] };
    state = reducer(state, reloadWeapon());
    expect(state.ammunitionById["player-1"]).toBe(12);
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.events[0]).toBe("Boarding Lead reloaded (3 AP)");
  });

  it("reloads an empty enemy weapon instead of leaving the enemy stuck", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 3, y: 1 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, ammunitionById: { ...state.ammunitionById, "enemy-1": 0 }, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.ammunitionById["enemy-1"]).toBe(12);
    expect(state.events.some((event) => event === "Security Guard reloaded (3 AP)")).toBe(true);
  });

  it("requires bridge objectives in order, unlocks the door, and preserves ammunition between stages", () => {
    const scenario = buildCaptureBridgeScenario();
    const lead = scenario.combatants.find((unit) => unit.id === "player-1")!;
    lead.position = { x: 15, y: 6 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(lead.id));
    state = reducer(state, previewSecureObjective("bridge-command-console"));
    expect(state.plannedObjectiveId).toBeNull();

    state = { ...state, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === lead.id ? { ...unit, position: { x: 9, y: 4 } } : unit) }, ammunitionById: { ...state.ammunitionById, [lead.id]: 7 } };
    state = reducer(state, previewSecureObjective("bridge-security-console"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("active");
    expect(state.scenario?.objects.find((object) => object.id === "bridge-security-console")?.completed).toBe(true);
    expect(state.scenario?.doors.find((door) => door.id === "locked-bridge-door")).toMatchObject({ open: true, locked: false });
    expect(state.ammunitionById[lead.id]).toBe(7);

    state = { ...state, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === lead.id ? { ...unit, position: { x: 15, y: 6 } } : unit) }, actionPointsById: { ...state.actionPointsById, [lead.id]: 6 }, actedCombatantIds: state.actedCombatantIds.filter((id) => id !== lead.id), selectedCombatantId: lead.id };
    state = reducer(state, previewSecureObjective("bridge-command-console"));
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("victory");
    expect(state.events[0]).toBe("Boarding Lead secured Bridge Command Console");
  });

  it("uses weapon category to decide whether an enemy should improve range", () => {
    const scenario = buildArmorySweepScenario();
    const shotgun = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const smg = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    const laser = scenario.combatants.find((unit) => unit.id === "player-1")!;
    expect(shouldImproveEnemyRange(shotgun, "extreme")).toBe(true);
    expect(shouldImproveEnemyRange(shotgun, "long")).toBe(false);
    expect(shouldImproveEnemyRange(smg, "long")).toBe(true);
    expect(shouldImproveEnemyRange(smg, "effective")).toBe(false);
    expect(shouldImproveEnemyRange(laser, "extreme")).toBe(false);
  });

  it("moves a long-range SMG enemy closer but lets a laser enemy fire from range", () => {
    const makeScenario = (weapon: WeaponProfile) => {
      const scenario = buildTrainingScenario();
      scenario.walls = [];
      scenario.doors = [];
      scenario.objects = [];
      scenario.width = 30;
      scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
      scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
      const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
      enemy.position = { x: 20, y: 1 };
      enemy.weapon = { ...weapon };
      scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
      return scenario;
    };
    let state = reducer(undefined, loadCombatScenario(makeScenario(characterCombatWeapons.smg)));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 19, y: 1 });
    expect(state.events.some((event) => event.startsWith("Security Guard snap fired"))).toBe(true);

    state = reducer(undefined, loadCombatScenario(makeScenario(characterCombatWeapons.laserRifle)));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 20, y: 1 });
    expect(state.events.some((event) => event.startsWith("Security Guard aimed fired"))).toBe(true);
  });

  it("allows AHL grenade targets beyond ten squares for range-modified throws", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const targets = new Set(validGrenadeTargets(scenario, "player-1").map(pointKey));
    expect(targets.has(pointKey({ x: 8, y: 4 }))).toBe(true);
    expect(targets.has(pointKey({ x: 9, y: 4 }))).toBe(true);
    expect(grenadeThrowRangeModifier({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(0);
    expect(grenadeThrowRangeModifier({ x: 0, y: 0 }, { x: 11, y: 0 })).toBe(-1);
    expect(grenadeThrowRangeModifier({ x: 0, y: 0 }, { x: 21, y: 0 })).toBe(-2);
  });

  it("contains grenade blast behind walls and closed doors", () => {
    const scenario = buildTrainingScenario();
    expect(grenadeBlastCells(scenario, { x: 7, y: 3 }).map(pointKey)).not.toContain(pointKey({ x: 8, y: 3 }));
    scenario.doors[0].open = true;
    expect(grenadeBlastCells(scenario, { x: 7, y: 3 }).map(pointKey)).toContain(pointKey({ x: 8, y: 3 }));
  });

  it("contains grenade effects at platform edges but lets them propagate through the access ramp", () => {
    const scenario = buildTerrainTrainingScenario();

    const elevatedBlast = new Set(grenadeBlastCells(scenario, { x: 11, y: 5 }).map(pointKey));
    expect(elevatedBlast.has(pointKey({ x: 12, y: 5 }))).toBe(true);
    expect(elevatedBlast.has(pointKey({ x: 10, y: 5 }))).toBe(false);

    const groundBlast = new Set(grenadeBlastCells(scenario, { x: 10, y: 5 }).map(pointKey));
    expect(groundBlast.has(pointKey({ x: 11, y: 5 }))).toBe(false);

    const rampBlast = new Set(grenadeBlastCells(scenario, { x: 13, y: 5 }).map(pointKey));
    expect(rampBlast.has(pointKey({ x: 13, y: 6 }))).toBe(true);
  });

  it("uses the AHL 8+ throw check and straight and diagonal scatter diagrams", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const target = { x: 5, y: 4 };
    expect(grenadeLandingPoint(scenario, { x: 5, y: 6 }, target, { first: 4, second: 4 }, { first: 1, second: 1 })).toEqual({ landing: target, hit: true });
    expect(grenadeLandingPoint(scenario, { x: 5, y: 6 }, target, { first: 3, second: 4 }, { first: 3, second: 4 }).landing).toEqual({ x: 5, y: 1 });
    expect(grenadeLandingPoint(scenario, { x: 3, y: 2 }, target, { first: 1, second: 1 }, { first: 3, second: 3 }).landing).toEqual({ x: 8, y: 4 });
  });

  it("stops grenade scatter at the map edge", () => {
    const scenario = buildTrainingScenario();
    expect(grenadeLandingPoint(scenario, { x: 1, y: 0 }, { x: 0, y: 0 }, { first: 1, second: 1 }, { first: 3, second: 4 }).landing).toEqual({ x: 0, y: 0 });
    expect(grenadeLandingPoint(scenario, { x: scenario.width - 2, y: 0 }, { x: scenario.width - 1, y: 0 }, { first: 1, second: 1 }, { first: 3, second: 4 }).landing).toEqual({ x: scenario.width - 1, y: 0 });
  });

  it("resolves collateral damage from the scattered landing square", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const ally = scenario.combatants.find((unit) => unit.id === "player-2")!;
    attacker.position = { x: 1, y: 1 };
    ally.position = { x: 5, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget({ x: 3, y: 3 }));
    state = reducer(state, confirmGrenade({
      throwDice: { first: 1, second: 1 }, scatterDice: { first: 3, second: 3 }, occupiedSquareRolls: { "5:3": 1 },
      rollsByCombatantId: { [ally.id]: { first: 6, second: 6 } },
      collateralRolls: { [ally.id]: { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.scenario!.combatants.find((unit) => unit.id === ally.id)?.defeated).toBe(true);
    expect(state.events.some((event) => event.includes("scattered to 5,3"))).toBe(true);
    expect(state.lastGrenadeImpact).toEqual({ kind: "fragmentation", intended: { x: 3, y: 3 }, landing: { x: 5, y: 3 }, scattered: true, blastCells: expect.any(Array) });
    expect(state.lastGrenadeImpact?.blastCells.map(pointKey)).toContain(pointKey({ x: 5, y: 3 }));
  });

  it("clears grenade impact feedback on character selection and scenario reset", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, beginGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget({ x: 3, y: 4 }));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: {} }));
    expect(state.lastGrenadeImpact).not.toBeNull();
    state = reducer(state, selectPlayerCombatant("player-2"));
    expect(state.lastGrenadeImpact).toBeNull();
    state = { ...state, lastGrenadeImpact: { kind: "fragmentation", intended: { x: 3, y: 4 }, landing: { x: 3, y: 4 }, scattered: false, blastCells: [{ x: 3, y: 4 }] } };
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.lastGrenadeImpact).toBeNull();
  });

  it("deploys temporary smoke without damaging occupants", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.smokeGrenades = 1;
    target.position = { x: 3, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginSmokeGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget(target.position));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: { [target.id]: { first: 6, second: 6 } } }));
    expect(state.lastGrenadeImpact?.kind).toBe("smoke");
    expect(state.scenario?.smokeCells?.map(pointKey)).toContain(pointKey(target.position));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.woundState).toBe("healthy");
    expect(state.scenario?.combatants.find((unit) => unit.id === attacker.id)?.smokeGrenades).toBe(0);
    expect(state.smokeClearsAtTurnByCell[pointKey(target.position)]).toBe(4);
  });

  it("uses deployed smoke to block ranged line of sight", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 4 };
    attacker.smokeGrenades = 1;
    target.position = { x: 5, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(rangedEnemies(state.scenario!, attacker.id).map((unit) => unit.id)).toContain(target.id);
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginSmokeGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget({ x: 3, y: 4 }));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: {} }));
    expect(rangedEnemies(state.scenario!, attacker.id).map((unit) => unit.id)).not.toContain(target.id);
  });

  it("clears smoke grenades after three turns and clears their timers on reset", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    attacker.smokeGrenades = 1;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginSmokeGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget({ x: 3, y: 4 }));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: {} }));
    const enemyRolls = { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } };
    for (let index = 0; index < 2; index += 1) {
      state = { ...state, actedCombatantIds: state.scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) };
      state = reducer(state, endPlayerTurn({ enemyRolls }));
    }
    expect(state.scenario?.smokeCells?.length).toBeGreaterThan(0);
    state = { ...state, actedCombatantIds: state.scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) };
    state = reducer(state, endPlayerTurn({ enemyRolls }));
    expect(state.scenario?.smokeCells).toEqual([]);
    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state.smokeClearsAtTurnByCell).toEqual({});
  });

  it("stuns a failed resistance target without causing a wound and skips its next activation", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.stunGrenades = 1;
    target.position = { x: 3, y: 4 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginStunGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget(target.position));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: { [target.id]: { first: 1, second: 1 } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "healthy", stunnedUntilTurn: 2 });
    expect(state.scenario?.combatants.find((unit) => unit.id === attacker.id)?.stunGrenades).toBe(0);
    state = { ...state, actedCombatantIds: state.scenario!.combatants.filter((unit) => unit.side === "player").map((unit) => unit.id) };
    state = reducer(state, endPlayerTurn({ enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }, "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.stunnedUntilTurn).toBeUndefined();
    expect(state.events.some((event) => event.includes(`${target.name} lost activation while stunned`))).toBe(true);
  });

  it("allows armor and a strong resistance roll to defeat a stun grenade", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.stunGrenades = 1;
    target.position = { x: 3, y: 4 };
    target.armor = 4;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginStunGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget(target.position));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: { [target.id]: { first: 3, second: 3 } } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.stunnedUntilTurn).toBeUndefined();
    expect(state.events.some((event) => event.includes(`${target.name} resisted stun 10/8: unaffected`))).toBe(true);
  });

  it("restrains an adjacent stunned enemy without causing a wound and counts surrender victory", () => {
    const scenario = buildTrainingScenario();
    const actor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    actor.position = { x: 4, y: 4 };
    target.position = { x: 5, y: 4 };
    target.stunnedUntilTurn = 2;
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(actor.id));
    state = { ...state, suppressedCombatantIds: [target.id], maintainedTargetByCombatantId: { [actor.id]: target.id, [target.id]: actor.id }, overwatchLanes: [{ attackerId: target.id, target: actor.position, cells: [actor.position] }] };
    state = reducer(state, restrainEnemy(target.id));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ defeated: true, surrendered: true, woundState: "healthy" });
    expect(state.actionPointsById[actor.id]).toBe(3);
    expect(state.suppressedCombatantIds).not.toContain(target.id);
    expect(state.maintainedTargetByCombatantId).toEqual({});
    expect(state.overwatchLanes).toEqual([]);
    expect(state.status).toBe("victory");
    expect(state.outcome?.enemiesSurrendered).toBe(1);
  });

  it("rejects restraint when the enemy is not stunned or not adjacent", () => {
    const scenario = buildTrainingScenario();
    const actor = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    actor.position = { x: 1, y: 1 };
    target.position = { x: 4, y: 1 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(actor.id));
    state = reducer(state, restrainEnemy(target.id));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.surrendered).toBe(false);
    expect(state.actionPointsById[actor.id]).toBe(6);
    state = { ...state, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === target.id ? { ...unit, position: { x: 2, y: 1 }, stunnedUntilTurn: undefined } : unit) } };
    state = reducer(state, restrainEnemy(target.id));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)?.surrendered).toBe(false);
    expect(state.actionPointsById[actor.id]).toBe(6);
  });

  it("resolves grenade friendly fire, armor, cover, inventory, and AP in Redux", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const ally = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 2, y: 2 };
    ally.position = { x: 4, y: 3 };
    enemy.position = { x: 3, y: 2 };
    enemy.armor = 5;
    scenario.objects = [{ id: "blast-cover", kind: "cover", position: { x: 3, y: 3 }, label: "Cargo" }];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, beginGrenadeTargeting());
    state = reducer(state, previewGrenadeTarget({ x: 3, y: 3 }));
    state = reducer(state, confirmGrenade({ rollsByCombatantId: {
      [ally.id]: { first: 4, second: 4 },
      [enemy.id]: { first: 4, second: 4 },
    } }));

    expect(state.scenario?.combatants.find((unit) => unit.id === ally.id)?.woundState).toBe("serious");
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.woundState).toBe("light");
    expect(state.scenario?.combatants.find((unit) => unit.id === attacker.id)?.grenades).toBe(0);
    expect(state.actionPointsById[attacker.id]).toBe(0);
    expect(state.actedCombatantIds).toContain(attacker.id);
    expect(state.grenadeTargeting).toBe(false);
    expect(state.plannedGrenadeTarget).toBeNull();
  });

  it("limits treatment to self or adjacent living wounded allies", () => {
    const scenario = buildTrainingScenario();
    const medic = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const ally = scenario.combatants.find((unit) => unit.id === "player-2")!;
    medic.woundState = "light";
    ally.woundState = "serious";
    ally.defeated = true;
    expect(treatableAllies(scenario, medic.id).map((unit) => unit.id)).toEqual([medic.id, ally.id]);
    ally.position = { x: 8, y: 7 };
    expect(treatableAllies(scenario, medic.id).map((unit) => unit.id)).toEqual([medic.id]);
    medic.woundState = "dead";
    expect(treatableAllies(scenario, medic.id)).toEqual([]);
  });

  it("uses a medkit and six AP to stabilize an incapacitated patient without reactivating them", () => {
    const scenario = buildTrainingScenario();
    const medic = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const patient = scenario.combatants.find((unit) => unit.id === "player-2")!;
    patient.woundState = "unconscious";
    patient.defeated = true;
    patient.health = 0;
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(medic.id));
    state = reducer(state, previewTreatment(patient.id));
    expect(state.plannedTreatmentTargetId).toBe(patient.id);
    state = reducer(state, confirmTreatment());
    expect(state.scenario?.combatants.find((unit) => unit.id === patient.id)).toMatchObject({ woundState: "unconscious", seriousWounds: 1, defeated: true, health: 0 });
    expect(state.recoveringCombatantIds).toEqual([]);
    expect(state.scenario?.combatants.find((unit) => unit.id === medic.id)?.medkits).toBe(0);
    expect(state.actionPointsById[medic.id]).toBe(0);
    expect(state.actedCombatantIds).toContain(medic.id);

    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.turn).toBe(2);
    expect(state.scenario?.combatants.find((unit) => unit.id === patient.id)).toMatchObject({ woundState: "unconscious", seriousWounds: 1, defeated: true, health: 0 });
    expect(state.actionPointsById[patient.id] ?? 0).toBe(0);
    expect(state.recoveringCombatantIds).toEqual([]);
  });

  it("immediately improves an active light wound without scheduling recovery", () => {
    const scenario = buildTrainingScenario();
    const medic = scenario.combatants.find((unit) => unit.id === "player-1")!;
    medic.woundState = "light";
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(medic.id));
    state = reducer(state, previewTreatment(medic.id));
    state = reducer(state, confirmTreatment());
    expect(state.scenario?.combatants.find((unit) => unit.id === medic.id)?.woundState).toBe("healthy");
    expect(state.recoveringCombatantIds).toEqual([]);
  });

  it("shakes a surviving guard after its first failed casualty morale check", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    const guard = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const survivor = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(guard.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      moraleRolls: { [survivor.id]: { first: 1, second: 1 } },
    }));
    expect(state.scenario?.combatants.find((unit) => unit.id === survivor.id)).toMatchObject({ surrendered: false, defeated: false, woundState: "healthy" });
    expect(state.moraleStateByCombatantId?.[survivor.id]).toBe("shaken");
    expect(state.status).toBe("active");
    expect(state.events.some((event) => event.includes("steady → shaken"))).toBe(true);
    expect(state.outcome).toBeNull();
    expect(proposedMoveFor(state.scenario!, "player-1", survivor.position, 4)).toBeNull();
  });

  it("keeps Hull Breach active after every enemy is neutralized or surrendered", () => {
    const scenario = buildHullBreachScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    const guard = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const survivor = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    guard.position = { x: 9, y: 3 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack(guard.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      moraleRolls: { [survivor.id]: { first: 1, second: 1 } },
    }));

    expect(state.moraleStateByCombatantId?.[survivor.id]).toBe("shaken");
    expect(state.scenario?.combatants.find((unit) => unit.id === survivor.id)?.defeated).toBe(false);
    expect(state.status).toBe("active");
    expect(state.outcome).toBeNull();
    expect(state.scenario?.vacuumSources).toHaveLength(1);
  });

  it("keeps Damage Control active after every enemy is neutralized or surrendered", () => {
    const scenario = buildDamageControlScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.fireCells = [{ x: 5, y: 6 }];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const guard = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const survivor = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    player.position = { x: 1, y: 1 };
    guard.position = { x: 2, y: 1 };
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== guard.id && unit.id !== survivor.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewAttack(guard.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      moraleRolls: { [survivor.id]: { first: 1, second: 1 } },
    }));

    expect(state.moraleStateByCombatantId?.[survivor.id]).toBe("shaken");
    expect(state.scenario?.combatants.find((unit) => unit.id === survivor.id)?.defeated).toBe(false);
    expect(state.status).toBe("active");
    expect(state.outcome).toBeNull();
    expect(state.scenario?.fireCells).toHaveLength(1);
  });

  it("keeps a guard active after passing casualty morale", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      moraleRolls: { "enemy-2": { first: 6, second: 6 } },
    }));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-2")).toMatchObject({ surrendered: false, defeated: false });
    expect(state.status).toBe("active");
    expect(state.events).toContain("Ship Crew passed casualty morale 12/9");
  });

  it("lets a designated leader improve a nearby ally's morale by one stage", () => {
    const scenario = buildTrainingScenario();
    const leader = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const ally = scenario.combatants.find((unit) => unit.id === "player-2")!;
    leader.leadershipRating = 2;
    ally.leadershipRating = 0;
    ally.position = { x: leader.position.x + 1, y: leader.position.y };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [ally.id]: "panicked" } };
    state = reducer(state, selectPlayerCombatant(leader.id));
    state = reducer(state, rallyAlly({ targetId: ally.id, dice: { first: 3, second: 3 } }));
    expect(state.moraleStateByCombatantId?.[ally.id]).toBe("shaken");
    expect(state.actionPointsById[leader.id]).toBe(3);
    expect(state.events[0]).toContain("panicked → shaken");
  });

  it("charges a leader 3 AP when an ally rally attempt fails", () => {
    const scenario = buildTrainingScenario();
    const leader = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const ally = scenario.combatants.find((unit) => unit.id === "player-2")!;
    leader.leadershipRating = 1;
    ally.leadershipRating = 0;
    ally.position = { x: leader.position.x + 1, y: leader.position.y };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, moraleStateByCombatantId: { ...state.moraleStateByCombatantId, [ally.id]: "shaken" } };
    state = reducer(state, selectPlayerCombatant(leader.id));
    state = reducer(state, rallyAlly({ targetId: ally.id, dice: { first: 1, second: 1 } }));
    expect(state.moraleStateByCombatantId?.[ally.id]).toBe("shaken");
    expect(state.actionPointsById[leader.id]).toBe(3);
    expect(state.events[0]).toContain("failed to rally");
  });

  it("selects player characters, rejects enemies, and clears selection", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.selectedCombatantId).toBe("player-1");
    state = reducer(state, selectPlayerCombatant("enemy-1"));
    expect(state.selectedCombatantId).toBe("player-1");
    state = reducer(state, selectPlayerCombatant(null));
    expect(state.selectedCombatantId).toBeNull();
  });

  it("calculates facing-aware orthogonal movement around blockers", () => {
    const scenario = buildTrainingScenario();
    const reachable = reachableMovement(scenario, "player-1", 4);
    expect(reachable.get(pointKey({ x: 4, y: 4 }))).toMatchObject({ cost: 4, path: [{ x: 3, y: 4 }, { x: 4, y: 4 }], finalFacing: "east" });
    expect(reachable.has(pointKey({ x: 2, y: 5 }))).toBe(false);
    expect(reachable.has(pointKey({ x: 5, y: 4 }))).toBe(false);
    expect(proposedMoveFor(scenario, "player-1", { x: 8, y: 4 }, 4)).toBeNull();
  });

  it("stores and cancels a validated movement preview without moving the character", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    expect(state.plannedMove).toMatchObject({ combatantId: "player-1", destination: { x: 4, y: 4 }, cost: 4 });
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.position).toEqual({ x: 2, y: 4 });
    state = reducer(state, cancelMovePreview());
    expect(state.plannedMove).toBeNull();
  });

  it("confirms movement, preserves its paid facing, and spends movement AP", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ position: { x: 4, y: 4 }, facing: "east" });
    expect(state.actionPointsById["player-1"]).toBe(2);
    expect(state.events[0]).toContain("Boarding Lead moved to 4,4 (4 AP");
    expect(state.plannedMove).toBeNull();

    state = reducer(state, previewMove({ x: 4, y: 3 }));
    expect(state.plannedMove).toBeNull();
  });

  it("starts a new turn only after both player characters act", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(1);

    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    state = reducer(state, confirmMove());
    state = reducer(state, finishActivation());
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, previewMove({ x: 3, y: 5 }));
    state = reducer(state, confirmMove());
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.turn).toBe(2);
    expect(state.actedCombatantIds).toEqual([]);
    expect(state.selectedCombatantId).toBeNull();
    expect(state.events[0]).toBe("Turn 2 begins");
  });

  it("opens an adjacent door for six AP", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 7, y: 3 };
    expect(closedDoorsAdjacentTo(scenario, player.id).map((door) => door.id)).toEqual(["security-door"]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, openDoor("security-door"));

    expect(state.scenario?.doors[0].open).toBe(true);
    expect(state.actionPointsById[player.id]).toBe(0);
    expect(state.events[0]).toBe("Boarding Lead opened security-door");
    expect(proposedMoveFor(state.scenario!, player.id, { x: 8, y: 3 }, 6)).not.toBeNull();

    expect(state.actedCombatantIds).toContain(player.id);
  });

  it("closes an adjacent open door for three AP", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 7, y: 3 };
    scenario.doors[0].open = true;
    expect(openDoorsAdjacentTo(scenario, player.id).map((door) => door.id)).toEqual(["security-door"]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, closeDoor("security-door"));

    expect(state.scenario?.doors[0].open).toBe(false);
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.events[0]).toBe("Boarding Lead closed security-door (3 AP)");
  });

  it("applies a wound when movement ends in environmental fire", () => {
    const scenario = buildEngineRoomScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 4, y: 4 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 5, y: 4 }));
    state = reducer(state, confirmMove());

    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.woundState).toBe("light");
    expect(state.events[0]).toBe("Boarding Lead entered fire and suffered a light wound");
    expect(state.status).toBe("active");
  });

  it("applies one fire wound at round end when a character remains in fire", () => {
    const scenario = buildEngineRoomScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 5, y: 4 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.woundState).toBe("light");
    expect(state.events.filter((event) => event.includes("Boarding Lead entered fire"))).toHaveLength(1);
  });

  it("does not apply round-end fire damage after a character leaves the fire cell", () => {
    const scenario = buildEngineRoomScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 6, y: 4 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.woundState).toBe("healthy");
  });

  it("incapacitates a lightly wounded character who remains in fire", () => {
    const scenario = buildEngineRoomScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 5, y: 4 };
    player.woundState = "light";
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)).toMatchObject({ woundState: "serious", defeated: true, health: 0 });
    expect(state.status).toBe("active");
  });

  it("blocks ranged line of sight through smoke", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.smokeCells = [{ x: 2, y: 1 }];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 3, y: 1 };

    expect(hasLineOfSight(scenario, player.position, enemy.position)).toBe(false);
    expect(rangedEnemies(scenario, player.id)).not.toContainEqual(expect.objectContaining({ id: enemy.id }));
  });

  it("allows movement through smoke", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.smokeCells = [{ x: 2, y: 1 }];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 1, y: 1 };

    expect(proposedMoveFor(scenario, player.id, { x: 3, y: 1 }, 4)?.path).toContainEqual({ x: 2, y: 1 });
  });

  it("allows adjacent melee when either character is in smoke", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.smokeCells = [{ x: 2, y: 1 }];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 2, y: 1 };

    expect(adjacentEnemies(scenario, player.id)).toContainEqual(expect.objectContaining({ id: enemy.id }));
    expect(rangedEnemies(scenario, player.id)).not.toContainEqual(expect.objectContaining({ id: enemy.id }));
  });

  it("extinguishes adjacent fire for three AP and clears its smoke next turn", () => {
    const scenario = buildEngineRoomScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 4, y: 4 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewExtinguishFire({ x: 5, y: 4 }));
    state = reducer(state, confirmExtinguishFire());

    expect(state.scenario?.fireCells).not.toContainEqual({ x: 5, y: 4 });
    expect(state.scenario?.smokeCells).toContainEqual({ x: 6, y: 4 });
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.smokeClearsAtTurnByCell["6:4"]).toBe(2);

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.scenario?.smokeCells).not.toContainEqual({ x: 6, y: 4 });
    expect(state.smokeClearsAtTurnByCell).toEqual({});
  });

  it("rejects attempts to extinguish distant fire", () => {
    const scenario = buildEngineRoomScenario();
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewExtinguishFire({ x: 8, y: 6 }));
    state = reducer(state, confirmExtinguishFire());

    expect(state.plannedExtinguishFire).toBeNull();
    expect(state.scenario?.fireCells).toContainEqual({ x: 8, y: 6 });
    expect(state.actionPointsById["player-1"]).toBe(6);
  });

  it("tracks Damage Control progress without removing the original critical-fire list", () => {
    const scenario = buildDamageControlScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 4, y: 6 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewExtinguishFire({ x: 5, y: 6 }));
    state = reducer(state, confirmExtinguishFire());

    expect(state.scenario?.criticalFireCells).toHaveLength(3);
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 5, y: 6 });
    expect(state.scenario?.objective).toContain("Critical fires: 1/3 extinguished");
    expect(state.scenario?.objective).not.toContain("5,6");
    expect(state.scenario?.objective).toContain("8,7 · 11,8");
  });

  it("does not count an ordinary Damage Control fire toward mission progress", () => {
    const scenario = buildDamageControlScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 13, y: 6 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewExtinguishFire({ x: 14, y: 6 }));
    state = reducer(state, confirmExtinguishFire());

    expect(state.scenario?.fireCells).not.toContainEqual({ x: 14, y: 6 });
    expect(state.scenario?.objective).toContain("Critical fires: 0/3 extinguished");
    expect(state.scenario?.objective).toContain("Remaining: 5,6 · 8,7 · 11,8");
  });

  it("advances from the turn-three spread threat to the turn-five spread threat", () => {
    const scenario = buildDamageControlScenario();
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 7, y: 7 });
    expect(state.scenario?.objective).toContain("Turn 3 spread threat: critical fire 8,7");

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 7, y: 7 });

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(3);
    expect(state.scenario?.fireCells).toContainEqual({ x: 7, y: 7 });
    expect(state.scenario?.smokeCells).toContainEqual({ x: 7, y: 6 });
    expect(state.events).toContain("Fire spread from 8,7 to 7,7; smoke at 7,6");
    expect(state.scenario?.objective).toContain("Turn 5 spread threat: critical fire 11,8");

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(4);
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 10, y: 8 });
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(5);
    expect(state.scenario?.fireCells).toContainEqual({ x: 10, y: 8 });
    expect(state.scenario?.smokeCells).toContainEqual({ x: 10, y: 7 });
    expect(state.events).toContain("Fire spread from 11,8 to 10,8; smoke at 10,7");
    expect(state.scenario?.objective).not.toContain("spread threat");

    state = reducer(state, loadCombatScenario(buildDamageControlScenario()));
    expect(state).toMatchObject({ turn: 1, events: [] });
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 7, y: 7 });
    expect(state.scenario?.smokeCells).not.toContainEqual({ x: 7, y: 6 });
    expect(state.scenario?.objective).toContain("Turn 3 spread threat: critical fire 8,7");
  });

  it("prevents the turn-three spread when its critical source is extinguished", () => {
    const scenario = buildDamageControlScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 7, y: 7 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewExtinguishFire({ x: 8, y: 7 }));
    state = reducer(state, confirmExtinguishFire());
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 8, y: 7 });

    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.turn).toBe(3);
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 7, y: 7 });
    expect(state.scenario?.smokeCells).not.toContainEqual({ x: 7, y: 6 });
    expect(state.events).toContain("Fire spread prevented: source 8,7 was extinguished");
  });

  it("prevents the turn-five spread when its critical source is extinguished", () => {
    const scenario = buildDamageControlScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 10, y: 8 };
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewExtinguishFire({ x: 11, y: 8 }));
    state = reducer(state, confirmExtinguishFire());
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 11, y: 8 });

    for (let turn = 2; turn <= 5; turn += 1) {
      state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
      state = reducer(state, endPlayerTurn(missEnemyTurn));
    }

    expect(state.turn).toBe(5);
    expect(state.scenario?.fireCells).not.toContainEqual({ x: 10, y: 8 });
    expect(state.scenario?.smokeCells).not.toContainEqual({ x: 10, y: 7 });
    expect(state.events).toContain("Fire spread prevented: source 11,8 was extinguished");
  });

  it("loses Damage Control at the turn-seven engineering cascade deadline", () => {
    const scenario = buildDamageControlScenario();
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    expect(state.scenario?.objective).toContain("Engineering cascade: Turn 7");

    for (let turn = 2; turn <= 7; turn += 1) {
      state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
      state = reducer(state, endPlayerTurn(missEnemyTurn));
    }

    expect(state).toMatchObject({ turn: 7, status: "defeat", selectedCombatantId: null });
    expect(state.events[0]).toBe("Engineering cascade: critical fires were not contained by turn 7");
    expect(state.outcome).toMatchObject({ result: "defeat", scenarioTitle: "Damage Control", turn: 7 });

    state = reducer(state, loadCombatScenario(buildDamageControlScenario()));
    expect(state).toMatchObject({ turn: 1, status: "active", outcome: null, events: [] });
    expect(state.scenario?.objective).toContain("Engineering cascade: Turn 7");
  });

  it("continues Damage Control after containing every critical fire before turn seven", () => {
    const scenario = buildDamageControlScenario();
    const criticalKeys = new Set(scenario.criticalFireCells?.map(pointKey));
    scenario.fireCells = scenario.fireCells?.filter((fire) => !criticalKeys.has(pointKey(fire)));
    scenario.combatants.filter((unit) => unit.side === "enemy").forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));

    for (let turn = 2; turn <= 7; turn += 1) {
      state = { ...state, actedCombatantIds: ["player-1", "player-2"] };
      state = reducer(state, endPlayerTurn(missEnemyTurn));
    }

    expect(state).toMatchObject({ turn: 7, status: "active", outcome: null });
    expect(state.events).toContain("Engineering cascade contained; restore the damage-control console");
    expect(state.scenario?.objective).toContain("Engineering cascade contained");
  });

  it("keeps the Damage Control console unavailable while critical fire remains", () => {
    const scenario = buildDamageControlScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 17, y: 7 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("damage-control-console"));
    state = reducer(state, confirmSecureObjective());

    expect(state.plannedObjectiveId).toBeNull();
    expect(state.status).toBe("active");
    expect(state.actionPointsById[player.id]).toBe(6);
  });

  it("wins Damage Control by restoring the console after all critical fires are out", () => {
    const scenario = buildDamageControlScenario();
    const criticalKeys = new Set(scenario.criticalFireCells?.map(pointKey));
    scenario.fireCells = scenario.fireCells?.filter((fire) => !criticalKeys.has(pointKey(fire)));
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 17, y: 7 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("damage-control-console"));
    state = reducer(state, confirmSecureObjective());

    expect(state.status).toBe("victory");
    expect(state.actionPointsById[player.id]).toBe(0);
    expect(state.outcome).toMatchObject({ result: "victory", scenarioTitle: "Damage Control" });
  });

  it("seals the hull breach, restores pressure, and preserves existing wounds", () => {
    const scenario = buildHullBreachScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const console = scenario.objects.find((object) => object.id === "command-console")!;
    player.position = { x: console.position.x - 1, y: console.position.y };
    player.woundState = "light";

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, vacuumExposureByCombatantId: { [player.id]: 2 } };
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective(console.id));
    state = reducer(state, confirmSecureObjective());

    expect(state.status).toBe("victory");
    expect(state.scenario?.vacuumSources).toEqual([]);
    expect(depressurizedCells(state.scenario!).size).toBe(0);
    expect(state.vacuumExposureByCombatantId).toEqual({});
    expect(state.scenario?.combatants.find((unit) => unit.id === player.id)?.woundState).toBe("light");
    expect(state.events[0]).toContain("sealed the hull breach");
  });

  it("previews and confirms an adjacent attack, consumes the action, and clears the defeated blocker", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 8, y: 3 };
    scenario.doors[0].open = true;
    expect(adjacentEnemies(scenario, player.id).map((unit) => unit.id)).toEqual(["enemy-1"]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("aimed"));
    expect(state.plannedAttackTargetId).toBe("enemy-1");
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    const target = state.scenario?.combatants.find((unit) => unit.id === "enemy-1");
    expect(target).toMatchObject({ health: 0, defeated: true });
    expect(state.maintainedTargetByCombatantId[player.id]).toBeUndefined();
    expect(state.actedCombatantIds).toContain(player.id);
    expect(state.events[0]).toContain("Boarding Lead");
    expect(proposedMoveFor(state.scenario!, player.id, { x: 9, y: 3 }, 6)).not.toBeNull();
  });

  it("secures an adjacent console, records victory, locks actions, and restarts cleanly", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 9, y: 4 };
    expect(adjacentObjectives(scenario, player.id).map((objective) => objective.id)).toEqual(["command-console"]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("command-console"));
    expect(state.plannedObjectiveId).toBe("command-console");
    state = reducer(state, confirmSecureObjective());
    expect(state.status).toBe("victory");
    expect(state.events[0]).toBe("Boarding Lead secured Command Console");
    expect(state.outcome).toMatchObject({ result: "victory", scenarioTitle: "Boarding Action", turn: 1, campaignChangesApplied: false });

    state = reducer(state, selectPlayerCombatant("player-2"));
    expect(state.selectedCombatantId).toBeNull();

    state = reducer(state, loadCombatScenario(buildTrainingScenario()));
    expect(state).toMatchObject({ status: "active", turn: 1, selectedCombatantId: null, actedCombatantIds: [], events: [], outcome: null });
  });

  it("summarizes campaign identity, wounds, and consumed resources without applying changes", () => {
    const scenario = buildTrainingScenario();
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.position = { x: 9, y: 4 };
    player.sourceCrewId = "crew-1";
    player.sourceCharacterId = "character-1";
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === player.id ? { ...unit, woundState: "light", grenades: 0, medkits: 0 } : unit) } };
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewSecureObjective("command-console"));
    state = reducer(state, confirmSecureObjective());
    expect(state.outcome?.members.find((member) => member.id === player.id)).toMatchObject({ sourceCrewId: "crew-1", sourceCharacterId: "character-1", condition: "wounded", woundState: "light", grenadesUsed: 1, medkitsUsed: 1 });
    expect(state.outcome?.campaignChangesApplied).toBe(false);
  });

  it("has a distant enemy trot toward the nearest player without attacking", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 11, y: 6 };
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).not.toEqual({ x: 11, y: 6 });
    expect(state.events.some((event) => event.startsWith("Security Guard trotted to"))).toBe(true);
    expect(state.events.some((event) => event.startsWith("Security Guard snap fired"))).toBe(false);
  });

  it("makes enemy movement take a safe alternate route around fire", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 6;
    scenario.height = 3;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.fireCells = [{ x: 1, y: 1 }];
    scenario.smokeCells = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 5, y: 1 };
    enemy.position = { x: 0, y: 1 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).not.toEqual({ x: 1, y: 1 });
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.woundState).toBe("healthy");
  });

  it("makes enemy ranged fire prefer a standing target over an equally distant prone target", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const prone = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const standing = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    prone.position = { x: 2, y: 5 };
    prone.posture = "prone";
    standing.position = { x: 5, y: 2 };
    enemy.position = { x: 5, y: 5 };
    enemy.facing = "north";
    scenario.combatants.filter((unit) => unit.side === "enemy" && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [prone.id, standing.id] };

    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.events.some((event) => event.includes(`${enemy.name}`) && event.includes(standing.name))).toBe(true);
    expect(state.events.some((event) => event.includes(`${enemy.name}`) && event.includes(prone.name))).toBe(false);
  });

  it("makes enemy target scoring account for cover before using distance as a tie-breaker", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const covered = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const exposed = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    covered.position = { x: 2, y: 5 };
    exposed.position = { x: 5, y: 2 };
    enemy.position = { x: 5, y: 5 };
    scenario.objects = [{ id: "target-cover", kind: "cover", position: { x: 3, y: 5 }, label: "Cover" }];

    expect(compareEnemyRangedTargets(scenario, enemy, covered, exposed, [])).toBeGreaterThan(0);
    scenario.objects = [];
    covered.position = { x: 3, y: 5 };
    expect(compareEnemyRangedTargets(scenario, enemy, covered, exposed, [])).toBeLessThan(0);
  });

  it("still lets enemy ranged fire target a prone character when it is the only valid target", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const prone = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    prone.position = { x: 2, y: 4 };
    prone.posture = "prone";
    enemy.position = { x: 5, y: 4 };
    scenario.combatants.filter((unit) => unit.id !== prone.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [prone.id] };

    state = reducer(state, endPlayerTurn({ enemyRolls: { [enemy.id]: { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } }));

    expect(state.events.some((event) => event.includes(`${enemy.name}`) && event.includes(prone.name))).toBe(true);
  });

  it("lets an enemy cross unavoidable fire and applies injury when movement ends there", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 4;
    scenario.height = 1;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    scenario.fireCells = [{ x: 1, y: 0 }];
    scenario.smokeCells = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 3, y: 0 };
    enemy.position = { x: 0, y: 0 };
    enemy.facing = "east";
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)).toMatchObject({ position: { x: 1, y: 0 }, woundState: "serious", defeated: true });
    expect(state.events).toContain(`${enemy.name} entered fire and suffered a light wound`);
  });

  it("finds a deterministic full-map route around a wall and limits enemy movement to three steps", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 9;
    scenario.height = 7;
    scenario.walls = [{ id: "long-wall", from: { x: 4, y: 0 }, to: { x: 4, y: 6 } }];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 6, y: 2 };
    enemy.position = { x: 2, y: 2 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;

    const goals = [{ x: 5, y: 2 }, { x: 6, y: 3 }, { x: 7, y: 2 }, { x: 6, y: 1 }];
    const route = shortestPathToAny(scenario, enemy.id, goals);
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(3);
    expect(route).toEqual(shortestPathToAny(scenario, enemy.id, goals));

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    const movedEnemy = state.scenario!.combatants.find((unit) => unit.id === enemy.id)!;
    expect(movedEnemy.position).toEqual({ x: 2, y: 3 });
    expect(state.events.some((event) => event.includes("(3 AP)"))).toBe(true);
  });

  it("does not path through closed doors, cover, or active combatants", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 5;
    scenario.height = 3;
    scenario.walls = [
      { id: "top", from: { x: 0, y: 1 }, to: { x: 5, y: 1 } },
      { id: "bottom", from: { x: 0, y: 2 }, to: { x: 5, y: 2 } },
    ];
    scenario.doors = [{ id: "gate", from: { x: 2, y: 1 }, to: { x: 2, y: 2 }, open: false }];
    scenario.objects = [];
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    enemy.position = { x: 0, y: 1 };
    scenario.combatants.filter((unit) => unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    expect(shortestPathToAny(scenario, enemy.id, [{ x: 4, y: 1 }])).toBeNull();
    scenario.doors[0].open = true;
    expect(shortestPathToAny(scenario, enemy.id, [{ x: 4, y: 1 }])).toHaveLength(4);
    scenario.objects = [{ id: "crate", kind: "cover", position: { x: 3, y: 1 }, label: "Crate" }];
    expect(shortestPathToAny(scenario, enemy.id, [{ x: 4, y: 1 }])).toBeNull();
  });

  it("resolves adjacent enemy attacks and records defeat when no players remain", () => {
    const scenario = buildTrainingScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(lethalEnemyTurn));
    expect(state.status).toBe("defeat");
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ health: 0, defeated: true });
    expect(state.events.some((event) => event.includes("Security Guard") && (event.includes("AHL melee") || event.includes("fired")))).toBe(true);
    expect(state.events[0]).toBe("Boarding team defeated");
    expect(state.outcome).toMatchObject({ result: "defeat", enemiesNeutralized: 0, enemiesSurrendered: 0 });
  });

  it("blocks adjacent attacks through walls and closed doors but allows them through open doors", () => {
    const wallScenario = buildTrainingScenario();
    wallScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 3, y: 3 };
    wallScenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 4, y: 3 };
    expect(adjacentEnemies(wallScenario, "player-1")).toEqual([]);

    const doorScenario = buildTrainingScenario();
    doorScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 7, y: 3 };
    doorScenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 3 };
    expect(adjacentEnemies(doorScenario, "player-1")).toEqual([]);
    doorScenario.doors[0].open = true;
    expect(adjacentEnemies(doorScenario, "player-1").map((unit) => unit.id)).toEqual(["enemy-1"]);
  });

  it("prevents an enemy from killing a player through a closed door", () => {
    const scenario = buildTrainingScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 7, y: 3 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ health: 1, defeated: false });
    expect(state.status).toBe("active");
  });

  it("uses weapon range bands, skill, armor, and injected dice for snap shots", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 8, y: 3 };
    expect(snapShotTarget(attacker, target)).toMatchObject({ range: 1, rangeBand: "effective", targetNumber: 8 });
    expect(resolveSnapShot(attacker, target, { first: 1, second: 1 }, { first: 6, second: 6 })).toMatchObject({ hit: false, hitTotal: 1, woundRoll: null });
    expect(resolveSnapShot(attacker, target, { first: 5, second: 4 }, { first: 3, second: 3 })).toMatchObject({ hit: true, hitTotal: 8, woundTotal: 6, woundState: "light" });
  });

  it("stores only valid board-selected attack targets", () => {
    const scenario = buildTrainingScenario();
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 7, y: 3 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 3 };
    scenario.doors[0].open = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    expect(state.plannedAttackTargetId).toBe("enemy-1");
  });

  it("applies cargo cover only when it lies between the attacker and adjacent target", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 4, y: 4 };
    target.position = { x: 6, y: 4 };
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(2);
    const uncovered = resolveSnapShot(attacker, target, { first: 6, second: 6 }, { first: 4, second: 4 }, 0)!;
    const covered = resolveSnapShot(attacker, target, { first: 6, second: 6 }, { first: 4, second: 4 }, 2)!;
    expect(covered).toMatchObject({ cover: 2, woundTotal: 10, woundState: "serious", hitTotal: uncovered.hitTotal - 2, targetNumber: uncovered.targetNumber });
    expect(covered.woundTotal).toBe((uncovered.woundTotal ?? 0) + 2);
    expect(resolveSnapShot(attacker, target, { first: 4, second: 3 }, { first: 4, second: 4 }, 0, "aimed")).toMatchObject({ hit: true, hitTotal: 8 });
    expect(resolveSnapShot(attacker, target, { first: 4, second: 3 }, { first: 4, second: 4 }, 2, "aimed")).toMatchObject({ hit: false, hitTotal: 6, woundRoll: null });

    attacker.position = { x: 7, y: 4 };
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(0);
  });

  it("maps every wound band and incapacitates serious wounds without blocking movement", () => {
    expect([4, 5, 7, 8, 11, 12].map(woundStateForTotal)).toEqual(["healthy", "light", "light", "serious", "serious", "dead"]);
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 4, second: 3 }, woundDice: { first: 5, second: 4 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "serious", defeated: true });
    expect(proposedMoveFor(state.scenario!, attacker.id, target.position, 6)).not.toBeNull();
  });

  it("spends AP on movement and snap fire, rejects unaffordable aimed fire, and finishes activation", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    scenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 10, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 8, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.actionPointsById["player-1"]).toBe(3);

    state = reducer(state, turnCombatant("left"));
    expect(state.actionPointsById["player-1"]).toBe(2);

    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById["player-1"]).toBe(2);
    expect(state.plannedAttackTargetId).toBe("enemy-1");

    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById["player-1"]).toBe(2);
    state = reducer(state, finishActivation());
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
  });

  it("resolves core AHL melee for no AP and rejects melee through a closed door", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    attacker.meleeRating = 7;
    target.position = { x: 2, y: 1 };
    target.meleeRating = 0;
    target.armorName = "Clothing";
    expect(resolveAhlMelee(attacker, target, 6)).toMatchObject({ differential: 7, tableDifferential: 7, effect: "dead" });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.actionPointsById[attacker.id]).toBe(6);
    expect(state.actedCombatantIds).toContain(attacker.id);
    expect(state.ahlMeleeDeclarations).toHaveLength(1);
    state = { ...state, actedCombatantIds: state.scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "dead", defeated: true });

    const blocked = buildTrainingScenario();
    blocked.combatants.find((unit) => unit.id === attacker.id)!.position = { x: 7, y: 3 };
    blocked.combatants.find((unit) => unit.id === target.id)!.position = { x: 8, y: 3 };
    state = reducer(undefined, loadCombatScenario(blocked));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    expect(state.plannedAttackTargetId).toBeNull();
  });

  it("uses AHL front diagonals, same-square engagement, armor shifts, and same-square modifiers", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 4, y: 4 };
    attacker.facing = "north";
    target.position = { x: 3, y: 3 };
    expect(meleeEnemies(scenario, attacker.id).map((unit) => unit.id)).toContain(target.id);
    target.position = { x: 4, y: 5 };
    expect(meleeEnemies(scenario, attacker.id).map((unit) => unit.id)).not.toContain(target.id);
    target.position = { ...attacker.position };
    expect(meleeEnemies(scenario, attacker.id).map((unit) => unit.id)).toContain(target.id);
    attacker.meleeRating = 9;
    target.meleeRating = 0;
    target.armorName = "Combat Armor";
    expect(resolveAhlMelee(attacker, target, 6, true)).toMatchObject({ tableDifferential: 5, armorColumnShift: 2, modifiedRoll: 5, effect: "unconscious" });
  });

  it("dives into an enemy square at the end of a trot and applies the AHL +2 modifier", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== attacker.id && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    target.position = { x: 4, y: 1 };
    const option = ahlMeleeDiveMoves(scenario, attacker.id).get(target.id);
    expect(option).toMatchObject({ destination: target.position, kind: "melee-dive", meleeTargetId: target.id });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, startTrot());
    state = reducer(state, previewAhlMeleeDive(target.id));
    expect(state.plannedMove?.kind).toBe("melee-dive");
    state = reducer(state, confirmMove({ hitDice: { first: 4, second: 1 }, woundDice: { first: 4, second: 1 } }));

    expect(state.scenario!.combatants.find((unit) => unit.id === attacker.id)?.position).toEqual(target.position);
    expect(state.actionPointsById[attacker.id]).toBe(0);
    expect(state.ahlMeleeDeclarations).toHaveLength(1);
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.events.some((event) => event.includes("roll 4 → 6"))).toBe(true);
  });

  it("enters an enemy square with ordinary movement, stops moving, and offers unmodified same-square melee", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    target.position = { x: 2, y: 1 };
    scenario.combatants.filter((unit) => unit.id !== attacker.id && unit.id !== target.id).forEach((unit) => { unit.defeated = true; });

    const entry = reachableMovement(scenario, attacker.id, 6, false, 4).get(pointKey(target.position));
    expect(entry).toMatchObject({ kind: "enemy-entry", destination: target.position, cost: 2, path: [target.position] });
    expect([...reachableMovement(scenario, attacker.id, 6, true, 6).values()].some((move) => move.kind === "enemy-entry")).toBe(false);
    expect(reachableMovement(scenario, target.id, 6, false, 4).get(pointKey(attacker.position))?.kind).toBe("enemy-entry");

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewMove(target.position));
    state = reducer(state, confirmMove({ hitDice: { first: 4, second: 1 }, woundDice: { first: 4, second: 1 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === attacker.id)?.position).toEqual(target.position);
    expect(state.actionPointsById[attacker.id]).toBe(4);
    expect(state.enemySquareEnteredCombatantIds).toContain(attacker.id);
    state = reducer(state, previewMove({ x: 3, y: 1 }));
    expect(state.plannedMove).toBeNull();

    state = reducer(state, previewMeleeAttack(target.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 4, second: 1 }, woundDice: { first: 4, second: 1 } }));
    expect(state.ahlMeleeDeclarations).toContainEqual(expect.objectContaining({ attackerId: attacker.id, targetId: target.id, sameSquare: true, attackerDived: false }));
  });

  it("limits an enemy-occupied square to four active characters", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const mover = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const destination = { x: 2, y: 2 };
    mover.position = { x: 1, y: 2 };
    mover.facing = "east";
    const existingOccupants = scenario.combatants.filter((unit) => unit.id !== mover.id);
    const extraOccupant = { ...existingOccupants[0], id: "stack-extra", name: "Stack Extra", position: destination };
    scenario.combatants.push(extraOccupant);
    const occupants = [...existingOccupants, extraOccupant].slice(0, 4);
    occupants.forEach((unit) => { unit.position = destination; unit.defeated = false; });
    occupants[0].side = "enemy";
    occupants[1].side = "player";
    occupants[2].side = "enemy";
    occupants[3].defeated = true;
    expect(reachableMovement(scenario, mover.id, 6).get(pointKey(destination))?.kind).toBe("enemy-entry");
    occupants[3].defeated = false;
    expect(reachableMovement(scenario, mover.id, 6).has(pointKey(destination))).toBe(false);
  });

  it("queues two attackers against one defender and resolves every allocation simultaneously", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const first = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const second = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => unit.id !== first.id && unit.id !== second.id && unit.id !== defender.id).forEach((unit) => { unit.defeated = true; });
    first.position = { x: 1, y: 2 };
    first.facing = "east";
    second.position = { x: 2, y: 3 };
    second.facing = "north";
    defender.position = { x: 2, y: 2 };
    first.meleeRating = 9;
    second.meleeRating = 7;
    defender.meleeRating = 0;
    defender.armorName = undefined;
    defender.vaccSuit = false;

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(first.id));
    state = reducer(state, previewMeleeAttack(defender.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 } }));
    state = reducer(state, selectPlayerCombatant(second.id));
    state = reducer(state, previewMeleeAttack(defender.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 2 }, woundDice: { first: 1, second: 1 } }));

    expect(state.ahlMeleeDeclarations).toHaveLength(2);
    expect(state.scenario!.combatants.find((unit) => unit.id === defender.id)?.woundState).toBe("healthy");
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.ahlMeleeDeclarations).toEqual([]);
    expect(state.scenario!.combatants.find((unit) => unit.id === defender.id)).toMatchObject({ woundState: "dead", defeated: true });
    expect(state.events.filter((event) => event.includes(`→ ${defender.name}`))).toHaveLength(2);
  });

  it("pauses after player melee resolution before another guard can act", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const inactivePlayer = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const defender = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const otherGuard = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    inactivePlayer.defeated = true;
    attacker.position = { x: 1, y: 1 };
    defender.position = { x: 2, y: 1 };
    otherGuard.position = { x: 7, y: 4 };
    attacker.meleeRating = defender.meleeRating;

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewMeleeAttack(defender.id));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    const guardPositionBeforeResolution = { ...state.scenario!.combatants.find((unit) => unit.id === otherGuard.id)!.position };
    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.awaitingAhlMeleeAcknowledgement).toBe(true);
    expect(state.lastAhlMeleeResults).not.toHaveLength(0);
    expect(state.lastResolvedAhlMeleeDeclarations).toHaveLength(1);
    expect(state.processedEnemyPhaseCombatantIds).not.toContain(otherGuard.id);
    expect(state.scenario!.combatants.find((unit) => unit.id === otherGuard.id)!.position).toEqual(guardPositionBeforeResolution);

    state = reducer(state, acknowledgeAhlMeleeResolution());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.awaitingAhlMeleeAcknowledgement).toBe(false);
    expect(state.lastResolvedAhlMeleeDeclarations).toEqual([]);
    expect(state.turn).toBe(2);
  });

  it("allows two enemies to attack one defender while allocating only one defender response", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const defender = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const first = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const second = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    scenario.combatants.filter((unit) => unit.id !== defender.id && unit.id !== first.id && unit.id !== second.id).forEach((unit) => { unit.defeated = true; });
    defender.position = { x: 2, y: 2 };
    defender.facing = "south";
    defender.meleeRating = 0;
    first.position = { x: 1, y: 2 };
    first.facing = "east";
    second.position = { x: 2, y: 3 };
    second.facing = "north";
    first.meleeRating = 9;
    second.meleeRating = 7;
    first.weaponSkill = 0;
    second.weaponSkill = 0;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [defender.id] };
    state = reducer(state, endPlayerTurn({ enemyRolls: {
      [first.id]: { hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 } },
      [second.id]: { hitDice: { first: 6, second: 2 }, woundDice: { first: 1, second: 1 } },
    } }));
    expect(state.events.filter((event) => event.includes(`→ ${defender.name}`))).toHaveLength(2);
    expect(state.events.filter((event) => event.startsWith(`${defender.name} →`))).toHaveLength(1);
  });

  it("maintains an active ranged target across turns and clears an incapacitated target", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.maintainedTargetByCombatantId["player-1"]).toBe("enemy-1");
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.plannedAttackTargetId).toBe("enemy-1");
    state = reducer(state, finishActivation());
    expect(state.plannedAttackTargetId).toBeNull();
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
  });

  it("clears a maintained target without spending AP and restores normal actions", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = {
      ...state,
      plannedAttackTargetId: "enemy-1",
      maintainedTargetByCombatantId: { "player-1": "enemy-1" },
    };

    state = reducer(state, clearTarget());
    expect(state.plannedAttackTargetId).toBeNull();
    expect(state.maintainedTargetByCombatantId["player-1"]).toBeUndefined();
    expect(state.actionPointsById["player-1"]).toBe(6);

    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, selectPlayerCombatant("player-1"));
    expect(state.plannedAttackTargetId).toBeNull();
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).toContain("player-1");
  });

  it("automatically completes activation when movement spends the final AP", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = { ...state, actionPointsById: { ...state.actionPointsById, "player-1": 2 } };
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
  });

  it("applies automatic-fire capability, six AP cost, and the AHL +4 hit modifier", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("automatic"));
    state = reducer(state, confirmAttack({ hitDice: { first: 2, second: 2 }, woundDice: { first: 2, second: 2 } }));
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.events[0]).toContain("automatic fired");
    expect(state.events[0]).toContain("hit 9/8");

    const pistolScenario = buildTrainingScenario();
    pistolScenario.doors[0].open = true;
    pistolScenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 3 };
    pistolScenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 7, y: 3 };
    state = reducer(undefined, loadCombatScenario(pistolScenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    expect(pistolScenario.combatants.find((unit) => unit.id === "enemy-1")!.weapon.automatic).toBe(false);
  });

  it("applies the SMG's printed AHL automatic-fire modifiers at every range", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 0, y: 0 };
    attacker.weapon = { ...characterCombatWeapons.smg };
    target.position = { x: 13, y: 0 };
    const effective = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "automatic")!;
    target.position = { x: 14, y: 0 };
    const long = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "automatic")!;
    target.position = { x: 27, y: 0 };
    const extreme = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "automatic");

    expect(automaticFireModifierForRange("effective", attacker.weapon.automaticFireBonusByRange)).toBe(4);
    expect(automaticFireModifierForRange("long", attacker.weapon.automaticFireBonusByRange)).toBe(3);
    expect(automaticFireModifierForRange("extreme", attacker.weapon.automaticFireBonusByRange)).toBe(1);
    expect(effective.hitModifier - attacker.weaponSkill).toBe(4);
    expect(long.hitModifier - attacker.weaponSkill).toBe(3);
    expect(extreme!.hitModifier - attacker.weaponSkill).toBe(1);
  });

  it("applies the shotgun's printed automatic bonus without selecting automatic fire", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 0, y: 0 };
    attacker.weapon = { ...characterCombatWeapons.shotgun };
    target.position = { x: 20, y: 0 };
    const effective = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "aimed")!;
    target.position = { x: 21, y: 0 };
    const long = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "aimed")!;

    expect(effective.hitModifier - attacker.weaponSkill).toBe(5);
    expect(long.hitModifier - attacker.weaponSkill).toBe(2);
  });

  it("applies the gauss rifle's printed automatic bonuses", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 0, y: 0 };
    attacker.weapon = { ...characterCombatWeapons.gaussRifle };
    target.position = { x: 266, y: 0 };
    const effective = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "automatic")!;
    target.position = { x: 267, y: 0 };
    const long = resolveSnapShot(attacker, target, { first: 3, second: 3 }, { first: 1, second: 1 }, 0, "automatic")!;

    expect(effective.hitModifier - attacker.weaponSkill).toBe(3);
    expect(long.hitModifier - attacker.weaponSkill).toBe(2);
  });

  it("lets player state select SMG automatic fire against an extreme-range target", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 50;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 1, y: 1 };
    attacker.weapon = { ...characterCombatWeapons.smg };
    target.position = { x: 28, y: 1 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("automatic"));
    expect(state.plannedAttackMode).toBe("automatic");
  });

  it("resolves automatic danger-space targets in order and stops after the second hit", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 20;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const friendly = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const primary = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const secondary = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    attacker.weapon = { ...characterCombatWeapons.smg };
    attacker.weaponSkill = 0;
    primary.position = { x: 4, y: 1 };
    friendly.position = { x: 6, y: 1 };
    friendly.facing = "west";
    secondary.position = { x: 8, y: 1 };
    expect(automaticFireSecondaryTargets(scenario, attacker.id, primary.id).map((unit) => unit.id)).toEqual([friendly.id, secondary.id]);

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(primary.id));
    state = reducer(state, selectAttackMode("automatic"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 1, second: 1 },
      collateralRolls: {
        [friendly.id]: { checkDice: { first: 1, second: 1 }, woundDice: { first: 6, second: 6 } },
        [secondary.id]: { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } },
      },
    }));
    expect(state.scenario?.combatants.find((unit) => unit.id === friendly.id)?.woundState).toBe("healthy");
    expect(state.scenario?.combatants.find((unit) => unit.id === secondary.id)?.defeated).toBe(true);
    expect(state.events.some((event) => event.includes(`danger-space attack against ${friendly.name}`) && event.includes("miss"))).toBe(true);
    expect(state.events.some((event) => event.includes(`danger-space attack against ${secondary.name}`) && event.includes("wound"))).toBe(true);
  });

  it("continues automatic danger-space fire beyond an initial miss", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 20;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const primary = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const secondary = scenario.combatants.find((unit) => unit.id === "enemy-2")!;
    scenario.combatants.filter((unit) => ![attacker.id, primary.id, secondary.id].includes(unit.id)).forEach((unit) => { unit.defeated = true; });
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    attacker.weapon = { ...characterCombatWeapons.smg };
    attacker.weaponSkill = 0;
    primary.position = { x: 4, y: 1 };
    secondary.position = { x: 7, y: 1 };

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(primary.id));
    state = reducer(state, selectAttackMode("automatic"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 1, second: 1 },
      woundDice: { first: 1, second: 1 },
      collateralRolls: { [secondary.id]: { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.scenario?.combatants.find((unit) => unit.id === primary.id)?.woundState).toBe("healthy");
    expect(state.scenario?.combatants.find((unit) => unit.id === secondary.id)?.defeated).toBe(true);
  });

  it("resolves semi-automatic danger-space targets nearest-first and stops after one hit", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 20;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const intervening = scenario.combatants.find((unit) => unit.id === "player-2")!;
    const primary = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    scenario.combatants.filter((unit) => ![attacker.id, intervening.id, primary.id].includes(unit.id)).forEach((unit) => { unit.defeated = true; });
    attacker.position = { x: 1, y: 1 };
    attacker.facing = "east";
    attacker.weapon = { ...characterCombatWeapons.autopistol };
    attacker.weaponSkill = 0;
    intervening.position = { x: 3, y: 1 };
    intervening.armor = 0;
    primary.position = { x: 5, y: 1 };

    expect(automaticFireSecondaryTargets(scenario, attacker.id, primary.id).map((unit) => unit.id)).toEqual([intervening.id]);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(primary.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({
      hitDice: { first: 6, second: 6 },
      woundDice: { first: 6, second: 6 },
      collateralRolls: { [intervening.id]: { checkDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } },
    }));

    expect(state.scenario?.combatants.find((unit) => unit.id === intervening.id)?.defeated).toBe(true);
    expect(state.scenario?.combatants.find((unit) => unit.id === primary.id)?.woundState).toBe("healthy");
  });

  it("commits an area fire lane and interrupts an enemy occupying it before its action", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    const enemyPosition = scenario.combatants.find((unit) => unit.id === "enemy-1")!.position;
    state = reducer(state, beginCoveringFire());
    state = reducer(state, previewCoveringFire(enemyPosition));
    state = reducer(state, confirmCoveringFire());
    expect(state.coveringFireLanes).toHaveLength(1);
    expect(state.coveringFireLanes[0]).toMatchObject({ attackerId: "player-1", target: enemyPosition });
    expect(state.ammunitionById["player-1"]).toBe(12);
    expect(state.actionPointsById["player-1"]).toBe(0);
    state = reducer(state, endPlayerTurn(lethalEnemyTurn));
    expect(state.events.some((event) => event.startsWith("Security Guard action interrupted"))).toBe(true);
    expect(state.events.some((event) => event.includes("covering fired"))).toBe(true);
    expect(state.ammunitionById["player-1"]).toBe(9);
    expect(state.coveringFireLanes).toEqual([]);
  });

  it("commits overwatch by ending activation without spending ammunition", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, beginOverwatch());
    state = reducer(state, previewOverwatch({ x: 8, y: 4 }));
    state = reducer(state, confirmOverwatch());

    expect(state.overwatchLanes).toHaveLength(1);
    expect(state.overwatchLanes[0]).toMatchObject({ attackerId: "player-1", target: { x: 8, y: 4 } });
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
    expect(state.ammunitionById["player-1"]).toBe(12);
  });

  it("fires overwatch at the first crossed square and stops an incapacitated mover there", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    player.weaponSkill += 1;
    enemy.position = { x: 11, y: 6 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id], overwatchLanes: [{ attackerId: player.id, target: enemy.position, cells: Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat() }] };

    state = reducer(state, endPlayerTurn(lethalEnemyTurn));

    const stopped = state.scenario!.combatants.find((unit) => unit.id === enemy.id)!;
    expect(stopped.defeated).toBe(true);
    expect(stopped.position).not.toEqual({ x: 11, y: 6 });
    expect(state.events.some((event) => event.includes("movement stopped by overwatch"))).toBe(true);
    expect(state.ammunitionById[player.id]).toBe(11);
    expect(state.overwatchLanes).toEqual([]);
  });

  it("consumes overwatch after a miss and lets the enemy finish moving", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 11, y: 6 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id], overwatchLanes: [{ attackerId: player.id, target: enemy.position, cells: Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat() }] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.events.some((event) => event.includes("overwatch triggered") && event.includes("miss"))).toBe(true);
    expect(state.events.some((event) => event.startsWith(`${enemy.name} trotted to`))).toBe(true);
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).not.toEqual({ x: 11, y: 6 });
    expect(state.ammunitionById[player.id]).toBe(11);
    expect(state.overwatchLanes).toEqual([]);
  });

  it("lets an enemy with an extreme-range shot establish overwatch when it cannot improve position", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 12;
    scenario.height = 3;
    scenario.walls = [];
    scenario.doors = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 10, y: 1 };
    scenario.objects = [
      { id: "block-north", kind: "cover", position: { x: 1, y: 0 }, label: "Blocked" },
      { id: "block-east", kind: "cover", position: { x: 2, y: 1 }, label: "Blocked" },
      { id: "block-south", kind: "cover", position: { x: 1, y: 2 }, label: "Blocked" },
      { id: "block-west", kind: "cover", position: { x: 0, y: 1 }, label: "Blocked" },
    ];
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.overwatchLanes).toHaveLength(1);
    expect(state.overwatchLanes[0].attackerId).toBe(enemy.id);
    expect(state.events.some((event) => event.includes(`${enemy.name} established overwatch`))).toBe(true);
    expect(state.ammunitionById[enemy.id]).toBe(12);
  });

  it("stops a player on the first crossed square when enemy overwatch incapacitates them", () => {
    const scenario = buildTrainingScenario();
    scenario.width = 7;
    scenario.height = 3;
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 1, y: 1 };
    enemy.position = { x: 5, y: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, overwatchLanes: [{ attackerId: enemy.id, target: player.position, cells: [{ x: 2, y: 1 }, { x: 3, y: 1 }] }] };
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 3, y: 1 }));
    state = reducer(state, confirmMove({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));

    const stopped = state.scenario!.combatants.find((unit) => unit.id === player.id)!;
    expect(stopped.defeated).toBe(true);
    expect(stopped.position).toEqual({ x: 2, y: 1 });
    expect(state.events.some((event) => event.includes("movement stopped by enemy overwatch"))).toBe(true);
    expect(state.ammunitionById[enemy.id]).toBe(11);
    expect(state.overwatchLanes).toEqual([]);
  });

  it("allows ordinary movement and trot while adjacent because AHL melee is optional", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    enemy.position = { x: 3, y: 2 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });

    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    const trottingState = reducer(state, startTrot());
    expect(trottingState.trottingCombatantIds).toContain(player.id);
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    expect(state.plannedMove?.destination).toEqual({ x: 1, y: 2 });
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.scenario!.combatants.find((unit) => unit.id === player.id)?.position).toEqual({ x: 1, y: 2 });
    expect(state.events.some((event) => event.includes("reaction melee"))).toBe(false);
  });

  it.skip("resolves reaction melee before movement when a player leaves adjacency", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    player.armor = 0;
    enemy.position = { x: 3, y: 2 };
    enemy.meleeRating = 5;
    enemy.meleeWeapon = { name: "Test Blade", penetration: 4 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    expect(state.plannedMove).toBeNull();
    state = reducer(state, beginWithdrawal());
    expect(state.actionPointsById[player.id]).toBe(3);
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, reactionMeleeRollsByCombatantId: { [enemy.id]: 6 } }));

    const stopped = state.scenario!.combatants.find((unit) => unit.id === player.id)!;
    expect(stopped.defeated).toBe(true);
    expect(stopped.position).toEqual({ x: 2, y: 2 });
    expect(state.reactionMeleeUsedCombatantIds).toContain(enemy.id);
    expect(state.events.some((event) => event.includes("movement stopped by reaction melee"))).toBe(true);
  });

  it.skip("spends five AP to withdraw defensively up to two squares without reaction melee", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    enemy.position = { x: 3, y: 2 };
    enemy.meleeRating = 5;
    enemy.meleeWeapon = { name: "Test Blade", penetration: 4 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, disengage());
    expect(state.actionPointsById[player.id]).toBe(1);
    expect(state.disengagedCombatantIds).toContain(player.id);
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    expect(state.plannedMove?.cost).toBe(0);
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, reactionMeleeRollsByCombatantId: { [enemy.id]: 6 } }));

    expect(state.scenario!.combatants.find((unit) => unit.id === player.id)?.position).toEqual({ x: 1, y: 2 });
    expect(state.scenario!.combatants.find((unit) => unit.id === player.id)?.defeated).toBe(false);
    expect(state.disengagedCombatantIds).not.toContain(player.id);
    expect(state.reactionMeleeUsedCombatantIds).not.toContain(enemy.id);
  });

  it.skip("consumes parry on the next withdrawal reaction and applies its melee penalty", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    scenario.objects = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    enemy.position = { x: 3, y: 2 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    expect(resolveMelee(enemy, player, 4, false, 0, enemy.meleeWeapon.penetration, -2).defenderModifier).toBe(-2);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, parry());
    expect(state.actionPointsById[player.id]).toBe(4);
    state = reducer(state, beginWithdrawal());
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, reactionMeleeRollsByCombatantId: { [enemy.id]: 4 } }));
    expect(state.parryingCombatantIds).not.toContain(player.id);
  });

  it.skip("guards through the enemy phase and clears at the next activation", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    enemy.position = { x: 3, y: 2 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, guard());
    expect(state.guardingCombatantIds).toContain(player.id);
    expect(state.actedCombatantIds).toContain(player.id);
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.guardingCombatantIds).toEqual([]);
    expect(state.turn).toBe(2);
  });

  it.skip("keeps the parry extension isolated from core AHL simultaneous melee", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 2, y: 2 };
    enemy.position = { x: 3, y: 2 };
    enemy.facing = "west";
    enemy.meleeRating = player.meleeRating + 2;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, parry());
    state = reducer(state, finishActivation());
    state = reducer(state, selectPlayerCombatant("player-2"));
    state = reducer(state, finishActivation());
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.turn).toBe(2);
    expect(state.pendingCounterattack).toBeNull();
    expect(state.events.some((event) => event.includes("AHL melee allocation"))).toBe(true);
    expect(state.processedEnemyPhaseCombatantIds).toEqual([]);
  });

  it.skip("allows declining a counterattack and rejects one invalidated by prone posture", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const defender = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const attacker = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    defender.position = { x: 2, y: 2 };
    attacker.position = { x: 3, y: 2 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, pendingCounterattack: { defenderId: defender.id, attackerId: attacker.id } };
    state = reducer(state, resolveCounterattack({ accept: false }));
    expect(state.events[0]).toContain("declined");
    state = { ...state, pendingCounterattack: { defenderId: defender.id, attackerId: attacker.id }, scenario: { ...state.scenario!, combatants: state.scenario!.combatants.map((unit) => unit.id === defender.id ? { ...unit, posture: "prone" as const } : unit) } };
    state = reducer(state, resolveCounterattack({ accept: true, mode: "blade", roll: 6 }));
    expect(state.events[0]).toBe("Counterattack opportunity expired");
  });

  it("traces fire lanes only through visible squares and stops at closed doors", () => {
    const scenario = buildTrainingScenario();
    const shooter = scenario.combatants.find((unit) => unit.id === "player-1")!;
    shooter.position = { x: 7, y: 3 };
    expect(fireLaneCells(scenario, shooter.position, { x: 9, y: 3 })).toEqual([]);
    scenario.doors[0].open = true;
    expect(fireLaneCells(scenario, shooter.position, { x: 9, y: 3 }).map(pointKey)).toContain(pointKey({ x: 8, y: 3 }));
  });

  it("suppresses on a near miss, limits movement, blocks trot, and rallies for 3 AP", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 3, second: 3 }, woundDice: { first: 1, second: 1 } }));
    expect(state.suppressedCombatantIds).toContain("enemy-1");

    state = { ...state, selectedCombatantId: "player-1", suppressedCombatantIds: ["player-1"], actionPointsById: { ...state.actionPointsById, "player-1": 6 }, actedCombatantIds: [] };
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).not.toContain("player-1");
    state = reducer(state, previewMove({ x: 8, y: 6 }));
    expect(state.plannedMove).toBeNull();
    state = reducer(state, rally());
    expect(state.suppressedCombatantIds).not.toContain("player-1");
    expect(state.actionPointsById["player-1"]).toBe(3);
  });

  it("drags an adjacent incapacitated ally through a two-square move and releases them", () => {
    const scenario = buildTrainingScenario();
    const carrier = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const patient = scenario.combatants.find((unit) => unit.id === "player-2")!;
    patient.position = { x: 3, y: 4 };
    patient.defeated = true;
    patient.health = 0;
    patient.woundState = "unconscious";
    const move = [...reachableMovement(scenario, carrier.id, 6, false, 2).values()].find((candidate) => candidate.path.length === 2)!;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(carrier.id));
    state = reducer(state, beginDragging(patient.id));
    expect(state.draggingCombatantByCarrierId[carrier.id]).toBe(patient.id);
    state = reducer(state, previewAttack("enemy-1"));
    expect(state.plannedAttackTargetId).toBeNull();
    state = reducer(state, previewMove(move.destination));
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === patient.id)?.position).toEqual(move.path[move.path.length - 2]);
    state = reducer(state, releaseDraggedCombatant());
    expect(state.draggingCombatantByCarrierId[carrier.id]).toBeUndefined();
  });

  it("places a charge, moves clear, and remotely detonates it", () => {
    const scenario = buildCaptureBridgeScenario();
    const door = scenario.doors.find((candidate) => candidate.locked)!;
    const blastCells = doorBlastCells(door);
    const breacher = scenario.combatants.find((unit) => unit.id === "player-1")!;
    breacher.breachingCharges = 1;
    breacher.position = blastCells[0];
    breacher.facing = "west";
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(breacher.id));
    state = reducer(state, previewBreachDoor(door.id));
    expect(state.plannedBreachDoorId).toBe(door.id);
    state = reducer(state, confirmBreachDoor());
    expect(state.scenario?.doors.find((candidate) => candidate.id === door.id)).toMatchObject({ locked: true, open: false });
    expect(state.placedBreachingChargeByDoorId[door.id]).toBe(breacher.id);
    expect(state.actionPointsById[breacher.id]).toBe(3);
    const safeMove = [...reachableMovement(state.scenario!, breacher.id, 3).values()].filter((move) => !blastCells.some((cell) => pointKey(cell) === pointKey(move.destination))).sort((a, b) => a.cost - b.cost)[0]!;
    expect(safeMove.cost).toBeLessThan(3);
    state = reducer(state, previewMove(safeMove.destination));
    state = reducer(state, confirmMove());
    state = reducer(state, previewBreachDetonation(door.id));
    state = reducer(state, detonateBreachCharge({ rollsByCombatantId: {} }));
    expect(state.scenario?.doors.find((candidate) => candidate.id === door.id)).toMatchObject({ locked: false, open: true });
    expect(state.scenario?.combatants.find((unit) => unit.id === breacher.id)?.breachingCharges).toBe(0);
    expect(state.placedBreachingChargeByDoorId[door.id]).toBeUndefined();
  });

  it("offers both normal opening and breaching for an adjacent unlocked closed door", () => {
    const scenario = buildTrainingScenario();
    const door = scenario.doors[0];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.breachingCharges = 1;
    player.position = doorBlastCells(door)[0];
    expect(closedDoorsAdjacentTo(scenario, player.id).map((candidate) => candidate.id)).toContain(door.id);
    expect(breachableDoorsAdjacentTo(scenario, player.id).map((candidate) => candidate.id)).toContain(door.id);
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewBreachDoor(door.id));
    expect(state.plannedBreachDoorId).toBe(door.id);
  });

  it("detonates an armed door even if it has opened with an enemy on the blast square", () => {
    const scenario = buildTrainingScenario();
    const door = scenario.doors[0];
    const blastCells = doorBlastCells(door);
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    player.breachingCharges = 1;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = blastCells[0];
    enemy.position = blastCells[1];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(player.id));
    state = reducer(state, previewBreachDoor(door.id));
    state = reducer(state, confirmBreachDoor());
    state = { ...state, scenario: { ...state.scenario!, doors: state.scenario!.doors.map((candidate) => candidate.id === door.id ? { ...candidate, open: true } : candidate) } };
    state = reducer(state, previewBreachDetonation(door.id));
    state = reducer(state, detonateBreachCharge({ rollsByCombatantId: { [enemy.id]: { first: 6, second: 6 } } }));
    expect(state.placedBreachingChargeByDoorId[door.id]).toBeUndefined();
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.defeated).toBe(true);
    expect(state.events.some((event) => event.includes("remotely detonated"))).toBe(true);
  });
});
