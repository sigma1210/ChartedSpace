import { adjacentEnemies, adjacentObjectives, closedDoorsAdjacentTo, coverProtection, grenadeBlastCells, grenadeCoverProtection, pointKey, proposedMoveFor, reachableMovement, treatableAllies, validGrenadeTargets } from "../geometry";
import reducer, { adjustCameraZoom, beginGrenadeTargeting, cancelMovePreview, confirmAttack, confirmGrenade, confirmMove, confirmSecureObjective, confirmTreatment, endPlayerTurn, finishActivation, focusCameraOnSelected, loadCombatScenario, openDoor, previewAttack, previewGrenadeTarget, previewMove, previewSecureObjective, previewTreatment, resetCamera, rotateCamera, selectAttackMode, selectPlayerCombatant, setViewMode } from "../slice";
import { buildTrainingScenario } from "../trainingScenario";
import { buildEngineRoomScenario, characterCombatScenarios } from "../scenarios";
import { resolveMelee, resolveSnapShot, snapShotTarget, woundStateForTotal } from "../combatResolution";

describe("character combat 2D checkpoint", () => {
  const missEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }, "enemy-2": { hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } } } };
  const lethalEnemyTurn = { enemyRolls: { "enemy-1": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } }, "enemy-2": { hitDice: { first: 6, second: 6 }, woundDice: { first: 6, second: 6 } } } };
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
    for (let index = 0; index < 10; index += 1) state = reducer(state, adjustCameraZoom(1));
    expect(state.camera.zoom).toBe(63);
    state = reducer(state, focusCameraOnSelected());
    expect(state.camera.focus).toEqual({ x: 2, y: 4 });
    state = reducer(state, resetCamera());
    expect(state.camera).toEqual({ quarterTurn: 0, zoom: 42, focus: null });
  });

  it("provides two distinct selectable scenarios that load and reset independently", () => {
    expect(characterCombatScenarios.map((entry) => entry.id)).toEqual(["boarding-action", "engine-room-sabotage"]);
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

  it("makes a surviving guard surrender after failing casualty morale", () => {
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
    expect(state.scenario?.combatants.find((unit) => unit.id === survivor.id)).toMatchObject({ surrendered: true, defeated: true, woundState: "healthy" });
    expect(state.status).toBe("victory");
    expect(state.events).toContain("Ship Crew failed morale 2/8 and surrendered");
    expect(state.outcome).toMatchObject({ result: "victory", enemiesNeutralized: 1, enemiesSurrendered: 1 });
    expect(proposedMoveFor(state.scenario!, "player-1", survivor.position, 4)).not.toBeNull();
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
    expect(state.events).toContain("Ship Crew passed morale 12/8");
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

  it("commits covering fire and interrupts an incapacitated enemy before its action", () => {
    const scenario = buildTrainingScenario();
    scenario.doors[0].open = true;
    scenario.combatants.find((unit) => unit.id === "player-1")!.position = { x: 8, y: 3 };
    scenario.combatants.find((unit) => unit.id === "player-2")!.defeated = true;
    let state = reducer(undefined, loadCombatScenario(scenario));
    state = reducer(state, selectPlayerCombatant("player-1"));
    state = reducer(state, previewAttack("enemy-1"));
    state = reducer(state, selectAttackMode("covering"));
    state = reducer(state, confirmAttack({ hitDice: { first: 1, second: 1 }, woundDice: { first: 1, second: 1 } }));
    expect(state.coveringFireByTargetId["enemy-1"]).toBe("player-1");
    expect(state.actionPointsById["player-1"]).toBe(0);
    state = reducer(state, endPlayerTurn(lethalEnemyTurn));
    expect(state.events.some((event) => event.startsWith("Security Guard action interrupted"))).toBe(true);
    expect(state.events.some((event) => event.includes("covering fired"))).toBe(true);
  });
});
