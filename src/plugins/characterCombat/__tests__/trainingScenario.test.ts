import { adjacentEnemies, adjacentObjectives, breachableDoorsAdjacentTo, closedDoorsAdjacentTo, coverProtection, decompressionMovesForDoor, depressurizedCells, doorBlastCells, fireLaneCells, grenadeBlastCells, grenadeCoverProtection, grenadeLandingPoint, hasLineOfSight, openDoorsAdjacentTo, pointKey, proneRotationForFacing, proposedMoveFor, rangedEnemies, reachableMovement, routeAllowingClosedDoors, shortestPathToAny, treatableAllies, validGrenadeTargets, weaponRecoilDistance, zeroGravityPushes, zeroGravityRecoilPath } from "../geometry";
import reducer, { adjustCameraZoom, beginCoveringFire, beginDragging, beginGrenadeTargeting, beginOverwatch, braceWeapon, cancelMovePreview, clearCombatScenario, closeDoor, confirmAttack, confirmBreachDoor, confirmCoveringFire, confirmExtinguishFire, confirmGrenade, confirmMove, confirmOpenDoor, confirmOverwatch, confirmSecureObjective, confirmTreatment, detonateBreachCharge, disengage, endPlayerTurn, evade, finishActivation, focusCameraOnSelected, goProne, loadCombatScenario, openDoor, panCameraBy, previewAttack, previewBreachDetonation, previewBreachDoor, previewCoveringFire, previewExtinguishFire, previewGrenadeTarget, previewMove, previewOpenDoor, previewOverwatch, previewSecureObjective, previewTreatment, rally, rallyAlly, releaseDraggedCombatant, reloadWeapon, resetCamera, rotateCamera, rotateCameraBy, selectAttackMode, selectPlayerCombatant, setArmoryLoadout, setViewMode, standUp, startTrot, turnCombatant } from "../slice";
import { buildTrainingScenario } from "../trainingScenario";
import { buildArmorySweepScenario, buildCaptureBridgeScenario, buildCaptureCommanderScenario, buildCargoDeckScenario, buildCarrierDeckScenario, buildDamageControlScenario, buildEngineRoomScenario, buildHoldAirlockScenario, buildHullBreachScenario, buildRescueScenario, buildSuppressStrongpointScenario, buildZeroGravityScenario, characterCombatScenarios } from "../scenarios";
import { attackArcAgainstTarget, resolveMelee, resolveSnapShot, snapShotTarget, woundStateForTotal } from "../combatResolution";
import { validateCombatScenario } from "../scenarioValidator";
import { applyArmoryLoadouts, characterCombatArmor, characterCombatWeapons } from "../equipment";
import { equipmentVisualFor } from "../equipmentPresentation";
import { compareEnemyRangedTargets, shouldImproveEnemyRange } from "../enemyTactics";
import type { WeaponProfile } from "../types";
import { beginSmokeGrenadeTargeting, beginStunGrenadeTargeting, restrainEnemy } from "../slice";

describe("character combat 2D checkpoint", () => {
  const missEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } };
  const lethalEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }, "enemy-2": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } };

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

  it("applies front, side, and rear modifiers exactly once to ranged and melee attacks", () => {
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

  it("spends 3 AP to evade ranged fire, leaves melee unchanged, and expires after the enemy phase", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const normalShot = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed")!;
    const evadingShot = resolveSnapShot(attacker, target, { first: 4, second: 4 }, { first: 1, second: 1 }, 0, "aimed", true)!;
    expect(evadingShot).toMatchObject({ evadeModifier: -2, hitTotal: normalShot.hitTotal - 2 });
    expect(resolveMelee(attacker, target, 4)).not.toHaveProperty("evadeModifier");

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

  it("applies prone melee penalties and vulnerabilities without changing standing combat", () => {
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
    const longMove = [...reachableMovement(scenario, "player-1", 6).values()].find((move) => move.cost > 4);
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
    expect(characterCombatScenarios.map((entry) => entry.id)).toEqual(["boarding-action", "engine-room-sabotage", "cargo-deck-interdiction", "carrier-deck-assault", "suppress-strongpoint", "capture-commander", "detention-deck-rescue", "hold-the-airlock", "armory-sweep", "capture-the-bridge", "zero-g-drift", "hull-breach", "damage-control"]);
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
    actor.position = { x: commander.position.x - 3, y: commander.position.y };
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

  it("limits prone movement to one square and prevents trotting", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, goProne());
    state = reducer(state, startTrot());
    expect(state.trottingCombatantIds).toEqual([]);
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    expect(state.plannedMove).toBeNull();
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    expect(state.plannedMove).toMatchObject({ destination: { x: 3, y: 4 }, cost: 1 });
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

  it("clears bracing on movement, standing, melee, turn transition, and scenario reset", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, goProne());
    state = reducer(state, braceWeapon());
    state = reducer(state, previewMove({ x: 3, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"] };
    state = reducer(state, standUp());
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"], plannedAttackTargetId: "enemy-1" };
    state = reducer(state, selectAttackMode("melee"));
    expect(state.bracedCombatantIds).toEqual([]);

    state = { ...state, bracedCombatantIds: ["player-1"], actedCombatantIds: ["player-1", "player-2"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.bracedCombatantIds).toEqual([]);
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
    releasedScenario.combatants.find((unit) => unit.id === "enemy-1")!.position = { x: 8, y: 4 };
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
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 4, y: 6 });
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
    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)?.position).toEqual({ x: 1, y: 0 });
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

    const target = { ...commander, position: { x: 9, y: 4 }, armor: characterCombatArmor.clothing.value };
    laser.position = { x: 1, y: 4 };
    shotgun.position = { x: 1, y: 4 };
    expect(snapShotTarget(laser, target)?.rangeBand).toBe("long");
    expect(snapShotTarget(shotgun, target)).toBeNull();

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
    const holdoutResult = resolveSnapShot(holdoutAttacker, { ...laser, position: { x: 5, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(holdoutResult.rangeBand).toBe("long");
    expect(holdoutResult.weaponAccuracy).toBe(-1);

    shotgun.position = { x: 1, y: 1 };
    const closeShotgun = resolveSnapShot(shotgun, { ...target, position: { x: 3, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    const distantShotgun = resolveSnapShot(shotgun, { ...target, position: { x: 6, y: 1 } }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(closeShotgun.weaponPenetration).toBe(3);
    expect(distantShotgun.weaponPenetration).toBe(0);

    const gaussAttacker = { ...laser, weapon: { ...characterCombatWeapons.gaussRifle } };
    const gaussResult = resolveSnapShot(gaussAttacker, { ...target, armor: characterCombatArmor.battleDress.value }, { first: 6, second: 6 }, { first: 4, second: 4 }, 0, "aimed")!;
    expect(gaussResult.weaponPenetration).toBe(4);
    expect(gaussResult.woundTotal).toBe(8);
  });

  it("stores valid Armory Sweep kits in Redux and applies them without allowing two Heavy kits", () => {
    let state = reducer(undefined, setArmoryLoadout({ index: 0, loadoutId: "heavy" }));
    state = reducer(state, setArmoryLoadout({ index: 1, loadoutId: "heavy" }));
    expect(state.armoryLoadoutIds).toEqual(["heavy", "breacher"]);
    state = reducer(state, setArmoryLoadout({ index: 1, loadoutId: "assault" }));
    expect(state.armoryLoadoutIds).toEqual(["heavy", "assault"]);

    const scenario = applyArmoryLoadouts(buildArmorySweepScenario(), state.armoryLoadoutIds);
    const players = scenario.combatants.filter((unit) => unit.side === "player");
    expect(players[0]).toMatchObject({ weapon: characterCombatWeapons.gaussRifle, armorName: "Battle Dress", armor: 4 });
    expect(players[1]).toMatchObject({ weapon: characterCombatWeapons.smg, armorName: "Combat Armor", armor: 2 });
    state = reducer(state, loadCombatScenario(scenario));
    state = reducer(state, { type: "characterCombat/clearCombatScenario" });
    expect(state.armoryLoadoutIds).toEqual(["heavy", "assault"]);
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

  it("moves an extreme-range shotgun enemy closer but lets a laser enemy fire from range", () => {
    const makeScenario = (weapon: WeaponProfile) => {
      const scenario = buildTrainingScenario();
      scenario.walls = [];
      scenario.doors = [];
      scenario.objects = [];
      scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 1, y: 1 };
      scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
      const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
      enemy.position = { x: 6, y: 1 };
      enemy.weapon = { ...weapon };
      scenario.combatants.find((unit) => unit.id === "enemy-2")!.defeated = true;
      return scenario;
    };
    let state = reducer(undefined, loadCombatScenario(makeScenario(characterCombatWeapons.shotgun)));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 3, y: 1 });
    expect(state.events.some((event) => event.startsWith("Security Guard snap fired"))).toBe(true);

    state = reducer(undefined, loadCombatScenario(makeScenario(characterCombatWeapons.laserRifle)));
    state = { ...state, actedCombatantIds: ["player-1"] };
    state = reducer(state, endPlayerTurn(missEnemyTurn));
    expect(state.scenario?.combatants.find((unit) => unit.id === "enemy-1")?.position).toEqual({ x: 6, y: 1 });
    expect(state.events.some((event) => event.startsWith("Security Guard aimed fired"))).toBe(true);
  });

  it("limits grenade targets to six visible squares", () => {
    const scenario = buildTrainingScenario();
    scenario.walls = [];
    scenario.doors = [];
    const targets = new Set(validGrenadeTargets(scenario, "player-1").map(pointKey));
    expect(targets.has(pointKey({ x: 8, y: 4 }))).toBe(true);
    expect(targets.has(pointKey({ x: 9, y: 4 }))).toBe(false);
  });

  it("contains grenade blast behind walls and closed doors", () => {
    const scenario = buildTrainingScenario();
    expect(grenadeBlastCells(scenario, { x: 7, y: 3 }).map(pointKey)).not.toContain(pointKey({ x: 8, y: 3 }));
    scenario.doors[0].open = true;
    expect(grenadeBlastCells(scenario, { x: 7, y: 3 }).map(pointKey)).toContain(pointKey({ x: 8, y: 3 }));
  });

  it("lands accurate grenade throws and scatters misses in each cardinal direction", () => {
    const scenario = buildTrainingScenario();
    const target = { x: 5, y: 4 };
    expect(grenadeLandingPoint(scenario, target, { first: 3, second: 3 }, 1, 1, 2)).toEqual({ landing: target, hit: true });
    expect(grenadeLandingPoint(scenario, target, { first: 1, second: 1 }, 0, 1, 1).landing).toEqual({ x: 5, y: 3 });
    expect(grenadeLandingPoint(scenario, target, { first: 1, second: 1 }, 0, 2, 2).landing).toEqual({ x: 7, y: 4 });
    expect(grenadeLandingPoint(scenario, target, { first: 1, second: 1 }, 0, 3, 1).landing).toEqual({ x: 5, y: 5 });
    expect(grenadeLandingPoint(scenario, target, { first: 1, second: 1 }, 0, 4, 2).landing).toEqual({ x: 3, y: 4 });
  });

  it("stops grenade scatter at the map edge", () => {
    const scenario = buildTrainingScenario();
    expect(grenadeLandingPoint(scenario, { x: 0, y: 0 }, { first: 1, second: 1 }, 0, 1, 2).landing).toEqual({ x: 0, y: 0 });
    expect(grenadeLandingPoint(scenario, { x: scenario.width - 1, y: scenario.height - 1 }, { first: 1, second: 1 }, 0, 2, 2).landing).toEqual({ x: scenario.width - 1, y: scenario.height - 1 });
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
      throwDice: { first: 1, second: 1 }, scatterDirection: 2, scatterDistance: 2,
      rollsByCombatantId: { [ally.id]: { first: 6, second: 6 } },
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
    expect(grenadeCoverProtection(scenario, { x: 3, y: 3 }, ally.position)).toBe(2);

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

  it("uses a medkit and six AP, then reactivates an incapacitated patient next turn", () => {
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
    expect(state.scenario?.combatants.find((unit) => unit.id === patient.id)).toMatchObject({ woundState: "serious", defeated: true, health: 0 });
    expect(state.recoveringCombatantIds).toContain(patient.id);
    expect(state.scenario?.combatants.find((unit) => unit.id === medic.id)?.medkits).toBe(0);
    expect(state.actionPointsById[medic.id]).toBe(0);
    expect(state.actedCombatantIds).toContain(medic.id);

    state = reducer(state, endPlayerTurn({ enemyRolls: {} }));
    expect(state.turn).toBe(2);
    expect(state.scenario?.combatants.find((unit) => unit.id === patient.id)).toMatchObject({ woundState: "serious", defeated: false, health: 1 });
    expect(state.actionPointsById[patient.id]).toBe(6);
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

  it("calculates four-square orthogonal movement around blockers", () => {
    const scenario = buildTrainingScenario();
    const reachable = reachableMovement(scenario, "player-1", 4);
    expect(reachable.get(pointKey({ x: 4, y: 4 }))).toMatchObject({ cost: 2, path: [{ x: 3, y: 4 }, { x: 4, y: 4 }] });
    expect(reachable.has(pointKey({ x: 2, y: 5 }))).toBe(false);
    expect(reachable.has(pointKey({ x: 5, y: 4 }))).toBe(false);
    expect(proposedMoveFor(scenario, "player-1", { x: 8, y: 4 }, 4)).toBeNull();
  });

  it("stores and cancels a validated movement preview without moving the character", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    expect(state.plannedMove).toMatchObject({ combatantId: "player-1", destination: { x: 4, y: 4 }, cost: 2 });
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")?.position).toEqual({ x: 2, y: 4 });
    state = reducer(state, cancelMovePreview());
    expect(state.plannedMove).toBeNull();
  });

  it("confirms movement, updates facing, and spends movement AP", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 4, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.scenario?.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ position: { x: 4, y: 4 }, facing: "east" });
    expect(state.actionPointsById["player-1"]).toBe(4);
    expect(state.events[0]).toBe("Boarding Lead moved to 4,4");
    expect(state.plannedMove).toBeNull();

    state = reducer(state, previewMove({ x: 4, y: 3 }));
    expect(state.plannedMove).not.toBeNull();
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
    expect(proposedMoveFor(state.scenario!, player.id, { x: 8, y: 3 }, 1)).not.toBeNull();

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
    expect(proposedMoveFor(state.scenario!, player.id, { x: 9, y: 3 }, 1)).not.toBeNull();
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

  it("moves active enemies toward the nearest player after the player turn", () => {
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
    expect(state.events.some((event) => event.startsWith("Security Guard moved to"))).toBe(true);
    expect(state.events.some((event) => event.startsWith("Security Guard snap fired"))).toBe(true);
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
    scenario.fireCells = [{ x: 2, y: 0 }];
    scenario.smokeCells = [];
    const player = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const enemy = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    player.position = { x: 3, y: 0 };
    enemy.position = { x: 0, y: 0 };
    enemy.weapon = { ...enemy.weapon, effectiveRange: 1, longRange: 1, extremeRange: 1 };
    scenario.combatants.filter((unit) => unit.id !== player.id && unit.id !== enemy.id).forEach((unit) => { unit.defeated = true; });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = { ...state, actedCombatantIds: [player.id] };

    state = reducer(state, endPlayerTurn(missEnemyTurn));

    expect(state.scenario?.combatants.find((unit) => unit.id === enemy.id)).toMatchObject({ position: { x: 2, y: 0 }, woundState: "serious", defeated: true });
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
    expect(movedEnemy.position).toEqual(route![2]);
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
    expect(state.events.some((event) => event.startsWith("Security Guard melee attacked"))).toBe(true);
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
    expect(resolveSnapShot(attacker, target, { first: 1, second: 1 }, { first: 6, second: 6 })).toMatchObject({ hit: false, hitTotal: 2, woundRoll: null });
    expect(resolveSnapShot(attacker, target, { first: 5, second: 3 }, { first: 3, second: 3 })).toMatchObject({ hit: true, hitTotal: 8, woundTotal: 6, woundState: "light" });
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
    expect(resolveSnapShot(attacker, target, { first: 5, second: 3 }, { first: 4, second: 4 }, 2)).toMatchObject({ cover: 2, woundTotal: 6, woundState: "light" });

    attacker.position = { x: 7, y: 4 };
    expect(coverProtection(scenario, attacker.id, target.id)).toBe(0);
  });

  it("maps every wound band and incapacitates serious wounds without blocking movement", () => {
    expect([4, 5, 7, 9, 11].map(woundStateForTotal)).toEqual(["healthy", "light", "serious", "unconscious", "dead"]);
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 4, second: 3 }, woundDice: { first: 4, second: 3 } }));
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "serious", defeated: true });
    expect(proposedMoveFor(state.scenario!, attacker.id, target.position, 1)).not.toBeNull();
  });

  it("spends AP on movement and snap fire, rejects unaffordable aimed fire, and finishes activation", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewMove({ x: 8, y: 4 }));
    state = reducer(state, confirmMove());
    expect(state.actionPointsById["player-1"]).toBe(5);

    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("aimed"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById["player-1"]).toBe(5);
    expect(state.plannedAttackTargetId).toBe("enemy-1");

    state = reducer(state, selectAttackMode("snap"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }));
    expect(state.actionPointsById["player-1"]).toBe(2);
    state = reducer(state, finishActivation());
    expect(state.actionPointsById["player-1"]).toBe(0);
    expect(state.actedCombatantIds).toContain("player-1");
  });

  it("resolves adjacent melee for three AP and rejects melee through a closed door", () => {
    const scenario = buildTrainingScenario();
    const attacker = scenario.combatants.find((unit) => unit.id === "player-1")!;
    const target = scenario.combatants.find((unit) => unit.id === "enemy-1")!;
    attacker.position = { x: 8, y: 3 };
    expect(resolveMelee(attacker, target, 6)).toMatchObject({ roll: 6, modifier: 1, total: 7, woundState: "dead" });
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    state = reducer(state, selectAttackMode("melee"));
    state = reducer(state, confirmAttack({ hitDice: { first: 6, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.actionPointsById[attacker.id]).toBe(3);
    expect(state.scenario?.combatants.find((unit) => unit.id === target.id)).toMatchObject({ woundState: "dead", defeated: true });

    const blocked = buildTrainingScenario();
    blocked.combatants.find((unit) => unit.id === attacker.id)!.position = { x: 7, y: 3 };
    blocked.combatants.find((unit) => unit.id === target.id)!.position = { x: 8, y: 3 };
    state = reducer(undefined, loadCombatScenario(blocked));
    state = reducer(state, selectPlayerCombatant(attacker.id));
    state = reducer(state, previewAttack(target.id));
    expect(state.plannedAttackTargetId).toBeNull();
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

  it("automatically completes activation when movement spends the final AP", () => {
    let state = reducer(undefined, loadCombatScenario(buildTrainingScenario()));
    state = { ...state, actionPointsById: { ...state.actionPointsById, "player-1": 1 } };
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
    expect(state.events.some((event) => event.startsWith(`${enemy.name} moved to`))).toBe(true);
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

  it("resolves reaction melee before movement when a player leaves adjacency", () => {
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
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, reactionMeleeRollsByCombatantId: { [enemy.id]: 6 } }));

    const stopped = state.scenario!.combatants.find((unit) => unit.id === player.id)!;
    expect(stopped.defeated).toBe(true);
    expect(stopped.position).toEqual({ x: 2, y: 2 });
    expect(state.reactionMeleeUsedCombatantIds).toContain(enemy.id);
    expect(state.events.some((event) => event.includes("movement stopped by reaction melee"))).toBe(true);
  });

  it("spends three AP to disengage and then leaves adjacency without reaction melee", () => {
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
    expect(state.actionPointsById[player.id]).toBe(3);
    expect(state.disengagedCombatantIds).toContain(player.id);
    state = reducer(state, previewMove({ x: 1, y: 2 }));
    state = reducer(state, confirmMove({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 }, reactionMeleeRollsByCombatantId: { [enemy.id]: 6 } }));

    expect(state.scenario!.combatants.find((unit) => unit.id === player.id)?.position).toEqual({ x: 1, y: 2 });
    expect(state.scenario!.combatants.find((unit) => unit.id === player.id)?.defeated).toBe(false);
    expect(state.disengagedCombatantIds).not.toContain(player.id);
    expect(state.reactionMeleeUsedCombatantIds).not.toContain(enemy.id);
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
    const move = [...reachableMovement(scenario, carrier.id, 2).values()].find((candidate) => candidate.cost === 2)!;
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
    breacher.position = blastCells[0];
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant(breacher.id));
    state = reducer(state, previewBreachDoor(door.id));
    expect(state.plannedBreachDoorId).toBe(door.id);
    state = reducer(state, confirmBreachDoor());
    expect(state.scenario?.doors.find((candidate) => candidate.id === door.id)).toMatchObject({ locked: true, open: false });
    expect(state.placedBreachingChargeByDoorId[door.id]).toBe(breacher.id);
    expect(state.actionPointsById[breacher.id]).toBe(3);
    const safeMove = [...reachableMovement(state.scenario!, breacher.id, 2).values()].find((move) => !blastCells.some((cell) => pointKey(cell) === pointKey(move.destination)))!;
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
