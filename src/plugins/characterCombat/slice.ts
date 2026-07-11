import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ArmoryLoadoutId, CharacterCombatHudId, CharacterCombatHudLayout, CharacterCombatState, CharacterCombatViewMode, CombatScenario, FireMode, GridPoint } from "./types";
import { adjacentEnemies, adjacentObjectives, breachableDoorsAdjacentTo, closedDoorsAdjacentTo, coverProtection, decompressionMovesForDoor, depressurizedCells, doorBlastCells, fireLaneCells, grenadeBlastCells, grenadeCoverProtection, openDoorsAdjacentTo, pointKey, proposedMoveFor, rangedEnemies, routeAllowingClosedDoors, shortestPathToAny, treatableAllies, validCoveringFireTargets, validGrenadeTargets, zeroGravityPushes, zeroGravityRecoilPath } from "./geometry";
import { resolveMelee, resolveSnapShot, snapShotTarget, woundStateForTotal, type DicePair } from "./combatResolution";
import { shouldImproveEnemyRange } from "./enemyTactics";

const distanceBetween = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const applyFireDamage = (state: CharacterCombatState, unit: CombatScenario["combatants"][number]) => {
  const nextWound = unit.woundState === "healthy" ? "light" : unit.woundState === "light" ? "serious" : unit.woundState === "serious" ? "unconscious" : "dead";
  unit.woundState = nextWound;
  if (nextWound === "serious" || nextWound === "unconscious" || nextWound === "dead") {
    unit.defeated = true;
    unit.health = 0;
    state.actionPointsById[unit.id] = 0;
    if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
  }
  state.events.unshift(`${unit.name} entered fire and suffered a ${nextWound} wound`);
};

const applyZeroGravityRecoil = (state: CharacterCombatState, combatantId: string) => {
  const unit = state.scenario?.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit || !state.scenario) return;
  const path = zeroGravityRecoilPath(state.scenario, combatantId);
  if (path.length === 0) return;
  unit.position = path[path.length - 1];
  state.events.unshift(`${unit.name} recoiled to ${unit.position.x},${unit.position.y}`);
};

const openingDoorWouldExpose = (scenario: CombatScenario, doorId: string, combatantId: string) => {
  const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
  if (!unit || unit.vaccSuit || depressurizedCells(scenario).has(pointKey(unit.position))) return false;
  const openedScenario: CombatScenario = { ...scenario, doors: scenario.doors.map((door) => door.id === doorId ? { ...door, open: true } : door) };
  return depressurizedCells(openedScenario).has(pointKey(unit.position));
};

const openDoorAndApplyDecompression = (state: CharacterCombatState, door: CombatScenario["doors"][number]) => {
  const moves = state.scenario ? decompressionMovesForDoor(state.scenario, door.id) : new Map<string, GridPoint[]>();
  door.open = true;
  moves.forEach((path, combatantId) => {
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === combatantId);
    if (!unit || path.length === 0) return;
    unit.position = path[path.length - 1];
    state.events.unshift(`${unit.name} pulled by decompression to ${unit.position.x},${unit.position.y}`);
  });
};

export const defaultCharacterCombatHudLayouts: Record<CharacterCombatHudId, CharacterCombatHudLayout> = {
  scenario: { visible: true, pinned: false, position: { x: 12, y: 12 } },
  action: { visible: true, pinned: false, position: { x: 12, y: 150 } },
  character: { visible: true, pinned: false, position: { x: 980, y: 12 } },
  events: { visible: true, pinned: false, position: { x: 980, y: 190 } },
  legend: { visible: false, pinned: false, position: { x: 980, y: 360 } },
  outcome: { visible: true, pinned: false, position: { x: 500, y: 12 } },
};

const freshHudLayouts = () => Object.fromEntries(Object.entries(defaultCharacterCombatHudLayouts).map(([id, layout]) => [id, { ...layout, position: { ...layout.position } }])) as Record<CharacterCombatHudId, CharacterCombatHudLayout>;
const freshActionPoints = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [unit.id, 6]));
const magazineSize = (scenario: CombatScenario, combatantId: string) => scenario.combatants.find((unit) => unit.id === combatantId)?.weapon.magazineSize ?? 12;
const freshAmmunition = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.map((unit) => [unit.id, unit.weapon.magazineSize ?? 12]));
type MoraleRolls = Record<string, DicePair>;

const startingCombatants = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "player").map((unit) => [unit.id, { id: unit.id, name: unit.name, sourceCrewId: unit.sourceCrewId, sourceCharacterId: unit.sourceCharacterId, woundState: unit.woundState, grenades: unit.grenades, medkits: unit.medkits }]));

const finalizeOutcome = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario || state.status === "active") return;
  const enemies = scenario.combatants.filter((unit) => unit.side === "enemy" && (!unit.reinforcementTurn || unit.reinforcementTurn <= state.turn));
  state.outcome = {
    result: state.status,
    scenarioTitle: scenario.title,
    turn: state.turn,
    members: scenario.combatants.filter((unit) => unit.side === "player").map((unit) => {
      const start = state.combatantStarts[unit.id];
      const condition = unit.woundState === "dead" ? "dead" : unit.woundState === "serious" || unit.woundState === "unconscious" ? "incapacitated" : unit.woundState === "light" ? "wounded" : "survived";
      return { id: unit.id, name: unit.name, sourceCrewId: unit.sourceCrewId, sourceCharacterId: unit.sourceCharacterId, condition, woundState: unit.woundState, grenadesUsed: Math.max(0, (start?.grenades ?? unit.grenades) - unit.grenades), medkitsUsed: Math.max(0, (start?.medkits ?? unit.medkits) - unit.medkits) };
    }),
    enemiesNeutralized: enemies.filter((unit) => unit.defeated && !unit.surrendered).length,
    enemiesSurrendered: enemies.filter((unit) => unit.surrendered).length,
    campaignChangesApplied: false,
  };
};

const resolveRescueFailure = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario || state.status !== "active" || scenario.victoryCondition !== "rescue-extract" || !scenario.captiveId) return false;
  const released = scenario.objects.some((object) => object.kind === "prisoner" && object.completed);
  const captive = scenario.combatants.find((unit) => unit.id === scenario.captiveId);
  if (!released || !captive?.defeated) return false;
  state.status = "defeat";
  state.selectedCombatantId = null;
  state.plannedMove = null;
  state.plannedAttackTargetId = null;
  state.plannedAttackMode = null;
  state.plannedObjectiveId = null;
  state.events.unshift(`Rescue failed: ${captive.name} was incapacitated before extraction`);
  finalizeOutcome(state);
  return true;
};

const resolveEnemyMorale = (state: CharacterCombatState, moraleRolls: MoraleRolls = {}) => {
  const scenario = state.scenario;
  if (!scenario) return;
  const enemies = scenario.combatants.filter((unit) => unit.side === "enemy");
  for (const guard of enemies.filter((unit) => !unit.defeated)) {
    const dice = moraleRolls[guard.id];
    if (!dice) continue;
    const casualties = enemies.filter((unit) => unit.defeated).length;
    const target = 7 + casualties;
    const total = dice.first + dice.second;
    if (total < target) {
      guard.surrendered = true;
      guard.defeated = true;
      state.events.unshift(`${guard.name} failed morale ${total}/${target} and surrendered`);
    } else state.events.unshift(`${guard.name} passed morale ${total}/${target}`);
  }
  if (enemies.length > 0 && enemies.every((unit) => unit.defeated) && scenario.id !== "hull-breach" && scenario.victoryCondition !== "rescue-extract" && scenario.victoryCondition !== "hold-zone" && scenario.victoryCondition !== "staged-objectives") {
    state.status = "victory";
    state.selectedCombatantId = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift("All hostile crew neutralized or surrendered");
    finalizeOutcome(state);
  }
};

const activateReinforcements = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario) return;
  const arrivals = scenario.combatants.filter((unit) => unit.side === "enemy" && unit.reinforcementTurn === state.turn && unit.defeated);
  for (const unit of arrivals) {
    const occupied = new Set([
      ...scenario.objects.filter((object) => object.kind === "cover").map((object) => pointKey(object.position)),
      ...scenario.combatants.filter((candidate) => candidate.id !== unit.id && !candidate.defeated).map((candidate) => pointKey(candidate.position)),
    ]);
    const cells = Array.from({ length: scenario.width }, (_, x) => Array.from({ length: scenario.height }, (_, y) => ({ x, y }))).flat()
      .sort((a, b) => distanceBetween(a, unit.position) - distanceBetween(b, unit.position) || a.y - b.y || a.x - b.x);
    const spawn = cells.find((cell) => !occupied.has(pointKey(cell)));
    if (!spawn) continue;
    unit.position = spawn;
    unit.defeated = false;
    unit.surrendered = false;
    unit.health = 1;
    unit.woundState = "healthy";
    state.events.unshift(`${unit.name} arrived as reinforcement at ${spawn.x},${spawn.y}`);
  }
};

const resolveHoldZoneCapture = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario || state.status !== "active" || scenario.victoryCondition !== "hold-zone") return false;
  const control = scenario.objects.find((object) => object.kind === "control");
  const occupier = control ? scenario.combatants.find((unit) => unit.side === "enemy" && !unit.defeated && pointKey(unit.position) === pointKey(control.position)) : null;
  if (!occupier) return false;
  state.status = "defeat";
  state.selectedCombatantId = null;
  state.events.unshift(`${occupier.name} captured the control zone`);
  finalizeOutcome(state);
  return true;
};

export const initialCharacterCombatState: CharacterCombatState = { scenario: null, selectedBoardingTeamIds: [], armoryLoadoutIds: ["scout", "breacher"], combatantStarts: {}, outcome: null, viewMode: "3d", camera: { quarterTurn: 0, azimuth: Math.PI / 4, elevation: Math.PI / 4.75, zoom: 42, focus: null, pan: { x: 0, y: 0 } }, status: "active", turn: 1, selectedCombatantId: null, plannedMove: null, plannedAttackTargetId: null, plannedAttackMode: null, grenadeTargeting: false, plannedGrenadeTarget: null, plannedOpenDoorId: null, plannedBreachDoorId: null, plannedExtinguishFire: null, smokeClearsAtTurnByCell: {}, placedBreachingChargeByDoorId: {}, vacuumExposureByCombatantId: {}, coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], plannedTreatmentTargetId: null, recoveringCombatantIds: [], evadingCombatantIds: [], trottingCombatantIds: [], suppressedCombatantIds: [], draggingCombatantByCarrierId: {}, maintainedTargetByCombatantId: {}, plannedObjectiveId: null, hoveredDestination: null, actionPointsById: {}, ammunitionById: {}, actedCombatantIds: [], events: [], hudLayouts: freshHudLayouts() };
const slice = createSlice({ name: "characterCombat", initialState: initialCharacterCombatState, reducers: {
  loadCombatScenario: (state, action: PayloadAction<CombatScenario>) => { state.scenario = action.payload; state.combatantStarts = startingCombatants(action.payload); state.outcome = null; state.camera.focus = null; state.camera.pan = { x: 0, y: 0 }; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedOpenDoorId = null; state.plannedBreachDoorId = null; state.plannedExtinguishFire = null; state.smokeClearsAtTurnByCell = {}; state.placedBreachingChargeByDoorId = {}; state.vacuumExposureByCombatantId = {}; state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; state.coveringFireLanes = []; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.evadingCombatantIds = []; state.trottingCombatantIds = []; state.suppressedCombatantIds = []; state.draggingCombatantByCarrierId = {}; state.maintainedTargetByCombatantId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = freshActionPoints(action.payload); state.ammunitionById = freshAmmunition(action.payload); state.actedCombatantIds = []; state.events = []; },
  clearCombatScenario: (state) => { state.scenario = null; state.combatantStarts = {}; state.outcome = null; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedOpenDoorId = null; state.plannedBreachDoorId = null; state.plannedExtinguishFire = null; state.smokeClearsAtTurnByCell = {}; state.placedBreachingChargeByDoorId = {}; state.vacuumExposureByCombatantId = {}; state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; state.coveringFireLanes = []; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.evadingCombatantIds = []; state.trottingCombatantIds = []; state.suppressedCombatantIds = []; state.draggingCombatantByCarrierId = {}; state.maintainedTargetByCombatantId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = {}; state.ammunitionById = {}; state.actedCombatantIds = []; state.events = []; },
  selectPlayerCombatant: (state, action: PayloadAction<string | null>) => {
    if (state.status !== "active") return;
    if (action.payload === null) { state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedObjectiveId = null; state.hoveredDestination = null; return; }
    const combatant = state.scenario?.combatants.find((unit) => unit.id === action.payload);
    if (combatant?.side === "player" && !combatant.defeated) { const maintained = state.maintainedTargetByCombatantId[combatant.id]; state.selectedCombatantId = combatant.id; state.plannedMove = null; state.plannedAttackTargetId = !state.trottingCombatantIds.includes(combatant.id) && maintained && state.scenario && rangedEnemies(state.scenario, combatant.id).some((target) => target.id === maintained) ? maintained : null; state.plannedAttackMode = null; state.plannedObjectiveId = null; state.hoveredDestination = null; }
  },
  startTrot: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!id || !unit || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.suppressedCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) !== 6) return;
    state.trottingCombatantIds.push(id);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift(`${unit.name} committed to a trot and cannot attack this activation`);
  },
  beginDragging: (state, action: PayloadAction<string>) => {
    const carrierId = state.selectedCombatantId;
    const carrier = state.scenario?.combatants.find((unit) => unit.id === carrierId && unit.side === "player" && !unit.defeated);
    const patient = state.scenario?.combatants.find((unit) => unit.id === action.payload && unit.side === carrier?.side && unit.defeated && unit.woundState !== "dead");
    if (!carrierId || !carrier || !patient || state.status !== "active" || state.actedCombatantIds.includes(carrierId) || Math.abs(carrier.position.x - patient.position.x) + Math.abs(carrier.position.y - patient.position.y) !== 1 || Object.values(state.draggingCombatantByCarrierId).includes(patient.id)) return;
    state.draggingCombatantByCarrierId[carrierId] = patient.id;
    state.events.unshift(`${carrier.name} began dragging ${patient.name}`);
  },
  releaseDraggedCombatant: (state) => {
    const carrierId = state.selectedCombatantId;
    if (!carrierId || !state.draggingCombatantByCarrierId[carrierId]) return;
    const patient = state.scenario?.combatants.find((unit) => unit.id === state.draggingCombatantByCarrierId[carrierId]);
    delete state.draggingCombatantByCarrierId[carrierId];
    state.events.unshift(`${patient?.name ?? "Incapacitated character"} released`);
  },
  previewMove: (state, action: PayloadAction<GridPoint>) => {
    if (state.status !== "active" || !state.scenario || !state.selectedCombatantId || state.actedCombatantIds.includes(state.selectedCombatantId)) return;
    const movementLimit = state.draggingCombatantByCarrierId[state.selectedCombatantId] || state.suppressedCombatantIds.includes(state.selectedCombatantId) ? 2 : state.trottingCombatantIds.includes(state.selectedCombatantId) ? 6 : 4;
    state.plannedMove = state.scenario.gravityMode === "zero-g" ? ((state.actionPointsById[state.selectedCombatantId] ?? 0) >= 3 ? zeroGravityPushes(state.scenario, state.selectedCombatantId).get(pointKey(action.payload)) ?? null : null) : proposedMoveFor(state.scenario, state.selectedCombatantId, action.payload, Math.min(movementLimit, state.actionPointsById[state.selectedCombatantId] ?? 0));
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  confirmMove: (state) => {
    const scenario = state.scenario;
    const move = state.plannedMove;
    if (state.status !== "active" || !scenario || !move || state.actedCombatantIds.includes(move.combatantId)) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === move.combatantId);
    if (!unit || move.path.length === 0) return;
    const before = move.path.length > 1 ? move.path[move.path.length - 2] : unit.position;
    const final = move.destination;
    const dx = final.x - before.x;
    const dy = final.y - before.y;
    const dragged = state.draggingCombatantByCarrierId[unit.id] ? scenario.combatants.find((combatant) => combatant.id === state.draggingCombatantByCarrierId[unit.id]) : null;
    unit.position = final;
    if (dragged) dragged.position = { ...before };
    unit.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
    state.actionPointsById[unit.id] = Math.max(0, (state.actionPointsById[unit.id] ?? 0) - move.cost);
    if (state.actionPointsById[unit.id] === 0 && !state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
    state.events.unshift(`${unit.name} moved to ${final.x},${final.y}`);
    if (scenario.fireCells?.some((cell) => pointKey(cell) === pointKey(final))) applyFireDamage(state, unit);
    state.plannedMove = null;
    const extraction = scenario.objects.find((object) => object.kind === "extraction" && !object.completed);
    if (unit.id === scenario.captiveId && extraction && pointKey(unit.position) === pointKey(extraction.position)) {
      extraction.completed = true;
      state.status = "victory";
      state.selectedCombatantId = null;
      state.events.unshift(`${unit.name} reached extraction`);
      finalizeOutcome(state);
      return;
    }
    const maintained = state.maintainedTargetByCombatantId[unit.id];
    state.plannedAttackTargetId = !state.trottingCombatantIds.includes(unit.id) && maintained && rangedEnemies(scenario, unit.id).some((target) => target.id === maintained) ? maintained : null;
    state.hoveredDestination = null;
  },
  turnCombatant: (state, action: PayloadAction<"left" | "right">) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 1) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId && combatant.side === "player" && !combatant.defeated);
    if (!unit) return;
    const facings = ["north", "east", "south", "west"] as const;
    const offset = action.payload === "right" ? 1 : -1;
    unit.facing = facings[(facings.indexOf(unit.facing) + offset + facings.length) % facings.length];
    state.actionPointsById[unit.id] -= 1;
    if (state.actionPointsById[unit.id] === 0) state.actedCombatantIds.push(unit.id);
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
    state.hoveredDestination = null;
    state.events.unshift(`${unit.name} turned ${action.payload} to face ${unit.facing} (1 AP)`);
  },
  previewOpenDoor: (state, action: PayloadAction<string>) => {
    const id = state.selectedCombatantId;
    if (!id || !state.scenario || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 6 || !closedDoorsAdjacentTo(state.scenario, id).some((door) => door.id === action.payload) || state.placedBreachingChargeByDoorId[action.payload]) return;
    state.plannedOpenDoorId = action.payload;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
  },
  confirmOpenDoor: (state) => {
    const id = state.selectedCombatantId;
    const door = id && state.scenario ? closedDoorsAdjacentTo(state.scenario, id).find((candidate) => candidate.id === state.plannedOpenDoorId && !state.placedBreachingChargeByDoorId[candidate.id]) : null;
    if (!id || !door || (state.actionPointsById[id] ?? 0) < 6) return;
    openDoorAndApplyDecompression(state, door);
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.plannedOpenDoorId = null;
    state.events.unshift(`${state.scenario?.combatants.find((unit) => unit.id === id)?.name ?? id} opened ${door.id}`);
  },
  cancelOpenDoor: (state) => { state.plannedOpenDoorId = null; },
  openDoor: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 6) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
    const door = closedDoorsAdjacentTo(scenario, combatantId).find((candidate) => candidate.id === action.payload && !state.placedBreachingChargeByDoorId[candidate.id]);
    if (!unit || !door) return;
    openDoorAndApplyDecompression(state, door);
    state.actionPointsById[unit.id] = 0;
    state.actedCombatantIds.push(unit.id);
    state.plannedMove = null;
    state.hoveredDestination = null;
    state.events.unshift(`${unit.name} opened ${door.id}`);
  },
  closeDoor: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 3) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
    const door = openDoorsAdjacentTo(scenario, combatantId).find((candidate) => candidate.id === action.payload);
    if (!unit || !door) return;
    door.open = false;
    state.actionPointsById[unit.id] -= 3;
    if (state.actionPointsById[unit.id] === 0) state.actedCombatantIds.push(unit.id);
    state.events.unshift(`${unit.name} closed ${door.id} (3 AP)`);
  },
  previewExtinguishFire: (state, action: PayloadAction<GridPoint>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const unit = scenario?.combatants.find((combatant) => combatant.id === id && !combatant.defeated);
    if (!scenario || !id || !unit || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3) return;
    const adjacent = Math.abs(unit.position.x - action.payload.x) + Math.abs(unit.position.y - action.payload.y) === 1;
    if (adjacent && scenario.fireCells?.some((cell) => pointKey(cell) === pointKey(action.payload))) state.plannedExtinguishFire = action.payload;
  },
  confirmExtinguishFire: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const fire = state.plannedExtinguishFire;
    const unit = scenario?.combatants.find((combatant) => combatant.id === id && !combatant.defeated);
    if (!scenario || !id || !unit || !fire || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3) return;
    const fireIndex = scenario.fireCells?.findIndex((cell) => pointKey(cell) === pointKey(fire)) ?? -1;
    if (fireIndex < 0 || Math.abs(unit.position.x - fire.x) + Math.abs(unit.position.y - fire.y) !== 1) return;
    const pairedSmoke = scenario.smokeCells?.filter((cell) => !state.smokeClearsAtTurnByCell[pointKey(cell)]).sort((a, b) => distanceBetween(a, fire) - distanceBetween(b, fire))[0];
    scenario.fireCells!.splice(fireIndex, 1);
    if (pairedSmoke) state.smokeClearsAtTurnByCell[pointKey(pairedSmoke)] = state.turn + 1;
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedExtinguishFire = null;
    state.events.unshift(`${unit.name} extinguished fire at ${fire.x},${fire.y} (3 AP)`);
  },
  cancelExtinguishFire: (state) => { state.plannedExtinguishFire = null; },
  previewAttack: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !attackerId || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId]) return;
    if (rangedEnemies(scenario, attackerId).some((target) => target.id === action.payload)) {
      state.plannedAttackTargetId = action.payload;
      state.plannedAttackMode = null;
      state.plannedMove = null;
      state.plannedObjectiveId = null;
      state.hoveredDestination = null;
    }
  },
  selectAttackMode: (state, action: PayloadAction<FireMode>) => { if (state.plannedAttackTargetId) state.plannedAttackMode = action.payload; },
  confirmAttack: (state, action: PayloadAction<{ hitDice: DicePair; woundDice: DicePair; moraleRolls?: MoraleRolls }>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    const targetId = state.plannedAttackTargetId;
    const fireMode = state.plannedAttackMode;
    const apCost = fireMode === "aimed" || fireMode === "automatic" ? 6 : 3;
    const ammunitionCost = fireMode === "automatic" || fireMode === "covering" ? 3 : fireMode === "melee" ? 0 : 1;
    if (state.status !== "active" || !scenario || !attackerId || !targetId || !fireMode || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId] || (state.actionPointsById[attackerId] ?? 0) < apCost) return;
    const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
    const target = (fireMode === "melee" ? adjacentEnemies(scenario, attackerId) : rangedEnemies(scenario, attackerId)).find((unit) => unit.id === targetId);
    if (!attacker || !target || (fireMode === "automatic" && !attacker.weapon.automatic) || (state.ammunitionById[attackerId] ?? 0) < ammunitionCost) return;
    const attackerSuppressed = state.suppressedCombatantIds.includes(attacker.id);
    const meleeResult = fireMode === "melee" ? resolveMelee(attacker, target, action.payload.hitDice.first, attackerSuppressed) : null;
    const fireResult = fireMode !== "melee" ? resolveSnapShot(attacker, target, action.payload.hitDice, action.payload.woundDice, coverProtection(scenario, attacker.id, target.id), fireMode, state.evadingCombatantIds.includes(target.id), attackerSuppressed) : null;
    const woundState = meleeResult?.woundState ?? fireResult?.woundState;
    if (!woundState) return;
    if (fireResult && !fireResult.hit && fireResult.targetNumber - fireResult.hitTotal <= 2 && !state.suppressedCombatantIds.includes(target.id)) state.suppressedCombatantIds.push(target.id);
    target.woundState = woundState;
    target.defeated = woundState === "serious" || woundState === "unconscious" || woundState === "dead";
    if (target.defeated) target.health = 0;
    if (fireMode !== "melee") state.maintainedTargetByCombatantId[attacker.id] = target.id;
    if (fireMode !== "melee") state.ammunitionById[attacker.id] -= ammunitionCost;
    if (fireMode !== "melee") applyZeroGravityRecoil(state, attacker.id);
    if (target.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[combatantId]; });
    state.actionPointsById[attacker.id] -= apCost;
    if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
    state.events.unshift(meleeResult ? `${attacker.name} melee attacked ${target.name} through ${meleeResult.attackArc} arc (+${meleeResult.arcModifier}): ${meleeResult.roll} ${meleeResult.modifier >= 0 ? "+" : ""}${meleeResult.modifier} = ${meleeResult.total} (${meleeResult.woundState})` : `${attacker.name} ${fireMode} fired at ${target.name} through ${fireResult!.attackArc} arc (+${fireResult!.arcModifier}): hit ${fireResult!.hitTotal}/${fireResult!.targetNumber} (weapon accuracy ${fireResult!.weaponAccuracy >= 0 ? "+" : ""}${fireResult!.weaponAccuracy}), ${fireResult!.hit ? `wound ${fireResult!.woundTotal} (${fireResult!.woundState}, penetration +${fireResult!.weaponPenetration}, cover -${fireResult!.cover})` : `miss (cover -${fireResult!.cover})`}`);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    if (target.side === "enemy" && target.defeated) resolveEnemyMorale(state, action.payload.moraleRolls);
  },
  cancelAttackPreview: (state) => { state.plannedAttackTargetId = null; state.plannedAttackMode = null; },
  beginCoveringFire: (state) => {
    const id = state.selectedCombatantId;
    if (!id || !state.scenario || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) < 3) return;
    state.coveringFireTargeting = true;
    state.plannedCoveringFireTarget = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedMove = null;
  },
  previewCoveringFire: (state, action: PayloadAction<GridPoint>) => {
    const id = state.selectedCombatantId;
    if (!id || !state.scenario || !state.coveringFireTargeting || !validCoveringFireTargets(state.scenario, id).some((point) => pointKey(point) === pointKey(action.payload))) return;
    state.plannedCoveringFireTarget = action.payload;
  },
  confirmCoveringFire: (state) => {
    const id = state.selectedCombatantId;
    const target = state.plannedCoveringFireTarget;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === id);
    if (!id || !target || !attacker || !state.scenario || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) < 3) return;
    const cells = fireLaneCells(state.scenario, attacker.position, target);
    if (cells.length === 0) return;
    state.coveringFireLanes = [...state.coveringFireLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target, cells }];
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.coveringFireTargeting = false;
    state.plannedCoveringFireTarget = null;
    state.events.unshift(`${attacker.name} covers lane to ${target.x},${target.y} (3 AP, 3 ammo reserved)`);
  },
  cancelCoveringFire: (state) => { state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; },
  beginGrenadeTargeting: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || unit.grenades < 1 || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 6) return;
    state.grenadeTargeting = true;
    state.plannedGrenadeTarget = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
  },
  previewGrenadeTarget: (state, action: PayloadAction<GridPoint>) => {
    const id = state.selectedCombatantId;
    if (!state.grenadeTargeting || !state.scenario || !id) return;
    if (validGrenadeTargets(state.scenario, id).some((point) => pointKey(point) === pointKey(action.payload))) state.plannedGrenadeTarget = action.payload;
  },
  cancelGrenadeTargeting: (state) => { state.grenadeTargeting = false; state.plannedGrenadeTarget = null; },
  confirmGrenade: (state, action: PayloadAction<{ rollsByCombatantId: Record<string, DicePair>; moraleRolls?: MoraleRolls }>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    const center = state.plannedGrenadeTarget;
    const attacker = scenario?.combatants.find((unit) => unit.id === attackerId);
    if (state.status !== "active" || !scenario || !attackerId || !attacker || !center || !state.grenadeTargeting || attacker.grenades < 1 || state.actedCombatantIds.includes(attackerId) || (state.actionPointsById[attackerId] ?? 0) < 6) return;
    if (!validGrenadeTargets(scenario, attackerId).some((point) => pointKey(point) === pointKey(center))) return;
    const blastKeys = new Set(grenadeBlastCells(scenario, center).map(pointKey));
    const affected = scenario.combatants.filter((unit) => !unit.defeated && blastKeys.has(pointKey(unit.position)));
    affected.forEach((target) => {
      const dice = action.payload.rollsByCombatantId[target.id];
      if (!dice) return;
      const cover = grenadeCoverProtection(scenario, center, target.position);
      const total = dice.first + dice.second + 4 - target.armor - cover;
      target.woundState = woundStateForTotal(total);
      target.defeated = target.woundState === "serious" || target.woundState === "unconscious" || target.woundState === "dead";
      if (target.defeated) {
        target.health = 0;
        Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[combatantId]; });
      }
      state.events.unshift(`${target.name} caught in grenade blast: ${dice.first + dice.second} +4 -${target.armor} armor -${cover} cover = ${total} (${target.woundState})`);
    });
    attacker.grenades -= 1;
    state.actionPointsById[attackerId] = 0;
    if (!state.actedCombatantIds.includes(attackerId)) state.actedCombatantIds.push(attackerId);
    state.events.unshift(`${attacker.name} threw a fragmentation grenade at ${center.x},${center.y} (6 AP)`);
    state.grenadeTargeting = false;
    state.plannedGrenadeTarget = null;
    if (resolveRescueFailure(state)) return;
    if (affected.some((unit) => unit.side === "enemy" && unit.defeated)) resolveEnemyMorale(state, action.payload.moraleRolls);
  },
  previewTreatment: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const medicId = state.selectedCombatantId;
    const medic = scenario?.combatants.find((unit) => unit.id === medicId);
    if (state.status !== "active" || !scenario || !medicId || !medic || medic.medkits < 1 || state.actedCombatantIds.includes(medicId) || (state.actionPointsById[medicId] ?? 0) < 6) return;
    if (treatableAllies(scenario, medicId).some((patient) => patient.id === action.payload)) {
      state.plannedTreatmentTargetId = action.payload;
      state.plannedMove = null;
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      state.grenadeTargeting = false;
      state.plannedGrenadeTarget = null;
      state.plannedObjectiveId = null;
    }
  },
  cancelTreatmentPreview: (state) => { state.plannedTreatmentTargetId = null; },
  confirmTreatment: (state) => {
    const scenario = state.scenario;
    const medicId = state.selectedCombatantId;
    const patientId = state.plannedTreatmentTargetId;
    const medic = scenario?.combatants.find((unit) => unit.id === medicId);
    const patient = scenario && medicId && patientId ? treatableAllies(scenario, medicId).find((unit) => unit.id === patientId) : null;
    if (state.status !== "active" || !scenario || !medicId || !medic || !patient || medic.medkits < 1 || state.actedCombatantIds.includes(medicId) || (state.actionPointsById[medicId] ?? 0) < 6) return;
    const wasIncapacitated = patient.defeated;
    patient.woundState = patient.woundState === "unconscious" ? "serious" : patient.woundState === "serious" ? "light" : "healthy";
    if (wasIncapacitated && !state.recoveringCombatantIds.includes(patient.id)) state.recoveringCombatantIds.push(patient.id);
    medic.medkits -= 1;
    state.actionPointsById[medicId] = 0;
    if (!state.actedCombatantIds.includes(medicId)) state.actedCombatantIds.push(medicId);
    state.events.unshift(`${medic.name} treated ${patient.name}: ${patient.woundState}${wasIncapacitated ? " (recovers next turn)" : ""}`);
    state.plannedTreatmentTargetId = null;
  },
  previewSecureObjective: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId)) return;
    if (adjacentObjectives(scenario, combatantId).some((objective) => objective.id === action.payload)) {
      state.plannedObjectiveId = action.payload;
      state.plannedMove = null;
      state.plannedAttackTargetId = null;
      state.hoveredDestination = null;
    }
  },
  confirmSecureObjective: (state) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    const objectiveId = state.plannedObjectiveId;
    if (state.status !== "active" || !scenario || !combatantId || !objectiveId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 6) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
    const objective = adjacentObjectives(scenario, combatantId).find((candidate) => candidate.id === objectiveId);
    if (!unit || !objective) return;
    state.actedCombatantIds.push(unit.id);
    state.actionPointsById[unit.id] = 0;
    state.plannedObjectiveId = null;
    if (objective.kind === "prisoner" && scenario.captiveId) {
      const captive = scenario.combatants.find((candidate) => candidate.id === scenario.captiveId);
      if (!captive) return;
      objective.completed = true;
      captive.defeated = false;
      captive.health = 1;
      captive.woundState = "healthy";
      state.actionPointsById[captive.id] = 0;
      if (!state.actedCombatantIds.includes(captive.id)) state.actedCombatantIds.push(captive.id);
      state.events.unshift(`${unit.name} released ${captive.name}; escort them to extraction`);
    } else if (scenario.victoryCondition === "staged-objectives") {
      objective.completed = true;
      const remainingStage = scenario.stageObjectiveIds?.find((id) => !scenario.objects.find((candidate) => candidate.id === id)?.completed);
      if (remainingStage) {
        const door = scenario.doors.find((candidate) => candidate.id === scenario.stageUnlockDoorId);
        if (door && !state.placedBreachingChargeByDoorId[door.id]) { door.locked = false; door.open = true; }
        state.events.unshift(`${unit.name} disabled ${objective.label}; bridge access unlocked`);
      } else {
        state.status = "victory";
        state.selectedCombatantId = null;
        state.events.unshift(`${unit.name} secured ${objective.label}`);
        finalizeOutcome(state);
      }
    } else {
      objective.completed = true;
      if (scenario.id === "hull-breach") {
        scenario.vacuumSources = [];
        state.vacuumExposureByCombatantId = {};
        state.events.unshift(`${unit.name} sealed the hull breach; compartments repressurized`);
      }
      state.status = "victory";
      state.selectedCombatantId = null;
      if (scenario.id !== "hull-breach") state.events.unshift(objective.kind === "extraction" ? `${unit.name} reached extraction` : `${unit.name} secured ${objective.label}`);
      finalizeOutcome(state);
    }
  },
  cancelObjectivePreview: (state) => { state.plannedObjectiveId = null; },
  previewBreachDoor: (state, action: PayloadAction<string>) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    const door = id && state.scenario ? breachableDoorsAdjacentTo(state.scenario, id).find((candidate) => candidate.id === action.payload) : null;
    if (!id || !unit || !door || state.placedBreachingChargeByDoorId[door.id] || state.status !== "active" || state.actedCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 3 || (unit.breachingCharges ?? 1) < 1) return;
    state.plannedBreachDoorId = door.id;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  confirmBreachDoor: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const unit = scenario?.combatants.find((combatant) => combatant.id === id);
    const door = scenario?.doors.find((candidate) => candidate.id === state.plannedBreachDoorId && !candidate.open);
    if (!scenario || !id || !unit || !door || state.placedBreachingChargeByDoorId[door.id] || !breachableDoorsAdjacentTo(scenario, id).some((candidate) => candidate.id === door.id) || (state.actionPointsById[id] ?? 0) < 3 || (unit.breachingCharges ?? 1) < 1) return;
    state.placedBreachingChargeByDoorId[door.id] = id;
    unit.breachingCharges = (unit.breachingCharges ?? 1) - 1;
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedBreachDoorId = null;
    state.events.unshift(`${unit.name} placed a charge on ${door.id} (3 AP)`);
  },
  previewBreachDetonation: (state, action: PayloadAction<string>) => {
    const id = state.selectedCombatantId;
    if (!id || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 1 || state.placedBreachingChargeByDoorId[action.payload] !== id) return;
    state.plannedBreachDoorId = action.payload;
  },
  detonateBreachCharge: (state, action: PayloadAction<{ rollsByCombatantId: Record<string, DicePair> }>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const unit = scenario?.combatants.find((combatant) => combatant.id === id);
    const door = scenario?.doors.find((candidate) => candidate.id === state.plannedBreachDoorId);
    if (!scenario || !id || !unit || !door || state.placedBreachingChargeByDoorId[door.id] !== id || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 1) return;
    const blastKeys = new Set(doorBlastCells(door).map(pointKey));
    scenario.combatants.filter((target) => !target.defeated && blastKeys.has(pointKey(target.position))).forEach((target) => {
      const dice = action.payload.rollsByCombatantId[target.id];
      if (!dice) return;
      const total = dice.first + dice.second + 4 - target.armor;
      target.woundState = woundStateForTotal(total);
      target.defeated = target.woundState === "serious" || target.woundState === "unconscious" || target.woundState === "dead";
      if (target.defeated) target.health = 0;
      state.events.unshift(`${target.name} caught in breaching blast: ${total} (${target.woundState})`);
    });
    door.locked = false;
    door.open = true;
    delete state.placedBreachingChargeByDoorId[door.id];
    state.actionPointsById[id] -= 1;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedBreachDoorId = null;
    state.events.unshift(`${unit.name} remotely detonated ${door.id} (1 AP)`);
  },
  cancelBreachDoor: (state) => { state.plannedBreachDoorId = null; },
  reloadWeapon: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!scenario || !id || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) >= magazineSize(scenario, id)) return;
    state.ammunitionById[id] = magazineSize(scenario, id);
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift(`${scenario.combatants.find((unit) => unit.id === id)?.name ?? id} reloaded (3 AP)`);
  },
  evade: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!scenario || !id || state.status !== "active" || state.actedCombatantIds.includes(id) || state.evadingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 3) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!unit) return;
    state.evadingCombatantIds.push(id);
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
    state.events.unshift(`${unit.name} is evading until their next activation (3 AP)`);
  },
  rally: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && !combatant.defeated);
    if (!id || !unit || state.status !== "active" || !state.suppressedCombatantIds.includes(id) || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3) return;
    state.suppressedCombatantIds = state.suppressedCombatantIds.filter((combatantId) => combatantId !== id);
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.events.unshift(`${unit.name} rallied (3 AP)`);
  },
  finishActivation: (state) => { const id = state.selectedCombatantId; if (!id || state.actedCombatantIds.includes(id)) return; state.actionPointsById[id] = 0; state.actedCombatantIds.push(id); state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedTreatmentTargetId = null; state.plannedObjectiveId = null; },
  endPlayerTurn: (state, action: PayloadAction<{ enemyRolls: Record<string, { hitDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls }>) => {
    const scenario = state.scenario;
    const playerIds = scenario?.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) ?? [];
    if (state.status !== "active" || playerIds.length === 0 || !playerIds.every((id) => state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) === 0)) return;
    for (const enemy of scenario!.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated)) {
      const activePlayers = scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
      if (activePlayers.length === 0) break;
      const coveringLane = state.coveringFireLanes.find((lane) => lane.cells.some((cell) => pointKey(cell) === pointKey(enemy.position)));
      const coveringAttackerId = coveringLane?.attackerId;
      if (coveringAttackerId) {
        const coveringAttacker = scenario!.combatants.find((unit) => unit.id === coveringAttackerId && !unit.defeated);
        const validTarget = coveringAttacker && rangedEnemies(scenario!, coveringAttacker.id).some((candidate) => candidate.id === enemy.id);
        const dice = action.payload.enemyRolls[enemy.id];
        state.coveringFireLanes = state.coveringFireLanes.filter((lane) => lane !== coveringLane);
        if (coveringAttacker && validTarget && dice) {
          if ((state.ammunitionById[coveringAttacker.id] ?? 0) < 3) continue;
          state.ammunitionById[coveringAttacker.id] -= 3;
          const reaction = resolveSnapShot(coveringAttacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, coveringAttacker.id, enemy.id), "covering", state.evadingCombatantIds.includes(enemy.id));
          if (reaction) {
            if (!state.suppressedCombatantIds.includes(enemy.id)) state.suppressedCombatantIds.push(enemy.id);
            enemy.woundState = reaction.woundState;
            enemy.defeated = reaction.woundState === "serious" || reaction.woundState === "unconscious" || reaction.woundState === "dead";
            if (enemy.defeated) enemy.health = 0;
            state.events.unshift(`${coveringAttacker.name} covering fired at ${enemy.name} through ${reaction.attackArc} arc (+${reaction.arcModifier}): hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}`);
            applyZeroGravityRecoil(state, coveringAttacker.id);
            if (enemy.defeated) {
              state.events.unshift(`${enemy.name} action interrupted`);
              resolveEnemyMorale(state, action.payload.moraleRolls);
              if (scenario!.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)) return;
              continue;
            }
          }
        }
      }
      const target = [...activePlayers].sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const meleeTarget = adjacentEnemies(scenario!, enemy.id).find((candidate) => candidate.side === "player");
      if (meleeTarget) {
        const dice = action.payload.enemyRolls[enemy.id];
        if (!dice) continue;
        const result = resolveMelee(enemy, meleeTarget, dice.hitDice.first, state.suppressedCombatantIds.includes(enemy.id));
        meleeTarget.woundState = result.woundState;
        meleeTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
        if (meleeTarget.defeated) meleeTarget.health = 0;
        if (meleeTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === meleeTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
        state.actionPointsById[enemy.id] = 3;
        state.events.unshift(`${enemy.name} melee attacked ${meleeTarget.name} through ${result.attackArc} arc (+${result.arcModifier}): ${result.roll} ${result.modifier >= 0 ? "+" : ""}${result.modifier} = ${result.total} (${result.woundState})`);
        if (resolveRescueFailure(state)) return;
        continue;
      }
      const attackTarget = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const attackProfile = attackTarget ? snapShotTarget(enemy, attackTarget) : null;
      const approachGoals = attackTarget ? [
        { x: attackTarget.position.x + 1, y: attackTarget.position.y },
        { x: attackTarget.position.x, y: attackTarget.position.y + 1 },
        { x: attackTarget.position.x - 1, y: attackTarget.position.y },
        { x: attackTarget.position.x, y: attackTarget.position.y - 1 },
      ] : [];
      const openApproach = attackTarget && scenario!.victoryCondition !== "hold-zone" && attackProfile && shouldImproveEnemyRange(enemy, attackProfile.rangeBand)
        ? shortestPathToAny(scenario!, enemy.id, approachGoals) : null;
      const doorApproach = !openApproach && attackTarget && scenario!.victoryCondition !== "hold-zone" && attackProfile && shouldImproveEnemyRange(enemy, attackProfile.rangeBand)
        ? routeAllowingClosedDoors(scenario!, enemy.id, approachGoals) : null;
      const improvingRange = Boolean(openApproach?.length || doorApproach?.door);
      if (attackTarget && !improvingRange) {
        const ammunition = state.ammunitionById[enemy.id] ?? 0;
        if (ammunition === 0) {
          state.ammunitionById[enemy.id] = magazineSize(scenario!, enemy.id);
          state.actionPointsById[enemy.id] = 3;
          state.events.unshift(`${enemy.name} reloaded (3 AP)`);
          continue;
        }
        const dice = action.payload.enemyRolls[enemy.id];
        if (!dice) continue;
        const enemyFireMode: FireMode = enemy.weapon.automatic && ammunition >= 3 ? "automatic" : "aimed";
        const result = resolveSnapShot(enemy, attackTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, attackTarget.id), enemyFireMode, state.evadingCombatantIds.includes(attackTarget.id), state.suppressedCombatantIds.includes(enemy.id));
        if (!result) continue;
        if (!result.hit && result.targetNumber - result.hitTotal <= 2 && !state.suppressedCombatantIds.includes(attackTarget.id)) state.suppressedCombatantIds.push(attackTarget.id);
        attackTarget.woundState = result.woundState;
        attackTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
        if (attackTarget.defeated) attackTarget.health = 0;
        if (attackTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === attackTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
        state.ammunitionById[enemy.id] -= enemyFireMode === "automatic" ? 3 : 1;
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} ${enemyFireMode} fired at ${attackTarget.name} through ${result.attackArc} arc (+${result.arcModifier}): hit ${result.hitTotal}/${result.targetNumber} (weapon accuracy ${result.weaponAccuracy >= 0 ? "+" : ""}${result.weaponAccuracy}), ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, penetration +${result.weaponPenetration}, cover -${result.cover})` : `miss (cover -${result.cover})`}`);
        applyZeroGravityRecoil(state, enemy.id);
        if (resolveRescueFailure(state)) return;
        continue;
      }
      let path: GridPoint[];
      if (scenario!.gravityMode === "zero-g") {
        const adjacentDoor = closedDoorsAdjacentTo(scenario!, enemy.id)[0];
        if (adjacentDoor) {
          if (state.placedBreachingChargeByDoorId[adjacentDoor.id]) state.events.unshift(`${enemy.name} stopped at armed ${adjacentDoor.id}`);
          else if (openingDoorWouldExpose(scenario!, adjacentDoor.id, enemy.id)) state.events.unshift(`${enemy.name} refused to open ${adjacentDoor.id} into vacuum`);
          else { openDoorAndApplyDecompression(state, adjacentDoor); state.events.unshift(`${enemy.name} opened ${adjacentDoor.id} (6 AP)`); }
          state.actionPointsById[enemy.id] = 0;
          continue;
        }
        const pushes = [...zeroGravityPushes(scenario!, enemy.id).values()].sort((a, b) => {
          const score = (move: typeof a) => distanceBetween(move.destination, target.position) + (snapShotTarget({ ...enemy, position: move.destination }, target) ? -10 : 0);
          return score(a) - score(b) || pointKey(a.destination).localeCompare(pointKey(b.destination));
        });
        if (pushes.length === 0) continue;
        path = pushes[0].path;
      } else {
        const control = scenario!.victoryCondition === "hold-zone" ? scenario!.objects.find((object) => object.kind === "control") : null;
        const movementGoals = control ? [control.position] : [
          { x: target.position.x + 1, y: target.position.y },
          { x: target.position.x, y: target.position.y + 1 },
          { x: target.position.x - 1, y: target.position.y },
          { x: target.position.x, y: target.position.y - 1 },
        ];
        let route = shortestPathToAny(scenario!, enemy.id, movementGoals);
        if (!route) {
          const doorRoute = routeAllowingClosedDoors(scenario!, enemy.id, movementGoals);
          if (!doorRoute?.door) continue;
          if (doorRoute.doorStepIndex === 0) {
            if (state.placedBreachingChargeByDoorId[doorRoute.door.id]) {
              state.actionPointsById[enemy.id] = 0;
              state.events.unshift(`${enemy.name} stopped at armed ${doorRoute.door.id}`);
              continue;
            }
            if (openingDoorWouldExpose(scenario!, doorRoute.door.id, enemy.id)) {
              state.actionPointsById[enemy.id] = 0;
              state.events.unshift(`${enemy.name} refused to open ${doorRoute.door.id} into vacuum`);
              continue;
            }
            openDoorAndApplyDecompression(state, doorRoute.door);
            state.actionPointsById[enemy.id] = 0;
            state.events.unshift(`${enemy.name} opened ${doorRoute.door.id} (6 AP)`);
            continue;
          }
          route = doorRoute.path.slice(0, doorRoute.doorStepIndex);
        }
        if (route.length === 0) continue;
        path = route.slice(0, state.suppressedCombatantIds.includes(enemy.id) ? 2 : 3);
      }
      const crossedLane = state.coveringFireLanes.find((lane) => path.some((step) => lane.cells.some((cell) => pointKey(cell) === pointKey(step))));
      if (crossedLane) {
        const coveringAttacker = scenario!.combatants.find((unit) => unit.id === crossedLane.attackerId && !unit.defeated);
        const dice = action.payload.enemyRolls[enemy.id];
        state.coveringFireLanes = state.coveringFireLanes.filter((lane) => lane !== crossedLane);
        if (coveringAttacker && dice && (state.ammunitionById[coveringAttacker.id] ?? 0) >= 3) {
          state.ammunitionById[coveringAttacker.id] -= 3;
          const reaction = resolveSnapShot(coveringAttacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, coveringAttacker.id, enemy.id), "covering", state.evadingCombatantIds.includes(enemy.id));
          if (reaction) {
            if (!state.suppressedCombatantIds.includes(enemy.id)) state.suppressedCombatantIds.push(enemy.id);
            enemy.woundState = reaction.woundState;
            enemy.defeated = reaction.woundState === "serious" || reaction.woundState === "unconscious" || reaction.woundState === "dead";
            if (enemy.defeated) enemy.health = 0;
            state.events.unshift(`${coveringAttacker.name} covering fired as ${enemy.name} crossed the lane: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}`);
            applyZeroGravityRecoil(state, coveringAttacker.id);
            if (enemy.defeated) {
              state.events.unshift(`${enemy.name} movement interrupted`);
              resolveEnemyMorale(state, action.payload.moraleRolls);
              if (scenario!.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)) return;
              continue;
            }
          }
        }
      }
      const move = { destination: path[path.length - 1], path, cost: scenario!.gravityMode === "zero-g" ? 3 : path.length };
      const before = move.path.length > 1 ? move.path[move.path.length - 2] : enemy.position;
      const dx = move.destination.x - before.x;
      const dy = move.destination.y - before.y;
      enemy.position = move.destination;
      enemy.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
      state.actionPointsById[enemy.id] = 6 - move.cost;
      state.events.unshift(`${enemy.name} moved to ${move.destination.x},${move.destination.y} (${move.cost} AP)`);
      if (resolveHoldZoneCapture(state)) return;
      const snapTarget = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const dice = action.payload.enemyRolls[enemy.id];
      if (!snapTarget || !dice || state.actionPointsById[enemy.id] < 3 || (state.ammunitionById[enemy.id] ?? 0) < 1) {
        if ((state.ammunitionById[enemy.id] ?? 0) === 0 && state.actionPointsById[enemy.id] >= 3) {
          state.ammunitionById[enemy.id] = magazineSize(scenario!, enemy.id);
          state.actionPointsById[enemy.id] -= 3;
          state.events.unshift(`${enemy.name} reloaded (3 AP)`);
        }
        continue;
      }
      const result = resolveSnapShot(enemy, snapTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, snapTarget.id), "snap", state.evadingCombatantIds.includes(snapTarget.id), state.suppressedCombatantIds.includes(enemy.id));
      if (!result) continue;
      if (!result.hit && result.targetNumber - result.hitTotal <= 2 && !state.suppressedCombatantIds.includes(snapTarget.id)) state.suppressedCombatantIds.push(snapTarget.id);
      snapTarget.woundState = result.woundState;
      snapTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
      if (snapTarget.defeated) snapTarget.health = 0;
      if (snapTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === snapTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
      state.ammunitionById[enemy.id] -= 1;
      state.actionPointsById[enemy.id] -= 3;
      state.events.unshift(`${enemy.name} snap fired at ${snapTarget.name} through ${result.attackArc} arc (+${result.arcModifier}): hit ${result.hitTotal}/${result.targetNumber} (weapon accuracy ${result.weaponAccuracy >= 0 ? "+" : ""}${result.weaponAccuracy}), ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, penetration +${result.weaponPenetration}, cover -${result.cover})` : `miss (cover -${result.cover})`}`);
      applyZeroGravityRecoil(state, enemy.id);
      if (resolveRescueFailure(state)) return;
    }
    const vacuum = depressurizedCells(scenario!);
    scenario!.combatants.filter((unit) => unit.woundState !== "dead" && !unit.surrendered).forEach((unit) => {
      if (unit.vaccSuit || !vacuum.has(pointKey(unit.position))) { delete state.vacuumExposureByCombatantId[unit.id]; return; }
      const exposure = (state.vacuumExposureByCombatantId[unit.id] ?? 0) + 1;
      state.vacuumExposureByCombatantId[unit.id] = exposure;
      unit.woundState = exposure === 1 ? "light" : exposure === 2 ? "serious" : "dead";
      unit.defeated = exposure >= 2;
      if (unit.defeated) unit.health = 0;
      state.events.unshift(`${unit.name} vacuum exposure ${exposure}: ${unit.woundState}`);
    });
    const fireCells = new Set((scenario!.fireCells ?? []).map(pointKey));
    scenario!.combatants.filter((unit) => !unit.defeated && !unit.surrendered && fireCells.has(pointKey(unit.position))).forEach((unit) => applyFireDamage(state, unit));
    if (scenario!.combatants.filter((unit) => unit.side === "player").every((unit) => unit.defeated)) {
      state.status = "defeat";
      state.selectedCombatantId = null;
      state.plannedMove = null;
      state.plannedAttackTargetId = null;
      state.plannedObjectiveId = null;
      state.hoveredDestination = null;
      state.events.unshift("Boarding team defeated");
      finalizeOutcome(state);
      return;
    }
    if (scenario!.victoryCondition === "hold-zone") {
      if (resolveHoldZoneCapture(state)) return;
      if (state.turn >= (scenario!.holdUntilTurn ?? Number.POSITIVE_INFINITY)) {
        state.status = "victory";
        state.selectedCombatantId = null;
        state.events.unshift(`Control zone held through turn ${state.turn}`);
        finalizeOutcome(state);
        return;
      }
    }
    state.recoveringCombatantIds.forEach((id) => {
      const patient = scenario!.combatants.find((unit) => unit.id === id && unit.woundState !== "dead");
      if (patient) { patient.defeated = false; patient.health = 1; state.events.unshift(`${patient.name} is active after treatment`); }
    });
    state.recoveringCombatantIds = [];
    state.evadingCombatantIds = [];
    state.trottingCombatantIds = [];
    const nextTurn = state.turn + 1;
    const clearingSmoke = new Set(Object.entries(state.smokeClearsAtTurnByCell).filter(([, clearTurn]) => clearTurn <= nextTurn).map(([key]) => key));
    scenario!.smokeCells = scenario!.smokeCells?.filter((cell) => !clearingSmoke.has(pointKey(cell)));
    clearingSmoke.forEach((key) => { delete state.smokeClearsAtTurnByCell[key]; });
    state.turn += 1;
    activateReinforcements(state);
    state.coveringFireLanes = [];
    state.actionPointsById = freshActionPoints(scenario!);
    state.actedCombatantIds = [];
    state.selectedCombatantId = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
    state.hoveredDestination = null;
    state.events.unshift(`Turn ${state.turn} begins`);
  },
  cancelMovePreview: (state) => { state.plannedMove = null; state.hoveredDestination = null; },
  setHoveredDestination: (state, action: PayloadAction<GridPoint | null>) => { state.hoveredDestination = action.payload; },
  updateHudLayout: (state, action: PayloadAction<{ id: CharacterCombatHudId; layout: CharacterCombatHudLayout }>) => { state.hudLayouts[action.payload.id] = action.payload.layout; },
  restoreHud: (state, action: PayloadAction<CharacterCombatHudId>) => { state.hudLayouts[action.payload].visible = true; },
  resetHudLayouts: (state) => { state.hudLayouts = freshHudLayouts(); },
  setViewMode: (state, action: PayloadAction<CharacterCombatViewMode>) => { state.viewMode = action.payload; },
  rotateCamera: (state, action: PayloadAction<-1 | 1>) => { state.camera.quarterTurn = ((state.camera.quarterTurn + action.payload + 4) % 4) as 0 | 1 | 2 | 3; state.camera.azimuth += action.payload * Math.PI / 2; },
  rotateCameraBy: (state, action: PayloadAction<{ azimuth: number; elevation: number }>) => {
    state.camera.azimuth += action.payload.azimuth;
    state.camera.elevation = Math.min(Math.PI * 0.44, Math.max(Math.PI * 0.12, state.camera.elevation + action.payload.elevation));
    const normalizedQuarter = Math.round((state.camera.azimuth - Math.PI / 4) / (Math.PI / 2));
    state.camera.quarterTurn = ((normalizedQuarter % 4 + 4) % 4) as 0 | 1 | 2 | 3;
  },
  adjustCameraZoom: (state, action: PayloadAction<-1 | 1>) => { state.camera.zoom = Math.min(63, Math.max(28, state.camera.zoom + action.payload * 7)); },
  panCameraBy: (state, action: PayloadAction<GridPoint>) => {
    const scenario = state.scenario;
    if (!scenario) return;
    const baseX = state.camera.focus ? state.camera.focus.x + 0.5 - scenario.width / 2 : 0;
    const baseY = state.camera.focus ? state.camera.focus.y + 0.5 - scenario.height / 2 : 0;
    const minX = -scenario.width / 2 + 0.5;
    const maxX = scenario.width / 2 - 0.5;
    const minY = -scenario.height / 2 + 0.5;
    const maxY = scenario.height / 2 - 0.5;
    const nextX = Math.min(maxX, Math.max(minX, baseX + state.camera.pan.x + action.payload.x));
    const nextY = Math.min(maxY, Math.max(minY, baseY + state.camera.pan.y + action.payload.y));
    state.camera.pan = { x: nextX - baseX, y: nextY - baseY };
  },
  resetCamera: (state) => { state.camera = { quarterTurn: 0, azimuth: Math.PI / 4, elevation: Math.PI / 4.75, zoom: 42, focus: null, pan: { x: 0, y: 0 } }; },
  focusCameraOnSelected: (state) => { const unit = state.scenario?.combatants.find((candidate) => candidate.id === state.selectedCombatantId); state.camera.focus = unit ? { ...unit.position } : null; state.camera.pan = { x: 0, y: 0 }; },
  setBoardingTeamIds: (state, action: PayloadAction<string[]>) => { state.selectedBoardingTeamIds = action.payload.slice(0, 2); },
  setArmoryLoadout: (state, action: PayloadAction<{ index: 0 | 1; loadoutId: ArmoryLoadoutId }>) => {
    const otherIndex = action.payload.index === 0 ? 1 : 0;
    if (action.payload.loadoutId === "heavy" && state.armoryLoadoutIds[otherIndex] === "heavy") return;
    state.armoryLoadoutIds[action.payload.index] = action.payload.loadoutId;
  },
} });
export const { loadCombatScenario, clearCombatScenario, selectPlayerCombatant, startTrot, beginDragging, releaseDraggedCombatant, previewMove, confirmMove, turnCombatant, previewOpenDoor, confirmOpenDoor, cancelOpenDoor, openDoor, closeDoor, previewExtinguishFire, confirmExtinguishFire, cancelExtinguishFire, previewAttack, selectAttackMode, confirmAttack, cancelAttackPreview, beginCoveringFire, previewCoveringFire, confirmCoveringFire, cancelCoveringFire, beginGrenadeTargeting, previewGrenadeTarget, cancelGrenadeTargeting, confirmGrenade, previewTreatment, cancelTreatmentPreview, confirmTreatment, previewSecureObjective, confirmSecureObjective, cancelObjectivePreview, previewBreachDoor, confirmBreachDoor, previewBreachDetonation, detonateBreachCharge, cancelBreachDoor, reloadWeapon, evade, rally, finishActivation, endPlayerTurn, cancelMovePreview, setHoveredDestination, updateHudLayout, restoreHud, resetHudLayouts, setViewMode, rotateCamera, rotateCameraBy, adjustCameraZoom, panCameraBy, resetCamera, focusCameraOnSelected, setBoardingTeamIds, setArmoryLoadout } = slice.actions;
export default slice.reducer;
