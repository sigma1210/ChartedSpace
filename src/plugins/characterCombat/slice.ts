import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ArmoryLoadoutId, CharacterCombatHudId, CharacterCombatHudLayout, CharacterCombatState, CharacterCombatViewMode, CombatScenario, FireMode, GridPoint, MoraleState, WeaponAmmunitionKind } from "./types";
import { adjacencyEntryStepIndex, adjacentEnemies, adjacentObjectives, automaticFireSecondaryTargets, breachableDoorsAdjacentTo, climbUpOptions, closedDoorsAdjacentTo, collateralBlastCells, coverProtection, decompressionMovesForDoor, depressurizedCells, doorBlastCells, dropDownOptions, elevationAttackModifier, fireLaneCells, grenadeBlastCells, grenadeLandingPoint, grenadeThrowCoverModifier, grenadeThrowRangeModifier, hasLineOfSight, inFieldOfFire, lightingLevelAt, meleeEnemies, movementPathCost, objectiveContesters, openDoorsAdjacentTo, pathWithinMovementAllowance, pointKey, rangedEnemies, reachableMovement, remainingCriticalFireCells, routeAllowingClosedDoors, scenarioAvoidingFireForPathfinding, shortestPathToAny, treatableAllies, validCoveringFireTargets, validGrenadeTargets, vaultOptions, visibilityAssessment, zeroGravityPushes, zeroGravityRecoilPath } from "./geometry";
import { accumulateWound, automaticFireModifierForRange, distanceInSquares, escalateWoundState, resolveAhlMelee, resolveSnapShot, snapShotTarget, weaponPenetrationForRange, woundStateForTotal, type AhlMeleeEffect, type DicePair } from "./combatResolution";
import { diveOptions, reachableCrawling } from "./geometry";
import { ahlMeleeDiveMoves } from "./geometry";
import { compareEnemyRangedTargets, shouldImproveEnemyRange } from "./enemyTactics";

const distanceBetween = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const highEnergyWeaponReady = (state: CharacterCombatState, unit: CombatScenario["combatants"][number]) => !unit.weapon.highEnergy
  || state.bracedCombatantIds.includes(unit.id);
const canAttackStructures = (unit: CombatScenario["combatants"][number]) => Boolean(unit.weapon.highEnergy)
  || unit.weapon.ammunitionKind === "he"
  || unit.weapon.ammunitionKind === "heap"
  || unit.weapon.ammunitionKind === "discard-sabot";
export const collateralCheckPasses = (distance: number, rollTotal: number) => distance === 0
  || (distance === 1 && rollTotal <= 10)
  || (distance === 2 && rollTotal <= 8);
const facings = ["north", "east", "south", "west"] as const;

const facingTowardFieldOfFire = (unit: CombatScenario["combatants"][number], target: GridPoint) => facings
  .map((facing) => {
    const difference = Math.abs(facings.indexOf(facing) - facings.indexOf(unit.facing));
    return { facing, turns: Math.min(difference, facings.length - difference) };
  })
  .filter(({ facing }) => inFieldOfFire({ position: unit.position, facing }, target))
  .sort((a, b) => a.turns - b.turns || facings.indexOf(a.facing) - facings.indexOf(b.facing))[0] ?? null;

const addSoundContact = (state: CharacterCombatState, enemy: CombatScenario["combatants"][number], kind: "movement" | "door" | "weapon" | "equipment") => {
  const scenario = state.scenario;
  if (!scenario?.defaultLighting || (state.observedEnemyIds ?? []).includes(enemy.id)) return;
  const point = { x: Math.min(scenario.width - 1, Math.floor(enemy.position.x / 3) * 3 + 1), y: Math.min(scenario.height - 1, Math.floor(enemy.position.y / 3) * 3 + 1) };
  state.soundContacts ??= [];
  state.soundContacts = [...state.soundContacts.filter((contact) => contact.sourceEnemyId !== enemy.id), { id: `sound:${enemy.id}:${state.turn}`, sourceEnemyId: enemy.id, point, kind, expiresAtTurn: state.turn + 2 }];
};

const resetTransientIntel = (state: CharacterCombatState) => {
  state.lastWeaponImpact = null;
  state.structuralTargeting = false;
  state.plannedStructuralTargetId = null;
  state.structuralDamageById = {};
  state.diveTargeting = false;
  state.grenadeKind = null;
  state.flareClearsAtTurnByCell = {};
  state.observedEnemyIds = [];
  state.lastKnownEnemyPositions = {};
  state.observersByEnemyId = {};
  state.soundContacts = [];
  state.playerNoiseContacts = [];
  state.cautiousMovementCombatantIds = [];
  state.investigationTargetByEnemyId = {};
  state.coveredDoorByCombatantId = {};
  state.doorCoverTargeting = false;
  state.plannedCoveredDoorId = null;
  state.weaponReadyCombatantIds = [];
  state.advanceReadyCombatantIds = [];
  state.aimedTargetByCombatantId = {};
  state.calledShotByCombatantId = {};
  state.weaponDamagedCombatantIds = [];
  state.mobilityImpairedCombatantIds = [];
  state.plannedMeleeMode = null;
  state.processedEnemyPhaseCombatantIds = [];
  state.ahlMeleeStunUntilTurnById = {};
  state.ahlMeleeEngagedCombatantIds = [];
  state.ahlMeleeDeclarations = [];
  state.awaitingAhlMeleeAcknowledgement = false;
  state.lastResolvedAhlMeleeDeclarations = [];
  state.lastAhlMeleeResults = [];
  state.enemySquareEnteredCombatantIds = [];
};

const clearWeaponReady = (state: CharacterCombatState, id: string) => { state.weaponReadyCombatantIds = (state.weaponReadyCombatantIds ?? []).filter((combatantId) => combatantId !== id); };
const clearAim = (state: CharacterCombatState, id: string) => { if (state.aimedTargetByCombatantId) delete state.aimedTargetByCombatantId[id]; };
const clearCalledShot = (state: CharacterCombatState, id: string) => { if (state.calledShotByCombatantId) delete state.calledShotByCombatantId[id]; };
const highGroundNote = (scenario: CombatScenario, attacker: CombatScenario["combatants"][number], target: CombatScenario["combatants"][number]) => elevationAttackModifier(scenario, attacker, target) ? " · high ground +1" : "";
const applyCombatWound = (state: CharacterCombatState, unit: CombatScenario["combatants"][number], incoming: CombatScenario["combatants"][number]["woundState"]) => {
  if (incoming !== "healthy" && state.ahlMeleeStunUntilTurnById?.[unit.id]) delete state.ahlMeleeStunUntilTurnById[unit.id];
  const result = accumulateWound(unit.woundState, incoming, unit.seriousWounds);
  unit.woundState = result.woundState;
  unit.seriousWounds = result.seriousWounds;
  unit.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
  if (unit.defeated) {
    unit.health = 0;
    if (state.adjacencyReactionReserveById) delete state.adjacencyReactionReserveById[unit.id];
    if (state.pendingAdjacencyReaction?.reactorId === unit.id || state.pendingAdjacencyReaction?.moverId === unit.id) state.pendingAdjacencyReaction = null;
    clearWeaponReady(state, unit.id);
    clearAim(state, unit.id);
    clearCalledShot(state, unit.id);
    state.bracedCombatantIds = state.bracedCombatantIds.filter((id) => id !== unit.id);
    state.coveringFireLanes = state.coveringFireLanes.filter((lane) => lane.attackerId !== unit.id);
    state.overwatchLanes = state.overwatchLanes.filter((lane) => lane.attackerId !== unit.id);
    delete state.maintainedTargetByCombatantId[unit.id];
    Object.entries(state.maintainedTargetByCombatantId).forEach(([attackerId, targetId]) => { if (targetId === unit.id) delete state.maintainedTargetByCombatantId[attackerId]; });
    if (state.selectedCombatantId === unit.id) {
      state.plannedMove = null;
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
    }
  }
  return result.woundState;
};
const applyAhlMeleeEffect = (state: CharacterCombatState, unit: CombatScenario["combatants"][number], effect: AhlMeleeEffect) => {
  if (effect === "none") return;
  if (effect === "stun") {
    state.ahlMeleeStunUntilTurnById ??= {};
    state.ahlMeleeStunUntilTurnById[unit.id] = state.turn + 1;
    if (unit.woundState === "healthy") unit.woundState = "light";
    return;
  }
  applyCombatWound(state, unit, effect === "light" ? "light" : effect === "unconscious" ? "unconscious" : "dead");
};

const doorFarCell = (door: CombatScenario["doors"][number], observer: GridPoint): GridPoint => {
  if (door.from.x === door.to.x) return { x: observer.x < door.from.x ? door.from.x : door.from.x - 1, y: Math.min(door.from.y, door.to.y) };
  return { x: Math.min(door.from.x, door.to.x), y: observer.y < door.from.y ? door.from.y : door.from.y - 1 };
};

const triggerCoveredDoor = (state: CharacterCombatState, doorId: string, enemy: CombatScenario["combatants"][number], dice?: { hitDice: DicePair; woundDice: DicePair }) => {
  const scenario = state.scenario;
  const entry = Object.entries(state.coveredDoorByCombatantId ?? {}).find(([, coveredDoorId]) => coveredDoorId === doorId);
  if (!scenario || !entry || !dice) return false;
  const attacker = scenario.combatants.find((unit) => unit.id === entry[0] && !unit.defeated);
  if (!attacker || (state.ammunitionById[attacker.id] ?? 0) < 1 || !visibilityAssessment(scenario, attacker, enemy).visible) return false;
  const result = resolveSnapShot(attacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario, attacker.id, enemy.id), "snap", false, false, state.bracedCombatantIds.includes(attacker.id), visibilityAssessment(scenario, attacker, enemy).modifier, state.weaponReadyCombatantIds?.includes(attacker.id), false, elevationAttackModifier(scenario, attacker, enemy));
  if (!result) return false;
  state.ammunitionById[attacker.id] -= 1;
  clearWeaponReady(state, attacker.id);
  if (result.hit) applyCombatWound(state, enemy, result.woundState);
  delete state.coveredDoorByCombatantId?.[attacker.id];
  state.overwatchLanes = state.overwatchLanes.filter((lane) => lane.attackerId !== attacker.id);
  state.events.unshift(`${attacker.name} door reaction fired as ${enemy.name} opened ${doorId}: ${result.hit ? `${result.woundState} wound` : "miss"}${highGroundNote(scenario, attacker, enemy)}`);
  return enemy.defeated;
};

const clearDoorCoverage = (state: CharacterCombatState, combatantId: string, reason?: string) => {
  const doorId = state.coveredDoorByCombatantId?.[combatantId];
  if (!doorId) return;
  delete state.coveredDoorByCombatantId?.[combatantId];
  state.overwatchLanes = state.overwatchLanes.filter((lane) => lane.attackerId !== combatantId);
  if (reason) {
    const name = state.scenario?.combatants.find((unit) => unit.id === combatantId)?.name ?? combatantId;
    state.events.unshift(`${name} stopped covering ${doorId}: ${reason}`);
  }
};

const clearCoverageForDoor = (state: CharacterCombatState, doorId: string, reason: string) => Object.entries(state.coveredDoorByCombatantId ?? {}).filter(([, coveredDoorId]) => coveredDoorId === doorId).forEach(([combatantId]) => clearDoorCoverage(state, combatantId, reason));

const enemyBreachCoveredDoor = (state: CharacterCombatState, door: CombatScenario["doors"][number], enemy: CombatScenario["combatants"][number], dice?: { hitDice: DicePair; woundDice: DicePair }) => {
  const scenario = state.scenario;
  if (!scenario || (enemy.breachingCharges ?? 0) < 1 || !Object.values(state.coveredDoorByCombatantId ?? {}).includes(door.id)) return false;
  door.open = true;
  enemy.breachingCharges = (enemy.breachingCharges ?? 0) - 1;
  const blastKeys = new Set(doorBlastCells(door).map(pointKey));
  if (dice) scenario.combatants.filter((unit) => !unit.defeated && blastKeys.has(pointKey(unit.position))).forEach((unit) => {
    const total = dice.woundDice.first + dice.woundDice.second + 4 - unit.armor;
    applyCombatWound(state, unit, woundStateForTotal(total));
    state.events.unshift(`${unit.name} caught in forced-entry blast (${unit.woundState})`);
  });
  state.events.unshift(`${enemy.name} forcibly breached covered ${door.id}`);
  triggerCoveredDoor(state, door.id, enemy, dice);
  clearCoverageForDoor(state, door.id, "door was forcibly breached");
  return true;
};

const visibleCoveredDoorIds = (state: CharacterCombatState, enemy: CombatScenario["combatants"][number]) => new Set(Object.entries(state.coveredDoorByCombatantId ?? {}).filter(([combatantId]) => {
  const coverer = state.scenario?.combatants.find((unit) => unit.id === combatantId && !unit.defeated);
  return coverer ? visibilityAssessment(state.scenario!, enemy, coverer).visible : false;
}).map(([, doorId]) => doorId));

export const scenarioAvoidingVisibleCoveredDoors = (scenario: CombatScenario, coveredDoorIds: Set<string>): CombatScenario => coveredDoorIds.size === 0 ? scenario : {
  ...scenario,
  walls: [...scenario.walls, ...scenario.doors.filter((door) => coveredDoorIds.has(door.id)).map((door) => ({ id: `avoided:${door.id}`, from: door.from, to: door.to }))],
  doors: scenario.doors.filter((door) => !coveredDoorIds.has(door.id)),
};

const applyFireDamage = (state: CharacterCombatState, unit: CombatScenario["combatants"][number]) => {
  const incomingWound = unit.woundState === "healthy" ? "light" : "serious";
  const nextWound = applyCombatWound(state, unit, incomingWound);
  if (nextWound === "serious" || nextWound === "unconscious" || nextWound === "dead") {
    unit.defeated = true;
    unit.health = 0;
    state.actionPointsById[unit.id] = 0;
    if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
  }
  state.events.unshift(`${unit.name} entered fire and suffered a ${nextWound} wound`);
};

const queueMovementAnimation = (state: CharacterCombatState, combatantId: string, origin: GridPoint, path: GridPoint[], mode: "walk" | "run") => {
  if (path.length === 0) return;
  state.movementAnimationByCombatantId ??= {};
  const sequence = (state.movementAnimationByCombatantId[combatantId]?.sequence ?? 0) + 1;
  state.movementAnimationByCombatantId[combatantId] = { sequence, path: [{ ...origin }, ...path.map((point) => ({ ...point }))], mode };
};

const updateDamageControlObjective = (scenario: CombatScenario, turn: number) => {
  if (scenario.id !== "damage-control") return;
  const total = scenario.criticalFireCells?.length ?? 0;
  const remaining = remainingCriticalFireCells(scenario);
  const extinguished = total - remaining.length;
  const nextSpread = scenario.fireSpreadSchedule?.find((event) => event.turn > turn && scenario.fireCells?.some((fire) => pointKey(fire) === pointKey(event.source)));
  scenario.objective = `Critical fires: ${extinguished}/${total} extinguished. ${remaining.length ? `Remaining: ${remaining.map((cell) => `${cell.x},${cell.y}`).join(" · ")}. ${nextSpread ? `Turn ${nextSpread.turn} spread threat: critical fire ${nextSpread.source.x},${nextSpread.source.y}. ` : ""}${scenario.criticalFireDeadlineTurn ? `Engineering cascade: Turn ${scenario.criticalFireDeadlineTurn}. ` : ""}Extinguish all critical fires, then restore the damage-control console.` : "Engineering cascade contained. Restore the damage-control console."}`;
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
  crewRoster: { visible: true, pinned: false, position: { x: 360, y: 720 } },
  enemyRoster: { visible: true, pinned: false, position: { x: 360, y: 640 } },
  events: { visible: true, pinned: false, position: { x: 980, y: 190 } },
  legend: { visible: false, pinned: false, position: { x: 980, y: 360 } },
  outcome: { visible: true, pinned: false, position: { x: 500, y: 12 } },
};

const freshHudLayouts = () => Object.fromEntries(Object.entries(defaultCharacterCombatHudLayouts).map(([id, layout]) => [id, { ...layout, position: { ...layout.position } }])) as Record<CharacterCombatHudId, CharacterCombatHudLayout>;
const freshActionPoints = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => !unit.defeated).map((unit) => [unit.id, 6]));
const magazineSize = (scenario: CombatScenario, combatantId: string) => scenario.combatants.find((unit) => unit.id === combatantId)?.weapon.magazineSize ?? 12;
const freshAmmunition = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.map((unit) => [unit.id, unit.weapon.magazineSize ?? 12]));
const freshProfileAmmunition = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => unit.weapon.ammunitionProfiles).map((unit) => [unit.id, Object.fromEntries(unit.weapon.ammunitionProfiles!.map((profile) => [profile.kind, unit.weapon.magazineSize ?? 12]))]));
const designatedLeaders = (scenario: CombatScenario) => Object.fromEntries((["player", "enemy"] as const).map((side) => {
  const leader = scenario.combatants.filter((unit) => unit.side === side).sort((a, b) => (b.leadershipRating ?? b.weaponSkill) - (a.leadershipRating ?? a.weaponSkill) || a.id.localeCompare(b.id))[0];
  return [side, leader?.id ?? null];
})) as Record<"player" | "enemy", string | null>;
const freshMorale = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.map((unit) => [unit.id, unit.surrendered ? "surrendered" : "steady"])) as Record<string, MoraleState>;
type MoraleRolls = Record<string, DicePair>;

const startingCombatants = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "player").map((unit) => [unit.id, { id: unit.id, name: unit.name, sourceCrewId: unit.sourceCrewId, sourceCharacterId: unit.sourceCharacterId, woundState: unit.woundState, grenades: unit.grenades, medkits: unit.medkits }]));

const entersHazardousTerrain = (scenario: CombatScenario, path: GridPoint[]) => path.some((point) => scenario.terrainByCell?.[pointKey(point)] === "hazardous");

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

const resolveCaptureOutcome = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario || state.status !== "active" || scenario.victoryCondition !== "capture-target" || !scenario.captureTargetId) return false;
  const target = scenario.combatants.find((unit) => unit.id === scenario.captureTargetId);
  if (!target?.defeated) return false;
  state.status = target.surrendered ? "victory" : "defeat";
  state.selectedCombatantId = null;
  state.plannedMove = null;
  state.plannedAttackTargetId = null;
  state.plannedAttackMode = null;
  state.events.unshift(target.surrendered ? `${target.name} captured alive` : `Mission failed: ${target.name} was incapacitated before capture`);
  finalizeOutcome(state);
  return true;
};

const resolveEnemyMorale = (state: CharacterCombatState, moraleRolls: MoraleRolls = {}, affectedId?: string, reason = "casualty") => {
  const scenario = state.scenario;
  if (!scenario) return;
  const enemies = scenario.combatants.filter((unit) => unit.side === "enemy");
  const affected = affectedId ? scenario.combatants.find((unit) => unit.id === affectedId) : null;
  const leaderId = state.leaderIdBySide?.enemy ?? null;
  const leaderLost = affected?.id === leaderId && affected.defeated;
  const candidates = enemies.filter((unit) => !unit.defeated && (!affected || leaderLost || distanceBetween(unit.position, affected.position) <= 4));
  for (const guard of candidates) {
    const dice = moraleRolls[guard.id];
    if (!dice) continue;
    const leader = scenario.combatants.find((unit) => unit.id === leaderId && !unit.defeated);
    const inCommand = leader && distanceBetween(guard.position, leader.position) <= 4;
    const leadershipBonus = inCommand ? leader.leadershipRating ?? 1 : 0;
    const target = 7 + (leaderLost ? 2 : 0);
    const woundPenalty = guard.woundState === "light" ? 1 : 0;
    const total = dice.first + dice.second + leadershipBonus - woundPenalty;
    if (total < target) {
      const current = state.moraleStateByCombatantId?.[guard.id] ?? "steady";
      const next: MoraleState = current === "steady" ? "shaken" : current === "shaken" ? "panicked" : "surrendered";
      state.moraleStateByCombatantId ??= {};
      state.moraleStateByCombatantId[guard.id] = next;
      if (next === "surrendered") { guard.surrendered = true; guard.defeated = true; }
      state.events.unshift(`${guard.name} failed ${reason} morale ${total}/${target}${leadershipBonus ? ` with +${leadershipBonus} leadership` : ""}${woundPenalty ? " with −1 light wound" : ""}: ${current} → ${next}`);
    } else state.events.unshift(`${guard.name} passed ${reason} morale ${total}/${target}${leadershipBonus ? ` with +${leadershipBonus} leadership` : ""}${woundPenalty ? " with −1 light wound" : ""}`);
  }
  if (resolveCaptureOutcome(state)) return;
  if (enemies.length > 0 && enemies.every((unit) => unit.defeated) && scenario.id !== "hull-breach" && scenario.id !== "damage-control" && scenario.victoryCondition !== "secure-objective" && scenario.victoryCondition !== "rescue-extract" && scenario.victoryCondition !== "hold-zone" && scenario.victoryCondition !== "staged-objectives" && scenario.victoryCondition !== "capture-target") {
    state.status = "victory";
    state.selectedCombatantId = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift("All hostile crew neutralized or surrendered");
    finalizeOutcome(state);
  }
};

const resolveQueuedAhlMelee = (state: CharacterCombatState, moraleRolls: MoraleRolls = {}) => {
  const scenario = state.scenario;
  const declarations = state.ahlMeleeDeclarations ?? [];
  if (!scenario || declarations.length === 0) return;
  state.lastResolvedAhlMeleeDeclarations = declarations.map((declaration) => ({ ...declaration }));
  const allocations = declarations.map((declaration) => ({
    attackerId: declaration.attackerId,
    targetId: declaration.targetId,
    roll: declaration.roll,
    tieBreaker: declaration.tieBreaker,
    sameSquare: declaration.sameSquare,
    attackerDived: declaration.attackerDived,
  }));
  const defenders = [...new Set(declarations.map((declaration) => declaration.targetId))];
  defenders.forEach((defenderId) => {
    if (allocations.some((allocation) => allocation.attackerId === defenderId)) return;
    const eligibleTargetIds = new Set(meleeEnemies(scenario, defenderId).map((unit) => unit.id));
    const candidates = declarations
      .filter((declaration) => declaration.targetId === defenderId && eligibleTargetIds.has(declaration.attackerId))
      .map((declaration) => ({ declaration, attacker: scenario.combatants.find((unit) => unit.id === declaration.attackerId) }))
      .filter((candidate) => candidate.attacker)
      .sort((first, second) => second.attacker!.meleeRating - first.attacker!.meleeRating || first.declaration.tieBreaker - second.declaration.tieBreaker);
    const chosen = candidates[0]?.declaration;
    if (chosen) allocations.push({ attackerId: defenderId, targetId: chosen.attackerId, roll: chosen.responseRoll, tieBreaker: chosen.tieBreaker, sameSquare: chosen.sameSquare, attackerDived: false });
  });
  const resolved = allocations
    .map((allocation) => {
      const attacker = scenario.combatants.find((unit) => unit.id === allocation.attackerId);
      const target = scenario.combatants.find((unit) => unit.id === allocation.targetId);
      return attacker && target ? { allocation, attacker, target, result: resolveAhlMelee(attacker, target, allocation.roll, allocation.sameSquare, allocation.attackerDived) } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((first, second) => second.attacker.meleeRating - first.attacker.meleeRating || first.allocation.tieBreaker - second.allocation.tieBreaker);
  resolved.forEach(({ target, result }) => applyAhlMeleeEffect(state, target, result.effect));
  resolved.forEach(({ attacker }) => {
    if (attacker.side === "player" && !state.actedCombatantIds.includes(attacker.id)) state.actedCombatantIds.push(attacker.id);
    if (attacker.side === "enemy" && !(state.processedEnemyPhaseCombatantIds ?? []).includes(attacker.id)) {
      state.processedEnemyPhaseCombatantIds ??= [];
      state.processedEnemyPhaseCombatantIds.push(attacker.id);
    }
  });
  const defeatedEnemyIds = [...new Set(resolved.filter(({ target }) => target.side === "enemy" && target.defeated).map(({ target }) => target.id))];
  const order = resolved.map(({ attacker }) => attacker.name).join(" then ");
  state.lastAhlMeleeResults = resolved.map(({ attacker, target, result }) => `${attacker.name} → ${target.name}: MF ${result.differential}, column ${result.tableDifferential}, roll ${result.roll}${result.modifiedRoll !== result.roll ? ` → ${result.modifiedRoll}` : ""}: ${result.effect}`);
  state.events.unshift(`AHL melee step resolved simultaneously · order ${order}`);
  state.lastAhlMeleeResults.slice().reverse().forEach((result) => state.events.unshift(result));
  state.ahlMeleeDeclarations = [];
  defeatedEnemyIds.forEach((id) => resolveEnemyMorale(state, moraleRolls, id));
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
    unit.seriousWounds = 0;
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

export const initialCharacterCombatState: CharacterCombatState = { scenario: null, selectedBoardingTeamIds: [], armoryLoadoutIds: ["scout", "breacher"], combatantStarts: {}, outcome: null, viewMode: "3d", camera: { quarterTurn: 0, azimuth: Math.PI / 4, elevation: Math.PI / 4.75, zoom: 42, focus: null, pan: { x: 0, y: 0 } }, status: "active", turn: 1, selectedCombatantId: null, plannedMove: null, plannedAttackTargetId: null, plannedAttackMode: null, grenadeTargeting: false, plannedGrenadeTarget: null, lastGrenadeImpact: null, plannedOpenDoorId: null, plannedBreachDoorId: null, plannedExtinguishFire: null, smokeClearsAtTurnByCell: {}, placedBreachingChargeByDoorId: {}, structuralDamageById: {}, vacuumExposureByCombatantId: {}, coveringFireTargeting: false, plannedCoveringFireTarget: null, coveringFireLanes: [], overwatchTargeting: false, plannedOverwatchTarget: null, overwatchLanes: [], adjacencyReactionReserveById: {}, adjacencyReactionUsedCombatantIds: [], movedCombatantIds: [], pendingAdjacencyReaction: null, plannedTreatmentTargetId: null, recoveringCombatantIds: [], evadingCombatantIds: [], trottingCombatantIds: [], bracedCombatantIds: [], suppressedCombatantIds: [], draggingCombatantByCarrierId: {}, maintainedTargetByCombatantId: {}, plannedObjectiveId: null, hoveredDestination: null, actionPointsById: {}, ammunitionById: {}, ammunitionByCombatantAndKind: {}, actedCombatantIds: [], events: [], hudLayouts: freshHudLayouts() };
const slice = createSlice({ name: "characterCombat", initialState: initialCharacterCombatState, reducers: {
  loadCombatScenario: (state, action: PayloadAction<CombatScenario>) => { resetTransientIntel(state); state.adjacencyReactionReserveById = {}; state.adjacencyReactionUsedCombatantIds = []; state.movedCombatantIds = []; state.pendingAdjacencyReaction = null; state.scenario = action.payload; state.scenario.combatants.forEach((unit) => { unit.seriousWounds = unit.seriousWounds ?? (unit.woundState === "serious" || unit.woundState === "unconscious" ? 1 : unit.woundState === "dead" ? 2 : 0); }); state.leaderIdBySide = designatedLeaders(action.payload); state.moraleStateByCombatantId = freshMorale(action.payload); state.combatantStarts = startingCombatants(action.payload); state.outcome = null; state.camera.focus = null; state.camera.pan = { x: 0, y: 0 }; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.lastGrenadeImpact = null; state.plannedOpenDoorId = null; state.plannedBreachDoorId = null; state.plannedExtinguishFire = null; state.smokeClearsAtTurnByCell = {}; state.placedBreachingChargeByDoorId = {}; state.vacuumExposureByCombatantId = {}; state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; state.coveringFireLanes = []; state.overwatchTargeting = false; state.plannedOverwatchTarget = null; state.overwatchLanes = []; state.disengagedCombatantIds = []; state.reactionMeleeUsedCombatantIds = []; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.evadingCombatantIds = []; state.trottingCombatantIds = []; state.bracedCombatantIds = []; state.suppressedCombatantIds = []; state.draggingCombatantByCarrierId = {}; state.maintainedTargetByCombatantId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = freshActionPoints(action.payload); state.ammunitionById = freshAmmunition(action.payload); state.ammunitionByCombatantAndKind = freshProfileAmmunition(action.payload); state.actedCombatantIds = []; state.events = []; },
  clearCombatScenario: (state) => { resetTransientIntel(state); state.adjacencyReactionReserveById = {}; state.adjacencyReactionUsedCombatantIds = []; state.movedCombatantIds = []; state.pendingAdjacencyReaction = null; state.scenario = null; state.combatantStarts = {}; state.outcome = null; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedOpenDoorId = null; state.plannedBreachDoorId = null; state.plannedExtinguishFire = null; state.smokeClearsAtTurnByCell = {}; state.placedBreachingChargeByDoorId = {}; state.vacuumExposureByCombatantId = {}; state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; state.coveringFireLanes = []; state.overwatchTargeting = false; state.plannedOverwatchTarget = null; state.overwatchLanes = []; state.disengagedCombatantIds = []; state.reactionMeleeUsedCombatantIds = []; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.evadingCombatantIds = []; state.trottingCombatantIds = []; state.bracedCombatantIds = []; state.suppressedCombatantIds = []; state.draggingCombatantByCarrierId = {}; state.maintainedTargetByCombatantId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = {}; state.ammunitionById = {}; state.ammunitionByCombatantAndKind = {}; state.actedCombatantIds = []; state.events = []; },
  selectPlayerCombatant: (state, action: PayloadAction<string | null>) => {
    state.lastWeaponImpact = null;
    if (state.status !== "active") return;
    state.diveTargeting = false;
    state.lastGrenadeImpact = null;
    if (action.payload === null) { state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedObjectiveId = null; state.hoveredDestination = null; return; }
    const combatant = state.scenario?.combatants.find((unit) => unit.id === action.payload);
    if (combatant && state.coveredDoorByCombatantId?.[combatant.id] && !state.actedCombatantIds.includes(combatant.id) && (state.actionPointsById[combatant.id] ?? 0) === 6) clearDoorCoverage(state, combatant.id, "next activation began");
    if (combatant && state.weaponReadyCombatantIds?.includes(combatant.id) && !state.actedCombatantIds.includes(combatant.id) && (state.actionPointsById[combatant.id] ?? 0) === 6) clearWeaponReady(state, combatant.id);
    if (combatant?.side === "player" && !combatant.defeated) { const maintained = state.maintainedTargetByCombatantId[combatant.id]; state.selectedCombatantId = combatant.id; state.plannedMove = null; state.plannedAttackTargetId = !state.trottingCombatantIds.includes(combatant.id) && maintained && state.scenario && rangedEnemies(state.scenario, combatant.id).some((target) => target.id === maintained) ? maintained : null; state.plannedAttackMode = null; state.plannedObjectiveId = null; state.hoveredDestination = null; }
  },
  refreshEnemyObservations: (state) => {
    const scenario = state.scenario;
    if (!scenario) return;
    const enemies = scenario.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated && (!unit.reinforcementTurn || unit.reinforcementTurn <= state.turn));
    Object.keys(state.coveredDoorByCombatantId ?? {}).forEach((id) => {
      const unit = scenario.combatants.find((candidate) => candidate.id === id);
      if (!unit || unit.defeated || unit.surrendered || (state.ammunitionById[id] ?? 0) < 1) clearDoorCoverage(state, id, !unit || unit.defeated ? "character incapacitated" : unit.surrendered ? "character surrendered" : "no ammunition");
    });
    if (!scenario.defaultLighting && !scenario.lightingByCell) {
      state.observedEnemyIds = enemies.map((unit) => unit.id);
      state.lastKnownEnemyPositions = Object.fromEntries(enemies.map((unit) => [unit.id, { ...unit.position }]));
      state.observersByEnemyId = Object.fromEntries(enemies.map((enemy) => [enemy.id, scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id)]));
      return;
    }
    const observers = scenario.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
    enemies.filter((enemy) => enemy.concealed && (enemy.lampOn || lightingLevelAt(scenario, enemy.position) === "illuminated" || observers.some((observer) => distanceBetween(observer.position, enemy.position) <= 2))).forEach((enemy) => {
      enemy.concealed = false;
      state.events.unshift(`${enemy.name} concealment broken`);
    });
    state.observersByEnemyId = Object.fromEntries(enemies.map((enemy) => [enemy.id, observers.filter((observer) => visibilityAssessment(scenario, observer, enemy).visible).map((observer) => observer.id)]));
    const visible = enemies.filter((enemy) => (state.observersByEnemyId?.[enemy.id]?.length ?? 0) > 0);
    state.observedEnemyIds = visible.map((enemy) => enemy.id);
    state.soundContacts = (state.soundContacts ?? []).filter((contact) => !state.observedEnemyIds!.includes(contact.sourceEnemyId));
    state.lastKnownEnemyPositions ??= {};
    visible.forEach((enemy) => { state.lastKnownEnemyPositions![enemy.id] = { ...enemy.position }; });
  },
  startTrot: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!id || !unit || unit.posture === "prone" || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.suppressedCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || state.enemySquareEnteredCombatantIds?.includes(id) || (state.actionPointsById[id] ?? 0) !== 6) return;
    state.trottingCombatantIds.push(id);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift(`${unit.name} committed to a trot; only an AHL melee dive may attack this activation`);
  },
  previewAhlMeleeDive: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!scenario || !id || state.status !== "active" || !state.trottingCombatantIds.includes(id) || state.actedCombatantIds.includes(id)) return;
    const move = ahlMeleeDiveMoves(scenario, id).get(action.payload);
    if (!move) return;
    state.plannedMove = move;
    state.plannedAttackTargetId = action.payload;
    state.plannedAttackMode = "melee";
    state.plannedMeleeMode = "ahl";
    state.plannedObjectiveId = null;
  },
  toggleCautiousMovement: (state) => {
    const id = state.selectedCombatantId;
    if (!id || !state.scenario?.defaultLighting || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 2) return;
    state.cautiousMovementCombatantIds ??= [];
    state.cautiousMovementCombatantIds = state.cautiousMovementCombatantIds.includes(id) ? state.cautiousMovementCombatantIds.filter((unitId) => unitId !== id) : [...state.cautiousMovementCombatantIds, id];
    state.advanceReadyCombatantIds = (state.advanceReadyCombatantIds ?? []).filter((unitId) => unitId !== id);
    state.plannedMove = null;
  },
  searchForEnemies: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const searcher = scenario?.combatants.find((unit) => unit.id === id && unit.side === "player" && !unit.defeated);
    if (!scenario || !id || !searcher || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3) return;
    const enhancedVision = searcher.visionMode === "enhanced" || searcher.weapon.enhancedVision;
    const range = enhancedVision ? 7 : 5;
    const found = scenario.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated && unit.concealed && distanceBetween(searcher.position, unit.position) <= range && hasLineOfSight(scenario, searcher.position, unit.position));
    const investigatedContacts = (state.soundContacts ?? []).filter((contact) => distanceBetween(searcher.position, contact.point) <= range);
    investigatedContacts.forEach((contact) => {
      const enemy = scenario.combatants.find((unit) => unit.id === contact.sourceEnemyId && unit.concealed);
      if (enemy && hasLineOfSight(scenario, searcher.position, enemy.position)) found.push(enemy);
    });
    found.forEach((enemy) => { enemy.concealed = false; });
    state.soundContacts = (state.soundContacts ?? []).filter((contact) => !investigatedContacts.some((investigated) => investigated.id === contact.id));
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.events.unshift(`${searcher.name} searched (${enhancedVision ? "enhanced " : ""}${range} squares): ${found.length ? `detected ${found.map((enemy) => enemy.name).join(", ")}` : "no contacts"} (3 AP)`);
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
  beginDive: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const unit = scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!scenario || !id || !unit || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3 || unit.posture === "prone" || scenario.gravityMode === "zero-g" || state.draggingCombatantByCarrierId[id] || state.enemySquareEnteredCombatantIds?.includes(id)) return;
    state.diveTargeting = true;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  previewDive: (state, action: PayloadAction<GridPoint>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!state.diveTargeting || !scenario || !id || (state.actionPointsById[id] ?? 0) < 3) return;
    state.plannedMove = diveOptions(scenario, id).get(pointKey(action.payload)) ?? null;
    if (state.plannedMove) state.diveTargeting = false;
  },
  cancelDive: (state) => { state.diveTargeting = false; if (state.plannedMove?.kind === "dive") state.plannedMove = null; },
  previewMove: (state, action: PayloadAction<GridPoint>) => {
    state.lastWeaponImpact = null;
    if (state.status !== "active" || !state.scenario || !state.selectedCombatantId || state.actedCombatantIds.includes(state.selectedCombatantId) || state.enemySquareEnteredCombatantIds?.includes(state.selectedCombatantId)) return;
    const selected = state.scenario.combatants.find((unit) => unit.id === state.selectedCombatantId);
    const advancingReady = state.advanceReadyCombatantIds?.includes(state.selectedCombatantId) ?? false;
    const impaired = state.mobilityImpairedCombatantIds?.includes(state.selectedCombatantId) ?? false;
    const movementLimit = Math.max(1, (advancingReady ? 2 : selected?.posture === "prone" ? 1 : state.draggingCombatantByCarrierId[state.selectedCombatantId] || state.suppressedCombatantIds.includes(state.selectedCombatantId) ? 2 : state.trottingCombatantIds.includes(state.selectedCombatantId) ? 6 : 4) - (impaired ? 2 : 0));
    const cautious = state.cautiousMovementCombatantIds?.includes(state.selectedCombatantId) ?? false;
    const normalAllowance = advancingReady || state.draggingCombatantByCarrierId[state.selectedCombatantId] || state.suppressedCombatantIds.includes(state.selectedCombatantId) ? 6 : Math.floor((state.actionPointsById[state.selectedCombatantId] ?? 0) / (cautious ? 2 : 1));
    const normalMaxSteps = Math.max(1, movementLimit);
    state.plannedMove = selected?.posture === "prone"
      ? reachableCrawling(state.scenario, state.selectedCombatantId, state.actionPointsById[state.selectedCombatantId] ?? 0).get(pointKey(action.payload)) ?? null
      : state.scenario.gravityMode === "zero-g" ? ((state.actionPointsById[state.selectedCombatantId] ?? 0) >= 3 ? zeroGravityPushes(state.scenario, state.selectedCombatantId).get(pointKey(action.payload)) ?? null : null) : reachableMovement(state.scenario, state.selectedCombatantId, normalAllowance, state.trottingCombatantIds.includes(state.selectedCombatantId), normalMaxSteps).get(pointKey(action.payload)) ?? null;
    if (state.plannedMove && cautious && state.plannedMove.kind !== "crawl") { state.plannedMove.cost *= 2; state.plannedMove.costBreakdown = [...(state.plannedMove.costBreakdown ?? []), "cautious ×2"]; }
    if (state.plannedMove && advancingReady) { state.plannedMove.cost = 4; state.plannedMove.costBreakdown = ["advance ready 4"]; }
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  previewDropDown: (state, action: PayloadAction<GridPoint>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!scenario || !id || state.status !== "active" || state.actedCombatantIds.includes(id) || state.enemySquareEnteredCombatantIds?.includes(id) || (state.actionPointsById[id] ?? 0) < 3) return;
    const destination = dropDownOptions(scenario, id).find((point) => pointKey(point) === pointKey(action.payload));
    if (!destination) return;
    state.plannedMove = { combatantId: id, destination, path: [destination], cost: 3, kind: "drop" };
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  previewClimbUp: (state, action: PayloadAction<GridPoint>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    if (!scenario || !id || state.status !== "active" || state.actedCombatantIds.includes(id) || state.enemySquareEnteredCombatantIds?.includes(id) || (state.actionPointsById[id] ?? 0) < 6 || state.draggingCombatantByCarrierId[id]) return;
    const destination = climbUpOptions(scenario, id).find((point) => pointKey(point) === pointKey(action.payload));
    if (!destination) return;
    state.plannedMove = { combatantId: id, destination, path: [destination], cost: 6, kind: "climb" };
    state.plannedAttackTargetId = null;
    state.plannedObjectiveId = null;
  },
  confirmMove: {
    reducer: (state, action: PayloadAction<{ hitDice: DicePair; woundDice: DicePair; adjacencyReactionRollsByCombatantId?: Record<string, { hitDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls } | undefined>) => {
    const scenario = state.scenario;
    const move = state.plannedMove;
    if (state.status !== "active" || !scenario || !move || state.actedCombatantIds.includes(move.combatantId)) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === move.combatantId);
    if (!unit || move.path.length === 0) return;
    const moveOrigin = { ...unit.position };
    const diving = move.kind === "dive" || move.kind === "melee-dive";
    const meleeDiveTarget = move.kind === "melee-dive" ? scenario.combatants.find((combatant) => combatant.id === move.meleeTargetId && !combatant.defeated && !combatant.surrendered) : null;
    if (move.kind === "melee-dive" && (!meleeDiveTarget || !action.payload)) return;
    const before = move.path.length > 1 ? move.path[move.path.length - 2] : unit.position;
    const final = move.destination;
    const dx = final.x - before.x;
    const dy = final.y - before.y;
    const dragged = state.draggingCombatantByCarrierId[unit.id] ? scenario.combatants.find((combatant) => combatant.id === state.draggingCombatantByCarrierId[unit.id]) : null;
    const adjacencyCrossing = scenario.combatants
      .filter((reactor) => reactor.side !== unit.side && !reactor.defeated && !reactor.weapon.highEnergy && !state.movedCombatantIds?.includes(reactor.id) && !state.adjacencyReactionUsedCombatantIds?.includes(`${reactor.id}:${unit.id}`) && !state.suppressedCombatantIds.includes(reactor.id) && (state.actionPointsById[reactor.id] ?? 0) >= 3 && (state.ammunitionById[reactor.id] ?? 0) >= 1)
      .map((reactor) => ({ reactor, stepIndex: adjacencyEntryStepIndex(scenario, reactor.position, moveOrigin, move.path) }))
      .filter(({ stepIndex }) => stepIndex >= 0)
      .sort((a, b) => a.stepIndex - b.stepIndex || scenario.combatants.indexOf(a.reactor) - scenario.combatants.indexOf(b.reactor))[0];
    if (adjacencyCrossing && action.payload?.adjacencyReactionRollsByCombatantId?.[adjacencyCrossing.reactor.id]) {
      const reactor = adjacencyCrossing.reactor;
      const trigger = move.path[adjacencyCrossing.stepIndex];
      const prior = adjacencyCrossing.stepIndex > 0 ? move.path[adjacencyCrossing.stepIndex - 1] : unit.position;
      const originalPosition = { ...unit.position };
      unit.position = { ...trigger };
      unit.facing = trigger.x > prior.x ? "east" : trigger.x < prior.x ? "west" : trigger.y > prior.y ? "south" : "north";
      const dice = action.payload.adjacencyReactionRollsByCombatantId[reactor.id];
      const reaction = resolveSnapShot(reactor, unit, dice.hitDice, dice.woundDice, coverProtection(scenario, reactor.id, unit.id), "snap", state.evadingCombatantIds.includes(unit.id) || diving, false, false, visibilityAssessment(scenario, reactor, unit).modifier, false, false, elevationAttackModifier(scenario, reactor, unit));
      state.actionPointsById[reactor.id] -= 3;
      state.ammunitionById[reactor.id] -= 1;
      state.adjacencyReactionUsedCombatantIds ??= [];
      state.adjacencyReactionUsedCombatantIds.push(`${reactor.id}:${unit.id}`);
      if (reaction?.hit) applyCombatWound(state, unit, reaction.woundState);
      if (reaction) state.events.unshift(`${reactor.name} adjacency snap shot as ${unit.name} entered ${trigger.x},${trigger.y}: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}`);
      if (unit.defeated) {
        state.actionPointsById[unit.id] = 0;
        if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
        state.plannedMove = null;
        state.hoveredDestination = null;
        state.events.unshift(`${unit.name} movement stopped by adjacency reaction fire`);
        if (resolveRescueFailure(state)) return;
        return;
      }
      unit.position = originalPosition;
    }
    const enemyOverwatchCrossing = state.overwatchLanes
      .map((lane) => ({ lane, attacker: scenario.combatants.find((combatant) => combatant.id === lane.attackerId), stepIndex: move.path.findIndex((step) => lane.cells.some((cell) => pointKey(cell) === pointKey(step))) }))
      .filter((crossing) => crossing.attacker?.side === "enemy" && crossing.stepIndex >= 0)
      .sort((a, b) => a.stepIndex - b.stepIndex)[0];
    if (enemyOverwatchCrossing) {
      const overwatcher = enemyOverwatchCrossing.attacker!;
      const trigger = move.path[enemyOverwatchCrossing.stepIndex];
      const prior = enemyOverwatchCrossing.stepIndex > 0 ? move.path[enemyOverwatchCrossing.stepIndex - 1] : unit.position;
      const originalPosition = unit.position;
      unit.position = trigger;
      unit.facing = trigger.x > prior.x ? "east" : trigger.x < prior.x ? "west" : trigger.y > prior.y ? "south" : "north";
      const canReact = (state.ammunitionById[overwatcher.id] ?? 0) >= 1 && rangedEnemies(scenario, overwatcher.id).some((target) => target.id === unit.id);
      if (canReact && action.payload) {
        state.overwatchLanes = state.overwatchLanes.filter((lane) => lane !== enemyOverwatchCrossing.lane);
        state.ammunitionById[overwatcher.id] -= 1;
        const reaction = resolveSnapShot(overwatcher, unit, action.payload.hitDice, action.payload.woundDice, coverProtection(scenario, overwatcher.id, unit.id), "snap", state.evadingCombatantIds.includes(unit.id) || diving, state.suppressedCombatantIds.includes(overwatcher.id), false, visibilityAssessment(scenario, overwatcher, unit).modifier, false, false, elevationAttackModifier(scenario, overwatcher, unit));
        if (reaction) {
          if (!reaction.hit && reaction.targetNumber - reaction.hitTotal <= 2 && !state.suppressedCombatantIds.includes(unit.id)) { state.suppressedCombatantIds.push(unit.id); clearAim(state, unit.id); }
          if (reaction.hit) applyCombatWound(state, unit, reaction.woundState);
          state.events.unshift(`${overwatcher.name} overwatch triggered as ${unit.name} entered ${trigger.x},${trigger.y}: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}${highGroundNote(scenario, overwatcher, unit)}`);
          applyZeroGravityRecoil(state, overwatcher.id);
          if (unit.defeated) {
            state.actionPointsById[unit.id] = 0;
            if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
            state.bracedCombatantIds = state.bracedCombatantIds.filter((combatantId) => combatantId !== unit.id);
            if (dragged) dragged.position = { ...prior };
            state.events.unshift(`${unit.name} movement stopped by enemy overwatch`);
            state.plannedMove = null;
            state.hoveredDestination = null;
            if (resolveRescueFailure(state)) return;
            if (scenario.combatants.filter((combatant) => combatant.side === "player").every((combatant) => combatant.defeated)) {
              state.status = "defeat";
              state.selectedCombatantId = null;
              finalizeOutcome(state);
            }
            return;
          }
        }
      }
      unit.position = originalPosition;
    }
    const advancingReady = state.advanceReadyCombatantIds?.includes(unit.id) ?? false;
    if (move.kind !== "dive" && move.kind !== "drop" && move.kind !== "climb" && move.kind !== "crawl") {
      queueMovementAnimation(state, unit.id, moveOrigin, move.path, state.trottingCombatantIds.includes(unit.id) ? "run" : "walk");
    }
    unit.position = final;
    state.movedCombatantIds ??= [];
    if (!state.movedCombatantIds.includes(unit.id)) state.movedCombatantIds.push(unit.id);
    if (move.kind === "dive") unit.posture = "prone";
    clearDoorCoverage(state, unit.id, "character moved");
    if (!advancingReady) clearWeaponReady(state, unit.id);
    clearAim(state, unit.id);
    clearCalledShot(state, unit.id);
    state.bracedCombatantIds = state.bracedCombatantIds.filter((combatantId) => combatantId !== unit.id);
    if (dragged) dragged.position = { ...before };
    if (move.finalFacing) unit.facing = move.finalFacing;
    else if (diving || move.kind === "drop" || move.kind === "climb") unit.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
    state.actionPointsById[unit.id] = Math.max(0, (state.actionPointsById[unit.id] ?? 0) - move.cost);
    if (move.kind === "enemy-entry") {
      state.enemySquareEnteredCombatantIds ??= [];
      if (!state.enemySquareEnteredCombatantIds.includes(unit.id)) state.enemySquareEnteredCombatantIds.push(unit.id);
    }
    const cautious = state.cautiousMovementCombatantIds?.includes(unit.id) ?? false;
    if (scenario.defaultLighting && !cautious) {
      const noisePoint = { x: Math.min(scenario.width - 1, Math.floor(unit.position.x / 3) * 3 + 1), y: Math.min(scenario.height - 1, Math.floor(unit.position.y / 3) * 3 + 1) };
      state.playerNoiseContacts = [...(state.playerNoiseContacts ?? []).filter((contact) => contact.sourcePlayerId !== unit.id), { sourcePlayerId: unit.id, point: noisePoint, expiresAtTurn: state.turn + 1 }];
      state.events.unshift(`${unit.name} movement was audible`);
    }
    state.cautiousMovementCombatantIds = (state.cautiousMovementCombatantIds ?? []).filter((id) => id !== unit.id);
    state.advanceReadyCombatantIds = (state.advanceReadyCombatantIds ?? []).filter((id) => id !== unit.id);
    if (advancingReady) {
      state.weaponReadyCombatantIds ??= [];
      if (!state.weaponReadyCombatantIds.includes(unit.id)) state.weaponReadyCombatantIds.push(unit.id);
      state.events.unshift(`${unit.name} completed an advance ready and remains weapon ready`);
    }
    if (state.actionPointsById[unit.id] === 0 && !state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
    state.events.unshift(move.kind === "melee-dive" ? `${unit.name} dove into ${meleeDiveTarget!.name}'s square after trotting (${move.cost} movement points)` : move.kind === "enemy-entry" ? `${unit.name} entered an enemy-occupied square at ${final.x},${final.y}; movement ended (${move.cost} AP)` : move.kind === "dive" ? `${unit.name} dove to ${final.x},${final.y} and went prone (3 AP)` : move.kind === "crawl" ? `${unit.name} crawled to ${final.x},${final.y} (${move.cost} AP)` : move.kind === "drop" ? `${unit.name} dropped down to ${final.x},${final.y} (3 AP)` : move.kind === "climb" ? `${unit.name} climbed up toward ${final.x},${final.y} (6 AP)` : `${unit.name} moved to ${final.x},${final.y} (${move.cost} AP${move.costBreakdown?.length ? `: ${move.costBreakdown.join(" + ")}` : ""})`);
    if ((move.kind === "drop" || move.kind === "climb" || entersHazardousTerrain(scenario, move.path)) && action.payload) {
      const footingTotal = action.payload.hitDice.first + action.payload.hitDice.second;
      if (footingTotal < 7) {
        if (move.kind === "climb") unit.position = moveOrigin;
        unit.posture = "prone";
        state.actionPointsById[unit.id] = 0;
        if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
        state.events.unshift(`${unit.name} failed ${move.kind === "drop" ? "drop footing" : move.kind === "climb" ? "climb check" : "hazardous footing"} ${footingTotal}/7: ${move.kind === "climb" ? "remained below, " : ""}prone, activation ended`);
      } else state.events.unshift(`${unit.name} passed ${move.kind === "drop" ? "drop footing" : move.kind === "climb" ? "climb check" : "hazardous footing"} ${footingTotal}/7`);
    }
    if (scenario.fireCells?.some((cell) => pointKey(cell) === pointKey(final))) applyFireDamage(state, unit);
    state.plannedMove = null;
    if (move.kind === "melee-dive" && meleeDiveTarget && action.payload && !unit.defeated) {
      state.ahlMeleeDeclarations ??= [];
      state.ahlMeleeDeclarations.push({ attackerId: unit.id, targetId: meleeDiveTarget.id, roll: action.payload.hitDice.first, responseRoll: action.payload.woundDice.first, tieBreaker: action.payload.hitDice.second, sameSquare: true, attackerDived: true });
      if (!state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
      state.ahlMeleeEngagedCombatantIds = [...new Set([...(state.ahlMeleeEngagedCombatantIds ?? []), unit.id, meleeDiveTarget.id])];
      state.actionPointsById[unit.id] = 0;
      state.events.unshift(`${unit.name} allocated an AHL melee dive against ${meleeDiveTarget.name} (+2); results pending until the melee step resolves`);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      state.plannedMeleeMode = null;
    }
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
    prepare: (payload?: { hitDice: DicePair; woundDice: DicePair; adjacencyReactionRollsByCombatantId?: Record<string, { hitDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls }) => ({ payload }),
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
  toggleLamp: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((candidate) => candidate.id === id && candidate.side === "player" && !candidate.defeated);
    if (!id || !unit?.hasLamp || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 1) return;
    unit.lampOn = !unit.lampOn;
    state.actionPointsById[id] -= 1;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.events.unshift(`${unit.name} switched lamp ${unit.lampOn ? "on" : "off"} (1 AP)`);
  },
  readyWeapon: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((candidate) => candidate.id === id && candidate.side === "player" && !candidate.defeated);
    if (!id || !unit || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || state.weaponReadyCombatantIds?.includes(id) || (state.actionPointsById[id] ?? 0) < 2) return;
    state.weaponReadyCombatantIds ??= [];
    state.weaponReadyCombatantIds.push(id);
    state.actionPointsById[id] -= 2;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.events.unshift(`${unit.name} readied weapon (+1 next ranged attack)`);
  },
  toggleAdvanceReady: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((candidate) => candidate.id === id && candidate.side === "player" && !candidate.defeated);
    if (!id || !unit || unit.weapon.highEnergy || unit.posture === "prone" || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || state.suppressedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 4) return;
    state.advanceReadyCombatantIds ??= [];
    state.advanceReadyCombatantIds = state.advanceReadyCombatantIds.includes(id) ? state.advanceReadyCombatantIds.filter((combatantId) => combatantId !== id) : [...state.advanceReadyCombatantIds, id];
    state.cautiousMovementCombatantIds = (state.cautiousMovementCombatantIds ?? []).filter((combatantId) => combatantId !== id);
    state.plannedMove = null;
  },
  previewOpenDoor: (state, action: PayloadAction<string>) => {
    state.lastWeaponImpact = null;
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
    updateDamageControlObjective(scenario, state.turn);
    if (pairedSmoke) state.smokeClearsAtTurnByCell[pointKey(pairedSmoke)] = state.turn + 1;
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedExtinguishFire = null;
    state.events.unshift(`${unit.name} extinguished fire at ${fire.x},${fire.y} (3 AP)`);
  },
  cancelExtinguishFire: (state) => { state.plannedExtinguishFire = null; },
  previewAttack: (state, action: PayloadAction<string>) => {
    state.lastWeaponImpact = null;
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !attackerId || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId]) return;
    const rangedValid = rangedEnemies(scenario, attackerId).some((target) => target.id === action.payload);
    const meleeValid = meleeEnemies(scenario, attackerId).some((target) => target.id === action.payload);
    if (rangedValid || meleeValid) {
      if (state.aimedTargetByCombatantId?.[attackerId] && state.aimedTargetByCombatantId[attackerId] !== action.payload) { clearAim(state, attackerId); clearCalledShot(state, attackerId); }
      state.plannedAttackTargetId = action.payload;
      state.plannedAttackMode = meleeValid ? "melee" : null;
    state.plannedMeleeMode = meleeValid ? "ahl" : null;
      state.plannedMove = null;
      state.plannedObjectiveId = null;
      state.hoveredDestination = null;
    }
  },
  previewMeleeAttack: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !attackerId || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId] || !meleeEnemies(scenario, attackerId).some((target) => target.id === action.payload)) return;
    state.plannedAttackTargetId = action.payload;
    state.plannedAttackMode = "melee";
    state.plannedMeleeMode = "ahl";
    state.plannedMove = null;
    state.plannedObjectiveId = null;
    state.hoveredDestination = null;
  },
  previewSubdue: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !attackerId || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId] || !adjacentEnemies(scenario, attackerId).some((target) => target.id === action.payload)) return;
    state.plannedAttackTargetId = action.payload;
    state.plannedAttackMode = "melee";
    state.plannedMeleeMode = "subdue";
    state.plannedMove = null;
    state.plannedObjectiveId = null;
    state.hoveredDestination = null;
    clearAim(state, attackerId);
    clearCalledShot(state, attackerId);
  },
  aimAtPlannedTarget: (state) => {
    const attackerId = state.selectedCombatantId;
    const targetId = state.plannedAttackTargetId;
    if (!attackerId || !targetId || state.status !== "active" || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId] || state.suppressedCombatantIds.includes(attackerId) || (state.actionPointsById[attackerId] ?? 0) < 2) return;
    state.aimedTargetByCombatantId ??= {};
    state.aimedTargetByCombatantId[attackerId] = targetId;
    state.actionPointsById[attackerId] -= 2;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === attackerId);
    const target = state.scenario?.combatants.find((unit) => unit.id === targetId);
    state.events.unshift(`${attacker?.name ?? "Character"} aimed at ${target?.name ?? "target"} (2 AP)`);
  },
  selectCalledShot: (state, action: PayloadAction<"weapon" | "mobility" | "body" | null>) => {
    const attackerId = state.selectedCombatantId;
    const targetId = state.plannedAttackTargetId;
    if (!attackerId || !targetId || state.aimedTargetByCombatantId?.[attackerId] !== targetId) return;
    state.calledShotByCombatantId ??= {};
    if (action.payload) state.calledShotByCombatantId[attackerId] = action.payload;
    else delete state.calledShotByCombatantId[attackerId];
  },
  selectAttackMode: (state, action: PayloadAction<FireMode>) => {
    const attacker = state.scenario?.combatants.find((unit) => unit.id === state.selectedCombatantId);
    const target = state.scenario?.combatants.find((unit) => unit.id === state.plannedAttackTargetId);
    const rangeBand = attacker && target ? snapShotTarget(attacker, target)?.rangeBand : null;
    if (!state.plannedAttackTargetId || !attacker || (action.payload === "aimed" && state.ahlMeleeEngagedCombatantIds?.includes(attacker.id)) || (attacker.weapon.highEnergy && action.payload !== "aimed" && action.payload !== "melee") || (action.payload === "automatic" && rangeBand && automaticFireModifierForRange(rangeBand, attacker.weapon.automaticFireBonusByRange) === null)) return;
    state.plannedAttackMode = action.payload;
    state.plannedMeleeMode = action.payload === "melee" ? "ahl" : null;
    if (action.payload === "melee" && state.selectedCombatantId) state.bracedCombatantIds = state.bracedCombatantIds.filter((id) => id !== state.selectedCombatantId);
  },
  confirmAttack: (state, action: PayloadAction<{ hitDice: DicePair; woundDice: DicePair; collateralRolls?: Record<string, { checkDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls; attackMode?: FireMode }>) => {
    state.lastWeaponImpact = null;
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    const targetId = state.plannedAttackTargetId;
    const fireMode = action.payload.attackMode ?? (state.plannedMeleeMode ? "melee" : state.plannedAttackMode);
    const meleeMode = fireMode === "melee" ? state.plannedMeleeMode : null;
    const apCost = fireMode === "melee" ? meleeMode === "ahl" ? 0 : 3 : fireMode === "aimed" || fireMode === "automatic" || fireMode === "suppressive" ? 6 : 3;
    const ammunitionCost = fireMode === "automatic" || fireMode === "suppressive" || fireMode === "covering" ? 3 : fireMode === "melee" ? 0 : 1;
    if (state.status !== "active" || !scenario || !attackerId || !targetId || !fireMode || (fireMode === "melee" && !meleeMode) || (fireMode === "aimed" && state.ahlMeleeEngagedCombatantIds?.includes(attackerId)) || state.actedCombatantIds.includes(attackerId) || state.trottingCombatantIds.includes(attackerId) || state.draggingCombatantByCarrierId[attackerId] || (state.actionPointsById[attackerId] ?? 0) < apCost) return;
    const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
    const target = (fireMode === "melee" ? meleeEnemies(scenario, attackerId) : rangedEnemies(scenario, attackerId)).find((unit) => unit.id === targetId);
    const rangedProfile = fireMode !== "melee" && attacker && target ? snapShotTarget(attacker, target) : null;
    if (!attacker || !target || (attacker.weapon.highEnergy && (fireMode !== "aimed" || !highEnergyWeaponReady(state, attacker))) || ((fireMode === "automatic" || fireMode === "suppressive") && !attacker.weapon.automatic) || (fireMode === "automatic" && rangedProfile && automaticFireModifierForRange(rangedProfile.rangeBand, attacker.weapon.automaticFireBonusByRange) === null) || (fireMode === "suppressive" && state.suppressedCombatantIds.includes(target.id)) || (state.ammunitionById[attackerId] ?? 0) < ammunitionCost) return;
    const attackerSuppressed = state.suppressedCombatantIds.includes(attacker.id);
    const subdueAssistBonus = meleeMode === "subdue" ? Math.min(2, adjacentEnemies(scenario, target.id).filter((unit) => unit.side === attacker.side && unit.id !== attacker.id).length) : 0;
    const subdueSuppressionBonus = meleeMode === "subdue" && state.suppressedCombatantIds.includes(target.id) ? 1 : 0;
    const subduePanicBonus = meleeMode === "subdue" && state.moraleStateByCombatantId?.[target.id] === "panicked" ? 1 : 0;
    const subdueBonus = subdueAssistBonus + subdueSuppressionBonus + subduePanicBonus;
    const subdueTotal = meleeMode === "subdue" ? action.payload.hitDice.first + subdueBonus : null;
    const calledShot = state.calledShotByCombatantId?.[attacker.id];
    const fireResult = fireMode !== "melee" ? resolveSnapShot(attacker, target, action.payload.hitDice, action.payload.woundDice, coverProtection(scenario, attacker.id, target.id), fireMode, state.evadingCombatantIds.includes(target.id), attackerSuppressed, state.bracedCombatantIds.includes(attacker.id), visibilityAssessment(scenario, attacker, target).modifier, state.weaponReadyCombatantIds?.includes(attacker.id), state.aimedTargetByCombatantId?.[attacker.id] === target.id, (calledShot ? -2 : 0) - (state.weaponDamagedCombatantIds?.includes(attacker.id) ? 1 : 0) + elevationAttackModifier(scenario, attacker, target), calledShot === "body" ? 2 : 0) : null;
    if (fireResult) clearWeaponReady(state, attacker.id);
    if (fireResult) clearAim(state, attacker.id);
    if (fireResult) clearCalledShot(state, attacker.id);
    if (fireMode === "suppressive" && fireResult) {
      const suppressionTarget = fireResult.targetNumber + fireResult.cover;
      const suppressed = fireResult.hitTotal >= suppressionTarget;
      state.ammunitionById[attacker.id] -= ammunitionCost;
      state.actionPointsById[attacker.id] -= apCost;
      if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
      if (suppressed) {
        state.suppressedCombatantIds.push(target.id);
        clearAim(state, target.id);
        if (target.side === "enemy") resolveEnemyMorale(state, action.payload.moraleRolls, target.id, "suppression");
      }
      state.events.unshift(`${attacker.name} suppressive fired at ${target.name}: ${fireResult.hitTotal}/${suppressionTarget}${fireResult.cover ? ` including cover +${fireResult.cover}` : ""} · ${suppressed ? "suppressed" : "held position"}${highGroundNote(scenario, attacker, target)}`);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      applyZeroGravityRecoil(state, attacker.id);
      return;
    }
    const dangerSecondaries = fireMode !== "melee" ? automaticFireSecondaryTargets(scenario, attacker.id, target.id) : [];
    const resolvesDangerSpace = fireMode === "automatic" || ((fireMode === "snap" || fireMode === "aimed") && dangerSecondaries.length > 0 && !attacker.weapon.highEnergy && !attacker.weapon.collateralBlast);
    if (resolvesDangerSpace && fireResult) {
      const dangerTargets = [target, ...dangerSecondaries]
        .sort((a, b) => distanceInSquares(attacker, a) - distanceInSquares(attacker, b) || scenario.combatants.indexOf(a) - scenario.combatants.indexOf(b));
      const defeatedTargetIds: string[] = [];
      const hitLimit = fireMode === "automatic" ? 2 : 1;
      let hits = 0;
      for (const [dangerIndex, dangerTarget] of dangerTargets.entries()) {
        const suppliedRolls = dangerTarget.id === target.id
          ? { checkDice: action.payload.hitDice, woundDice: action.payload.woundDice }
          : action.payload.collateralRolls?.[dangerTarget.id] ?? { checkDice: action.payload.hitDice, woundDice: action.payload.woundDice };
        const result = dangerTarget.id === target.id ? fireResult : resolveSnapShot(attacker, dangerTarget, suppliedRolls.checkDice, suppliedRolls.woundDice, coverProtection(scenario, attacker.id, dangerTarget.id), fireMode, state.evadingCombatantIds.includes(dangerTarget.id), attackerSuppressed, state.bracedCombatantIds.includes(attacker.id), visibilityAssessment(scenario, attacker, dangerTarget).modifier, false, false, (state.weaponDamagedCombatantIds?.includes(attacker.id) ? -1 : 0) + elevationAttackModifier(scenario, attacker, dangerTarget));
        if (!result) continue;
        if (result.hit) {
          hits += 1;
          applyCombatWound(state, dangerTarget, result.woundState);
          if (dangerTarget.id === target.id && calledShot === "weapon") { state.weaponDamagedCombatantIds ??= []; if (!state.weaponDamagedCombatantIds.includes(target.id)) state.weaponDamagedCombatantIds.push(target.id); }
          if (dangerTarget.id === target.id && calledShot === "mobility") { state.mobilityImpairedCombatantIds ??= []; if (!state.mobilityImpairedCombatantIds.includes(target.id)) state.mobilityImpairedCombatantIds.push(target.id); }
          if (dangerTarget.defeated) defeatedTargetIds.push(dangerTarget.id);
        }
        state.events.unshift(fireMode === "automatic"
          ? `${attacker.name} automatic fired through danger space; danger-space attack against ${dangerTarget.name}: hit ${result.hitTotal}/${result.targetNumber} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`
          : `${attacker.name} ${fireMode} fired through danger space at ${dangerTarget.name}: hit ${result.hitTotal}/${result.targetNumber} · ${result.hit ? `wound ${result.woundTotal} (${result.woundState})` : "miss"}`);
        const nextTarget = dangerTargets[dangerIndex + 1];
        const attacksEveryoneInSquare = fireMode === "automatic" || attacker.weapon.inherentAutomaticFireBonus || attacker.weapon.ammunitionKind === "flechette";
        if (hits >= hitLimit && (!attacksEveryoneInSquare || !nextTarget || pointKey(nextTarget.position) !== pointKey(dangerTarget.position))) break;
      }
      state.maintainedTargetByCombatantId[attacker.id] = target.id;
      state.ammunitionById[attacker.id] -= ammunitionCost;
      state.actionPointsById[attacker.id] -= apCost;
      if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
      applyZeroGravityRecoil(state, attacker.id);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      state.plannedMeleeMode = null;
      defeatedTargetIds.forEach((id) => {
        Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, maintainedTargetId]) => { if (maintainedTargetId === id) delete state.maintainedTargetByCombatantId[combatantId]; });
        const unit = scenario.combatants.find((candidate) => candidate.id === id);
        if (unit?.side === "enemy") resolveEnemyMorale(state, action.payload.moraleRolls, id);
      });
      if (defeatedTargetIds.length > 0) resolveCaptureOutcome(state);
      return;
    }
    if (fireMode === "melee" && meleeMode === "subdue" && subdueTotal !== null) {
      state.actionPointsById[attacker.id] -= apCost;
      if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
      if (subdueTotal >= 6) {
        target.surrendered = true;
        target.defeated = true;
        target.health = 0;
        delete target.stunnedUntilTurn;
        state.events.unshift(`${attacker.name} subdued and restrained ${target.name} (${subdueTotal}, teamwork/vulnerability +${subdueBonus}, 3 AP)`);
        if (target.side === "enemy") { if (resolveCaptureOutcome(state)) return; resolveEnemyMorale(state, action.payload.moraleRolls, target.id, "restraint"); }
      } else if (subdueTotal >= 4) {
        target.stunnedUntilTurn = state.turn + 1;
        state.events.unshift(`${attacker.name} subdued ${target.name}: stunned (${subdueTotal}, teamwork/vulnerability +${subdueBonus}, 3 AP)`);
        if (target.side === "enemy") resolveEnemyMorale(state, action.payload.moraleRolls, target.id, "restraint");
      } else state.events.unshift(`${attacker.name} failed to subdue ${target.name} (${subdueTotal}, teamwork/vulnerability +${subdueBonus}, 3 AP)`);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      state.plannedMeleeMode = null;
      return;
    }
    if (fireMode === "melee" && meleeMode === "ahl") {
      state.ahlMeleeDeclarations ??= [];
      if (state.ahlMeleeDeclarations.some((declaration) => declaration.attackerId === attacker.id)) return;
      const sameSquare = pointKey(attacker.position) === pointKey(target.position);
      state.ahlMeleeDeclarations.push({ attackerId: attacker.id, targetId: target.id, roll: action.payload.hitDice.first, responseRoll: action.payload.woundDice.first, tieBreaker: action.payload.hitDice.second, sameSquare, attackerDived: false });
      if (!state.actedCombatantIds.includes(attacker.id)) state.actedCombatantIds.push(attacker.id);
      state.ahlMeleeEngagedCombatantIds = [...new Set([...(state.ahlMeleeEngagedCombatantIds ?? []), attacker.id, target.id])];
      state.events.unshift(`${attacker.name} allocated AHL melee against ${target.name}; results pending until the melee step resolves`);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      state.plannedMeleeMode = null;
      return;
    }
    const woundState = fireResult?.woundState;
    if (!woundState) return;
    const newlySuppressed = Boolean(fireResult && !fireResult.hit && fireResult.targetNumber - fireResult.hitTotal <= 2 && !state.suppressedCombatantIds.includes(target.id));
    if (newlySuppressed) { state.suppressedCombatantIds.push(target.id); clearAim(state, target.id); }
    if (fireResult?.hit) applyCombatWound(state, target, woundState);
    const ammunitionProfile = attacker.weapon.ammunitionProfiles?.find((profile) => profile.kind === attacker.weapon.ammunitionKind);
    const ammunitionLabel = ammunitionProfile?.label ?? attacker.weapon.ammunitionKind?.toUpperCase();
    if (fireResult?.hit && (attacker.weapon.collateralBlast || (attacker.weapon.ammunitionKind && ammunitionLabel && (attacker.weapon.ammunitionKind === "he" || attacker.weapon.ammunitionKind === "heap")))) {
      state.lastWeaponImpact = {
        weaponName: attacker.weapon.name,
        ammunitionKind: attacker.weapon.ammunitionKind,
        ammunitionLabel: ammunitionLabel ?? attacker.weapon.name,
        point: { ...target.position },
        blastCells: attacker.weapon.collateralBlast ? collateralBlastCells(scenario, target.position) : [{ ...target.position }],
        hit: true,
      };
      state.events.unshift(`${attacker.weapon.name}${ammunitionLabel ? ` ${ammunitionLabel}` : ""} impact at ${target.position.x},${target.position.y} · ${attacker.weapon.collateralBlast ? `blast area ${state.lastWeaponImpact.blastCells.length} squares` : "direct penetration; no blast area"}`);
    }
    if (fireResult?.hit && calledShot === "weapon") { state.weaponDamagedCombatantIds ??= []; if (!state.weaponDamagedCombatantIds.includes(target.id)) state.weaponDamagedCombatantIds.push(target.id); }
    if (fireResult?.hit && calledShot === "mobility") { state.mobilityImpairedCombatantIds ??= []; if (!state.mobilityImpairedCombatantIds.includes(target.id)) state.mobilityImpairedCombatantIds.push(target.id); }
    if (fireMode !== "melee") state.maintainedTargetByCombatantId[attacker.id] = target.id;
    if (fireMode !== "melee") state.ammunitionById[attacker.id] -= ammunitionCost;
    if (fireMode !== "melee") applyZeroGravityRecoil(state, attacker.id);
    if (target.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[combatantId]; });
    state.actionPointsById[attacker.id] -= apCost;
    if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
    state.events.unshift(`${attacker.name} ${fireMode} fired at ${target.name} through ${fireResult!.attackArc} arc (+${fireResult!.arcModifier}): hit ${fireResult!.hitTotal}/${fireResult!.targetNumber} (weapon accuracy ${fireResult!.weaponAccuracy >= 0 ? "+" : ""}${fireResult!.weaponAccuracy}), ${fireResult!.hit ? `wound ${fireResult!.woundTotal} (${fireResult!.woundState}, penetration +${fireResult!.weaponPenetration}${fireResult!.cover ? `, AHL cover wound +${fireResult!.cover}` : ""})` : fireResult!.cover ? "miss (target under cover; no numerical hit modifier)" : "miss"}${highGroundNote(scenario, attacker, target)}`);
    const collateralDefeated: string[] = [];
    if (fireResult?.hit && attacker.weapon.collateralBlast) {
      scenario.combatants.filter((unit) => unit.id !== target.id && !unit.defeated).forEach((unit) => {
        const distance = Math.max(Math.abs(unit.position.x - target.position.x), Math.abs(unit.position.y - target.position.y));
        if (distance > 2) return;
        const rolls = action.payload.collateralRolls?.[unit.id] ?? { checkDice: action.payload.woundDice, woundDice: action.payload.woundDice };
        const checkTotal = rolls.checkDice.first + rolls.checkDice.second;
        const affected = collateralCheckPasses(distance, checkTotal);
        if (!affected) {
          state.events.unshift(`${unit.name} avoided ${attacker.weapon.name} collateral at ${distance} square${distance === 1 ? "" : "s"} (${checkTotal})`);
          return;
        }
        const collateralPenetration = Math.floor(fireResult.weaponPenetration / (2 ** (distance + 1)));
        if (collateralPenetration <= 0) return;
        const collateralTotal = rolls.woundDice.first + rolls.woundDice.second + collateralPenetration - unit.armor;
        applyCombatWound(state, unit, woundStateForTotal(collateralTotal));
        if (unit.defeated) collateralDefeated.push(unit.id);
        state.events.unshift(`${unit.name} suffered ${attacker.weapon.name} collateral at ${distance} square${distance === 1 ? "" : "s"}: wound ${collateralTotal} (${unit.woundState}, penetration +${collateralPenetration})`);
      });
    }
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedMeleeMode = null;
    if (target.side === "enemy" && newlySuppressed) resolveEnemyMorale(state, action.payload.moraleRolls, target.id, "suppression");
    if (target.side === "enemy" && target.defeated) { if (resolveCaptureOutcome(state)) return; resolveEnemyMorale(state, action.payload.moraleRolls, target.id); }
    collateralDefeated.forEach((id) => {
      const unit = scenario.combatants.find((candidate) => candidate.id === id);
      if (unit?.side === "enemy") resolveEnemyMorale(state, action.payload.moraleRolls, id);
    });
    if (collateralDefeated.length > 0) resolveCaptureOutcome(state);
  },
  fireHighEnergyAtStructure: (state, action: PayloadAction<{ structureId: string; hitDice: DicePair; collateralRolls?: Record<string, { checkDice: DicePair; woundDice: DicePair }> }>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    const attacker = scenario?.combatants.find((unit) => unit.id === attackerId);
    const door = scenario?.doors.find((candidate) => candidate.id === action.payload.structureId && !candidate.open);
    const wall = scenario?.walls.find((candidate) => candidate.id === action.payload.structureId);
    const cover = scenario?.objects.find((candidate) => candidate.id === action.payload.structureId && candidate.kind === "cover");
    const structure = door ?? wall ?? cover;
    if (!scenario || !attackerId || !attacker || !structure || !canAttackStructures(attacker) || !highEnergyWeaponReady(state, attacker) || state.status !== "active" || state.actedCombatantIds.includes(attackerId) || (state.actionPointsById[attackerId] ?? 0) < 6 || (state.ammunitionById[attackerId] ?? 0) < 1) return;
    const impact = "position" in structure ? { ...structure.position } : { x: Math.floor((structure.from.x + structure.to.x) / 2), y: Math.floor((structure.from.y + structure.to.y) / 2) };
    const range = Math.ceil(Math.hypot(impact.x - attacker.position.x, impact.y - attacker.position.y));
    const rangeBand = range <= attacker.weapon.effectiveRange ? "effective" : range <= attacker.weapon.longRange ? "long" : range <= attacker.weapon.extremeRange ? "extreme" : null;
    if (!rangeBand) return;
    const targetNumber = rangeBand === "effective" ? 8 : rangeBand === "long" ? 10 : 12;
    const hitTotal = action.payload.hitDice.first + action.payload.hitDice.second + attacker.weaponSkill + 1;
    const hit = hitTotal >= targetNumber;
    const ammunitionLabel = attacker.weapon.ammunitionProfiles?.find((profile) => profile.kind === attacker.weapon.ammunitionKind)?.label;
    state.actionPointsById[attackerId] = 0;
    state.ammunitionById[attackerId] -= 1;
    state.structuralTargeting = false;
    state.plannedStructuralTargetId = null;
    if (!state.actedCombatantIds.includes(attackerId)) state.actedCombatantIds.push(attackerId);
    state.lastWeaponImpact = attacker.weapon.collateralBlast || (attacker.weapon.ammunitionKind && ammunitionLabel) ? {
      weaponName: attacker.weapon.name,
      ammunitionKind: attacker.weapon.ammunitionKind,
      ammunitionLabel: ammunitionLabel ?? attacker.weapon.name,
      point: impact,
      blastCells: hit && attacker.weapon.collateralBlast ? collateralBlastCells(scenario, impact) : [impact],
      hit,
    } : null;
    if (!hit) {
      state.events.unshift(`${attacker.name} fired ${attacker.weapon.name}${ammunitionLabel ? ` ${ammunitionLabel}` : ""} at ${structure.id}: MISS ${hitTotal}/${targetNumber} · 6 AP · 1 ammunition spent`);
      return;
    }
    const penetration = weaponPenetrationForRange(attacker.weapon, rangeBand);
    const damage = attacker.weapon.ammunitionKind === "he" ? 1 : Math.max(0, penetration - 4);
    state.structuralDamageById ??= {};
    state.structuralDamageById[structure.id] = (state.structuralDamageById[structure.id] ?? 0) + damage;
    const threshold = door ? 5 : cover ? 4 : 25;
    const destroyed = state.structuralDamageById[structure.id] >= threshold;
    if (door && destroyed) door.open = true;
    if (wall && destroyed) scenario.walls = scenario.walls.filter((candidate) => candidate.id !== wall.id);
    if (cover && destroyed) scenario.objects = scenario.objects.filter((candidate) => candidate.id !== cover.id);
    state.events.unshift(`${attacker.name} struck ${structure.id} with ${attacker.weapon.name}${ammunitionLabel ? ` ${ammunitionLabel}` : ""}: hit ${hitTotal}/${targetNumber} · ${damage} structural damage (${state.structuralDamageById[structure.id]}/${threshold}) · 6 AP · 1 ammunition spent${attacker.weapon.collateralBlast ? " · blast" : " · concentrated penetration"}${destroyed ? " · breached" : ""}`);
    if (attacker.weapon.collateralBlast) scenario.combatants.filter((unit) => !unit.defeated).forEach((unit) => {
      const distance = Math.max(Math.abs(unit.position.x - impact.x), Math.abs(unit.position.y - impact.y));
      if (distance > 2) return;
      const rolls = action.payload.collateralRolls?.[unit.id] ?? { checkDice: action.payload.hitDice, woundDice: action.payload.hitDice };
      const checkTotal = rolls.checkDice.first + rolls.checkDice.second;
      if (!collateralCheckPasses(distance, checkTotal)) return;
      const collateralPenetration = Math.floor(penetration / (2 ** (distance + 1)));
      if (collateralPenetration <= 0) return;
      const total = rolls.woundDice.first + rolls.woundDice.second + collateralPenetration - unit.armor;
      applyCombatWound(state, unit, woundStateForTotal(total));
      state.events.unshift(`${unit.name} suffered ${attacker.weapon.name} structural-impact collateral: wound ${total} (${unit.woundState}, penetration +${collateralPenetration})`);
    });
    resolveCaptureOutcome(state);
  },
  beginStructuralTargeting: (state) => {
    const attacker = state.scenario?.combatants.find((unit) => unit.id === state.selectedCombatantId);
    if (!attacker || !canAttackStructures(attacker) || !highEnergyWeaponReady(state, attacker) || state.status !== "active" || state.actedCombatantIds.includes(attacker.id) || (state.actionPointsById[attacker.id] ?? 0) < 6 || (state.ammunitionById[attacker.id] ?? 0) < 1) return;
    state.lastWeaponImpact = null;
    state.structuralTargeting = true;
    state.plannedStructuralTargetId = null;
  },
  previewStructuralTarget: (state, action: PayloadAction<string>) => {
    if (!state.structuralTargeting || !state.scenario) return;
    const exists = state.scenario.doors.some((item) => item.id === action.payload && !item.open)
      || state.scenario.walls.some((item) => item.id === action.payload)
      || state.scenario.objects.some((item) => item.id === action.payload && item.kind === "cover");
    if (exists) state.plannedStructuralTargetId = action.payload;
  },
  cancelStructuralTargeting: (state) => { state.structuralTargeting = false; state.plannedStructuralTargetId = null; },
  cancelAttackPreview: (state) => { state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.plannedMeleeMode = null; },
  clearTarget: (state) => {
    const id = state.selectedCombatantId;
    if (id) {
      delete state.maintainedTargetByCombatantId[id];
      clearAim(state, id);
      clearCalledShot(state, id);
    }
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedMeleeMode = null;
  },
  beginCoveringFire: (state) => {
    const id = state.selectedCombatantId;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === id);
    const apCost = attacker?.weapon.highEnergy ? 6 : 3;
    if (!id || !state.scenario || !attacker || !highEnergyWeaponReady(state, attacker) || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < apCost || (state.ammunitionById[id] ?? 0) < 3) return;
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
    const apCost = attacker?.weapon.highEnergy ? 6 : 3;
    if (!id || !target || !attacker || !state.scenario || !highEnergyWeaponReady(state, attacker) || (state.actionPointsById[id] ?? 0) < apCost || (state.ammunitionById[id] ?? 0) < 3) return;
    const cells = fireLaneCells(state.scenario, attacker.position, target);
    if (cells.length === 0) return;
    state.coveringFireLanes = [...state.coveringFireLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target, cells }];
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.coveringFireTargeting = false;
    state.plannedCoveringFireTarget = null;
    state.events.unshift(`${attacker.name} covers lane to ${target.x},${target.y} (${apCost} AP, 3 ammo reserved)`);
  },
  cancelCoveringFire: (state) => { state.coveringFireTargeting = false; state.plannedCoveringFireTarget = null; },
  beginOverwatch: (state) => {
    const id = state.selectedCombatantId;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === id);
    if (!id || !state.scenario || !attacker || attacker.weapon.highEnergy || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 1 || (state.ammunitionById[id] ?? 0) < 1) return;
    state.overwatchTargeting = true;
    state.plannedOverwatchTarget = null;
    state.coveringFireTargeting = false;
    state.plannedCoveringFireTarget = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedMove = null;
  },
  coverDoor: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const attacker = scenario?.combatants.find((unit) => unit.id === id && unit.side === "player" && !unit.defeated);
    const door = scenario?.doors.find((candidate) => candidate.id === action.payload && !candidate.open);
    if (!scenario || !id || !attacker || attacker.weapon.highEnergy || !door || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) < 1) return;
    const farCell = doorFarCell(door, attacker.position);
    if (farCell.x < 0 || farCell.y < 0 || farCell.x >= scenario.width || farCell.y >= scenario.height || distanceBetween(attacker.position, farCell) > 6) return;
    state.coveredDoorByCombatantId ??= {};
    state.coveredDoorByCombatantId[id] = door.id;
    state.overwatchLanes = [...state.overwatchLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target: farCell, cells: [farCell] }];
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.events.unshift(`${attacker.name} covered ${door.id}; reaction reserved for opening or crossing`);
  },
  beginDoorCoverage: (state) => {
    const id = state.selectedCombatantId;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === id && unit.side === "player" && !unit.defeated);
    if (!id || !attacker || attacker.weapon.highEnergy || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) < 1) return;
    state.doorCoverTargeting = true;
    state.plannedCoveredDoorId = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
  },
  previewDoorCoverage: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const attacker = scenario?.combatants.find((unit) => unit.id === id && unit.side === "player" && !unit.defeated);
    const door = scenario?.doors.find((candidate) => candidate.id === action.payload && !candidate.open);
    if (!scenario || !id || !attacker || !door || !state.doorCoverTargeting) return;
    const farCell = doorFarCell(door, attacker.position);
    if (farCell.x >= 0 && farCell.y >= 0 && farCell.x < scenario.width && farCell.y < scenario.height && distanceBetween(attacker.position, farCell) <= 6) state.plannedCoveredDoorId = door.id;
  },
  confirmDoorCoverage: (state) => {
    const scenario = state.scenario;
    const id = state.selectedCombatantId;
    const attacker = scenario?.combatants.find((unit) => unit.id === id && unit.side === "player" && !unit.defeated);
    const door = scenario?.doors.find((candidate) => candidate.id === state.plannedCoveredDoorId && !candidate.open);
    if (!scenario || !id || !attacker || attacker.weapon.highEnergy || !door || !state.doorCoverTargeting || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 3 || (state.ammunitionById[id] ?? 0) < 1) return;
    const farCell = doorFarCell(door, attacker.position);
    if (distanceBetween(attacker.position, farCell) > 6) return;
    state.coveredDoorByCombatantId ??= {};
    state.coveredDoorByCombatantId[id] = door.id;
    state.overwatchLanes = [...state.overwatchLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target: farCell, cells: [farCell] }];
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.doorCoverTargeting = false;
    state.plannedCoveredDoorId = null;
    state.events.unshift(`${attacker.name} covered ${door.id}; reaction reserved for opening or crossing`);
  },
  cancelDoorCoverageTargeting: (state) => { state.doorCoverTargeting = false; state.plannedCoveredDoorId = null; },
  cancelDoorCoverage: (state, action: PayloadAction<string | undefined>) => {
    const id = action.payload ?? state.selectedCombatantId;
    if (!id || !state.coveredDoorByCombatantId?.[id]) return;
    clearDoorCoverage(state, id, "manually canceled");
  },
  previewOverwatch: (state, action: PayloadAction<GridPoint>) => {
    const id = state.selectedCombatantId;
    if (!id || !state.scenario || !state.overwatchTargeting || !validCoveringFireTargets(state.scenario, id).some((point) => pointKey(point) === pointKey(action.payload))) return;
    state.plannedOverwatchTarget = action.payload;
  },
  confirmOverwatch: (state) => {
    const id = state.selectedCombatantId;
    const target = state.plannedOverwatchTarget;
    const attacker = state.scenario?.combatants.find((unit) => unit.id === id);
    if (!id || !target || !attacker || attacker.weapon.highEnergy || !state.scenario || (state.actionPointsById[id] ?? 0) < 1 || (state.ammunitionById[id] ?? 0) < 1) return;
    const cells = fireLaneCells(state.scenario, attacker.position, target);
    if (cells.length === 0) return;
    state.overwatchLanes = [...state.overwatchLanes.filter((lane) => lane.attackerId !== id), { attackerId: id, target, cells }];
    state.actionPointsById[id] = 0;
    if (!state.actedCombatantIds.includes(id)) state.actedCombatantIds.push(id);
    state.overwatchTargeting = false;
    state.plannedOverwatchTarget = null;
    state.events.unshift(`${attacker.name} watches lane to ${target.x},${target.y} (activation ended, 1 ammo on trigger)`);
  },
  cancelOverwatch: (state) => { state.overwatchTargeting = false; state.plannedOverwatchTarget = null; },
  beginGrenadeTargeting: (state) => {
    state.lastWeaponImpact = null;
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || unit.grenades < 1 || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 6) return;
    state.grenadeTargeting = true;
    state.grenadeKind = "fragmentation";
    state.lastGrenadeImpact = null;
    state.plannedGrenadeTarget = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
  },
  beginSmokeGrenadeTargeting: (state) => {
    state.lastWeaponImpact = null;
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || (unit.smokeGrenades ?? 0) < 1 || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 6) return;
    state.grenadeTargeting = true;
    state.grenadeKind = "smoke";
    state.lastGrenadeImpact = null;
    state.plannedGrenadeTarget = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
  },
  beginStunGrenadeTargeting: (state) => {
    state.lastWeaponImpact = null;
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || (unit.stunGrenades ?? 0) < 1 || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 6) return;
    state.grenadeTargeting = true;
    state.grenadeKind = "stun";
    state.lastGrenadeImpact = null;
    state.plannedGrenadeTarget = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.plannedObjectiveId = null;
  },
  beginFlareGrenadeTargeting: (state) => {
    state.lastWeaponImpact = null;
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || (unit.flareGrenades ?? 0) < 1 || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 6) return;
    state.grenadeTargeting = true;
    state.grenadeKind = "flare";
    state.lastGrenadeImpact = null;
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
  cancelGrenadeTargeting: (state) => { state.grenadeTargeting = false; state.grenadeKind = null; state.plannedGrenadeTarget = null; },
  confirmGrenade: (state, action: PayloadAction<{ rollsByCombatantId: Record<string, DicePair>; throwDice?: DicePair; scatterDice?: DicePair; occupiedSquareRolls?: Record<string, number>; collateralRolls?: Record<string, { checkDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls }>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    const center = state.plannedGrenadeTarget;
    const attacker = scenario?.combatants.find((unit) => unit.id === attackerId);
    const grenadeKind = state.grenadeKind ?? "fragmentation";
    if (state.status !== "active" || !scenario || !attackerId || !attacker || !center || !state.grenadeTargeting || (grenadeKind === "smoke" ? (attacker.smokeGrenades ?? 0) < 1 : grenadeKind === "stun" ? (attacker.stunGrenades ?? 0) < 1 : grenadeKind === "flare" ? (attacker.flareGrenades ?? 0) < 1 : attacker.grenades < 1) || state.actedCombatantIds.includes(attackerId) || (state.actionPointsById[attackerId] ?? 0) < 6) return;
    if (!validGrenadeTargets(scenario, attackerId).some((point) => pointKey(point) === pointKey(center))) return;
    const throwModifier = grenadeThrowRangeModifier(attacker.position, center) + grenadeThrowCoverModifier(scenario, attacker.id, center);
    const throwResult = action.payload.throwDice && action.payload.scatterDice
      ? grenadeLandingPoint(scenario, attacker.position, center, action.payload.throwDice, action.payload.scatterDice, throwModifier, action.payload.occupiedSquareRolls)
      : { landing: center, hit: true };
    const landing = throwResult.landing;
    const blastCells = grenadeKind === "fragmentation" ? collateralBlastCells(scenario, landing) : grenadeBlastCells(scenario, landing);
    const blastKeys = new Set(blastCells.map(pointKey));
    state.lastGrenadeImpact = { kind: grenadeKind, intended: center, landing, scattered: !throwResult.hit, blastCells };
    const affected = scenario.combatants.filter((unit) => !unit.defeated && blastKeys.has(pointKey(unit.position)));
    if (grenadeKind === "smoke") {
      scenario.smokeCells ??= [];
      blastCells.forEach((cell) => {
        if (!scenario.smokeCells!.some((smoke) => pointKey(smoke) === pointKey(cell))) scenario.smokeCells!.push({ ...cell });
        state.smokeClearsAtTurnByCell[pointKey(cell)] = state.turn + 3;
      });
    } else if (grenadeKind === "flare") {
      scenario.flareCells = blastCells.map((cell) => ({ ...cell }));
      state.flareClearsAtTurnByCell = Object.fromEntries(blastCells.map((cell) => [pointKey(cell), state.turn + 3]));
    } else if (grenadeKind === "stun") affected.forEach((target) => {
      const dice = action.payload.rollsByCombatantId[target.id];
      if (!dice) return;
      const resistance = dice.first + dice.second + target.armor;
      if (resistance < 8) target.stunnedUntilTurn = state.turn + 1;
      state.events.unshift(`${target.name} resisted stun ${resistance}/8: ${resistance < 8 ? "stunned" : "unaffected"}`);
    }); else affected.forEach((target) => {
      const distance = Math.max(Math.abs(target.position.x - landing.x), Math.abs(target.position.y - landing.y));
      const rolls = action.payload.collateralRolls?.[target.id] ?? (action.payload.rollsByCombatantId[target.id] ? { checkDice: action.payload.rollsByCombatantId[target.id], woundDice: action.payload.rollsByCombatantId[target.id] } : null);
      if (!rolls) return;
      const checkTotal = rolls.checkDice.first + rolls.checkDice.second;
      if (!collateralCheckPasses(distance, checkTotal)) {
        state.events.unshift(`${target.name} avoided fragmentation collateral at ${distance} square${distance === 1 ? "" : "s"} (${checkTotal})`);
        return;
      }
      const penetration = Math.floor(3 / (2 ** distance));
      if (penetration <= 0) return;
      const woundRoll = rolls.woundDice.first + rolls.woundDice.second;
      const total = woundRoll + penetration - target.armor;
      applyCombatWound(state, target, escalateWoundState(woundStateForTotal(total)));
      if (target.defeated) {
        target.health = 0;
        Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[combatantId]; });
      }
      state.events.unshift(`${target.name} caught in grenade blast at ${distance} square${distance === 1 ? "" : "s"}: ${woundRoll} +${penetration} penetration -${target.armor} armor = ${total}; HE escalation (${target.woundState})`);
    });
    if (grenadeKind === "smoke") attacker.smokeGrenades = (attacker.smokeGrenades ?? 0) - 1;
    else if (grenadeKind === "stun") attacker.stunGrenades = (attacker.stunGrenades ?? 0) - 1;
    else if (grenadeKind === "flare") attacker.flareGrenades = (attacker.flareGrenades ?? 0) - 1;
    else attacker.grenades -= 1;
    state.actionPointsById[attackerId] = 0;
    if (!state.actedCombatantIds.includes(attackerId)) state.actedCombatantIds.push(attackerId);
    state.events.unshift(throwResult.hit
      ? `${attacker.name} landed a ${grenadeKind} grenade at ${landing.x},${landing.y} (${action.payload.throwDice ? `${action.payload.throwDice.first + action.payload.throwDice.second}${throwModifier ? ` ${throwModifier > 0 ? "+" : ""}${throwModifier}` : ""} vs 8, ` : ""}6 AP)`
      : `${attacker.name} threw ${grenadeKind} at ${center.x},${center.y}; grenade scattered to ${landing.x},${landing.y} (6 AP)`);
    state.grenadeTargeting = false;
    state.grenadeKind = null;
    state.plannedGrenadeTarget = null;
    if (resolveRescueFailure(state)) return;
    if (resolveCaptureOutcome(state)) return;
    if (grenadeKind === "fragmentation") affected.filter((unit) => unit.side === "enemy" && unit.defeated).forEach((unit) => resolveEnemyMorale(state, action.payload.moraleRolls, unit.id));
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
    if (patient.woundState === "light") {
      patient.woundState = "healthy";
      patient.seriousWounds = 0;
    } else patient.seriousWounds = Math.max(1, patient.seriousWounds ?? 1);
    medic.medkits -= 1;
    state.actionPointsById[medicId] = 0;
    if (!state.actedCombatantIds.includes(medicId)) state.actedCombatantIds.push(medicId);
    state.events.unshift(`${medic.name} treated ${patient.name}: ${wasIncapacitated ? `${patient.woundState} stabilized; remains incapacitated` : patient.woundState}`);
    state.plannedTreatmentTargetId = null;
  },
  previewSecureObjective: (state, action: PayloadAction<string>) => {
    state.lastWeaponImpact = null;
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId)) return;
    if (adjacentObjectives(scenario, combatantId).some((objective) => objective.id === action.payload) && objectiveContesters(scenario, action.payload, state.moraleStateByCombatantId, state.turn).length === 0) {
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
    if (state.status !== "active" || !scenario || !combatantId || !objectiveId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 6 || (scenario.id === "damage-control" && remainingCriticalFireCells(scenario).length > 0)) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
    const objective = adjacentObjectives(scenario, combatantId).find((candidate) => candidate.id === objectiveId);
    if (!unit || !objective || objectiveContesters(scenario, objectiveId, state.moraleStateByCombatantId, state.turn).length > 0) return;
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
      captive.seriousWounds = 0;
      state.actionPointsById[captive.id] = 0;
      if (!state.actedCombatantIds.includes(captive.id)) state.actedCombatantIds.push(captive.id);
      state.events.unshift(`${unit.name} released ${captive.name}; escort them to extraction`);
    } else if (scenario.victoryCondition === "staged-objectives") {
      objective.completed = true;
      const remainingStage = scenario.stageObjectiveIds?.find((id) => !scenario.objects.find((candidate) => candidate.id === id)?.completed);
      if (remainingStage) {
        const nextObjective = scenario.objects.find((candidate) => candidate.id === remainingStage);
        const door = scenario.doors.find((candidate) => candidate.id === scenario.stageUnlockDoorId);
        if (door && !state.placedBreachingChargeByDoorId[door.id]) { door.locked = false; door.open = true; }
        if (!door && nextObjective) scenario.objective = `Current objective: secure ${nextObjective.label}.`;
        state.events.unshift(door ? `${unit.name} disabled ${objective.label}; bridge access unlocked` : `${unit.name} secured ${objective.label}; ${nextObjective?.label ?? "next control station"} is now active`);
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
      applyCombatWound(state, target, woundStateForTotal(total));
      state.events.unshift(`${target.name} caught in breaching blast: ${total} (${target.woundState})`);
    });
    if (resolveCaptureOutcome(state)) return;
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
    const unit = scenario.combatants.find((candidate) => candidate.id === id);
    if (unit?.weapon.ammunitionKind) {
      state.ammunitionByCombatantAndKind ??= {};
      state.ammunitionByCombatantAndKind[id] ??= {};
      state.ammunitionByCombatantAndKind[id][unit.weapon.ammunitionKind] = state.ammunitionById[id];
    }
    state.actionPointsById[id] -= 3;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift(`${scenario.combatants.find((unit) => unit.id === id)?.name ?? id} reloaded (3 AP)`);
  },
  selectWeaponAmmunition: (state, action: PayloadAction<WeaponAmmunitionKind>) => {
    const unit = state.scenario?.combatants.find((candidate) => candidate.id === state.selectedCombatantId);
    const profile = unit?.weapon.ammunitionProfiles?.find((candidate) => candidate.kind === action.payload);
    if (!unit || !profile || state.actedCombatantIds.includes(unit.id)) return;
    state.ammunitionByCombatantAndKind ??= {};
    state.ammunitionByCombatantAndKind[unit.id] ??= {};
    const counts = state.ammunitionByCombatantAndKind[unit.id];
    if (unit.weapon.ammunitionKind) counts[unit.weapon.ammunitionKind] = state.ammunitionById[unit.id] ?? 0;
    const selectedCount = counts[profile.kind] ?? unit.weapon.magazineSize ?? 12;
    if (selectedCount <= 0 && unit.weapon.ammunitionKind !== profile.kind) return;
    unit.weapon.ammunitionKind = profile.kind;
    unit.weapon.effectiveRange = profile.effectiveRange;
    unit.weapon.longRange = profile.longRange;
    unit.weapon.extremeRange = profile.extremeRange;
    unit.weapon.penetration = profile.penetration;
    unit.weapon.automatic = profile.automatic ?? false;
    unit.weapon.automaticFireBonusByRange = profile.automaticFireBonusByRange;
    unit.weapon.penetrationByRange = profile.penetrationByRange;
    unit.weapon.accuracyByRange = profile.accuracyByRange;
    unit.weapon.woundEscalation = profile.woundEscalation;
    unit.weapon.collateralBlast = profile.collateralBlast;
    state.ammunitionById[unit.id] = selectedCount;
    state.plannedAttackMode = null;
    state.events.unshift(`${unit.name} selected ${profile.label} ammunition`);
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
  resolveAdjacencyReaction: (state, action: PayloadAction<{ accept: boolean; hitDice?: DicePair; woundDice?: DicePair }>) => {
    const pending = state.pendingAdjacencyReaction;
    const scenario = state.scenario;
    if (!pending || !scenario) return;
    const reactor = scenario.combatants.find((unit) => unit.id === pending.reactorId && !unit.defeated);
    const mover = scenario.combatants.find((unit) => unit.id === pending.moverId && !unit.defeated);
    state.pendingAdjacencyReaction = null;
    state.adjacencyReactionUsedCombatantIds ??= [];
    const opportunityKey = `${pending.reactorId}:${pending.moverId}`;
    if (!state.adjacencyReactionUsedCombatantIds.includes(opportunityKey)) state.adjacencyReactionUsedCombatantIds.push(opportunityKey);
    if (!action.payload.accept || !reactor || !mover || !action.payload.hitDice || !action.payload.woundDice || (state.adjacencyReactionReserveById?.[reactor.id] ?? 0) < 3 || (state.ammunitionById[reactor.id] ?? 0) < 1) {
      state.processedEnemyPhaseCombatantIds = (state.processedEnemyPhaseCombatantIds ?? []).filter((id) => id !== pending.moverId);
      state.events.unshift(`${reactor?.name ?? "Character"} declined adjacency reaction fire`);
      return;
    }
    const originalPosition = { ...mover.position };
    mover.position = { ...pending.trigger };
    const reaction = resolveSnapShot(reactor, mover, action.payload.hitDice, action.payload.woundDice, coverProtection(scenario, reactor.id, mover.id), "snap", false, false, false, visibilityAssessment(scenario, reactor, mover).modifier, false, false, elevationAttackModifier(scenario, reactor, mover));
    state.adjacencyReactionReserveById![reactor.id] -= 3;
    state.ammunitionById[reactor.id] -= 1;
    if (reaction?.hit) applyCombatWound(state, mover, reaction.woundState);
    if (reaction) state.events.unshift(`${reactor.name} adjacency snap shot as ${mover.name} approached: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}`);
    if (mover.defeated) {
      state.events.unshift(`${mover.name} movement stopped by adjacency reaction fire`);
      resolveEnemyMorale(state, {}, mover.id);
      return;
    }
    mover.position = originalPosition;
    state.processedEnemyPhaseCombatantIds = (state.processedEnemyPhaseCombatantIds ?? []).filter((id) => id !== pending.moverId);
  },
  goProne: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!id || !unit || unit.posture === "prone" || state.status !== "active" || state.actedCombatantIds.includes(id) || state.trottingCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 1) return;
    unit.posture = "prone";
    clearWeaponReady(state, id);
    state.actionPointsById[id] -= 1;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedMove = null;
    state.events.unshift(`${unit.name} went prone (1 AP)`);
  },
  braceWeapon: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!id || !unit || unit.posture !== "prone" || state.status !== "active" || state.actedCombatantIds.includes(id) || state.bracedCombatantIds.includes(id) || state.suppressedCombatantIds.includes(id) || state.draggingCombatantByCarrierId[id] || (state.actionPointsById[id] ?? 0) < 2) return;
    state.bracedCombatantIds.push(id);
    clearWeaponReady(state, id);
    state.actionPointsById[id] -= 2;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.events.unshift(`${unit.name} braced their weapon (2 AP)`);
  },
  standUp: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id && combatant.side === "player" && !combatant.defeated);
    if (!id || !unit || unit.posture !== "prone" || state.status !== "active" || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 2) return;
    unit.posture = "standing";
    clearWeaponReady(state, id);
    state.bracedCombatantIds = state.bracedCombatantIds.filter((combatantId) => combatantId !== id);
    state.actionPointsById[id] -= 2;
    if (state.actionPointsById[id] === 0) state.actedCombatantIds.push(id);
    state.plannedMove = null;
    state.events.unshift(`${unit.name} stood up (2 AP)`);
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
  rallyAlly: (state, action: PayloadAction<{ targetId: string; dice: DicePair }>) => {
    const leaderId = state.selectedCombatantId;
    const scenario = state.scenario;
    const leader = scenario?.combatants.find((unit) => unit.id === leaderId && !unit.defeated);
    const target = scenario?.combatants.find((unit) => unit.id === action.payload.targetId && !unit.defeated);
    if (!leaderId || !scenario || !leader || !target || state.status !== "active" || state.leaderIdBySide?.[leader.side] !== leaderId || leader.side !== target.side || leader.id === target.id || distanceBetween(leader.position, target.position) > 4 || state.actedCombatantIds.includes(leaderId) || (state.actionPointsById[leaderId] ?? 0) < 3) return;
    const current = state.moraleStateByCombatantId?.[target.id] ?? "steady";
    if (current !== "shaken" && current !== "panicked") return;
    const leadership = leader.leadershipRating ?? 1;
    const total = action.payload.dice.first + action.payload.dice.second + leadership - (leader.woundState === "light" ? 1 : 0);
    state.actionPointsById[leaderId] -= 3;
    if (state.actionPointsById[leaderId] === 0) state.actedCombatantIds.push(leaderId);
    if (total >= 7) {
      const next: MoraleState = current === "panicked" ? "shaken" : "steady";
      state.moraleStateByCombatantId ??= {};
      state.moraleStateByCombatantId[target.id] = next;
      state.events.unshift(`${leader.name} rallied ${target.name} ${total}/7: ${current} → ${next} (3 AP)`);
    } else state.events.unshift(`${leader.name} failed to rally ${target.name} ${total}/7 (3 AP)`);
  },
  restrainEnemy: (state, action: PayloadAction<string>) => {
    const actorId = state.selectedCombatantId;
    const actor = state.scenario?.combatants.find((unit) => unit.id === actorId && unit.side === "player" && !unit.defeated);
    const target = state.scenario?.combatants.find((unit) => unit.id === action.payload && unit.side === "enemy" && !unit.defeated);
    if (!actorId || !actor || !target || state.status !== "active" || !target.stunnedUntilTurn || distanceBetween(actor.position, target.position) !== 1 || state.actedCombatantIds.includes(actorId) || (state.actionPointsById[actorId] ?? 0) < 3) return;
    target.surrendered = true;
    target.defeated = true;
    delete target.stunnedUntilTurn;
    state.actionPointsById[actorId] -= 3;
    if (state.actionPointsById[actorId] === 0) state.actedCombatantIds.push(actorId);
    state.suppressedCombatantIds = state.suppressedCombatantIds.filter((id) => id !== target.id);
    state.overwatchLanes = state.overwatchLanes.filter((lane) => lane.attackerId !== target.id);
    state.coveringFireLanes = state.coveringFireLanes.filter((lane) => lane.attackerId !== target.id);
    delete state.maintainedTargetByCombatantId[target.id];
    Object.entries(state.maintainedTargetByCombatantId).forEach(([id, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[id]; });
    state.events.unshift(`${actor.name} restrained ${target.name}; ${target.name} surrendered (3 AP)`);
    if (resolveCaptureOutcome(state)) return;
    resolveEnemyMorale(state, {}, target.id, "restraint");
  },
  vaultBarrier: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const actorId = state.selectedCombatantId;
    if (!scenario || !actorId || state.status !== "active" || state.actedCombatantIds.includes(actorId) || state.enemySquareEnteredCombatantIds?.includes(actorId) || (state.actionPointsById[actorId] ?? 0) < 3) return;
    const option = vaultOptions(scenario, actorId).find(({ barrier }) => barrier.id === action.payload);
    const actor = scenario.combatants.find((unit) => unit.id === actorId);
    if (!option || !actor) return;
    const dx = option.landing.x - actor.position.x;
    const dy = option.landing.y - actor.position.y;
    actor.position = option.landing;
    actor.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
    state.actionPointsById[actor.id] -= 3;
    if (state.actionPointsById[actor.id] === 0) state.actedCombatantIds.push(actor.id);
    clearDoorCoverage(state, actor.id, "character vaulted");
    clearWeaponReady(state, actor.id);
    clearAim(state, actor.id);
    clearCalledShot(state, actor.id);
    state.bracedCombatantIds = state.bracedCombatantIds.filter((id) => id !== actor.id);
    state.events.unshift(`${actor.name} vaulted ${option.barrier.label} to ${option.landing.x},${option.landing.y} (3 AP)`);
  },
  finishActivation: (state) => {
    const id = state.selectedCombatantId;
    if (!id || state.actedCombatantIds.includes(id)) return;
    const remainingAp = state.actionPointsById[id] ?? 0;
    state.adjacencyReactionReserveById ??= {};
    if (remainingAp >= 3 && !state.movedCombatantIds?.includes(id)) state.adjacencyReactionReserveById[id] = remainingAp;
    state.actionPointsById[id] = 0;
    state.actedCombatantIds.push(id);
    clearAim(state, id);
    clearCalledShot(state, id);
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.grenadeTargeting = false;
    state.plannedGrenadeTarget = null;
    state.plannedTreatmentTargetId = null;
    state.plannedObjectiveId = null;
  },
  endPlayerTurn: (state, action: PayloadAction<{ enemyRolls: Record<string, { hitDice: DicePair; woundDice: DicePair }>; dangerSpaceRolls?: Record<string, Record<string, { hitDice: DicePair; woundDice: DicePair }>>; moraleRolls?: MoraleRolls }>) => {
    if (state.awaitingAhlMeleeAcknowledgement) return;
    state.lastWeaponImpact = null;
    const scenario = state.scenario;
    const playerIds = scenario?.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) ?? [];
    if (state.status !== "active" || state.pendingAdjacencyReaction || playerIds.length === 0 || !playerIds.every((id) => state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) === 0)) return;
    const playerMeleePending = (state.ahlMeleeDeclarations?.length ?? 0) > 0;
    resolveQueuedAhlMelee(state, action.payload.moraleRolls);
    if (state.status !== "active") return;
    if (playerMeleePending) {
      state.awaitingAhlMeleeAcknowledgement = true;
      return;
    }
    state.lastGrenadeImpact = null;
    state.overwatchLanes.filter((lane) => scenario?.combatants.find((unit) => unit.id === lane.attackerId)?.side === "enemy").forEach((lane) => {
      const unit = scenario?.combatants.find((combatant) => combatant.id === lane.attackerId);
      if (unit) state.events.unshift(`${unit.name} overwatch expired`);
    });
    state.overwatchLanes = state.overwatchLanes.filter((lane) => scenario?.combatants.find((unit) => unit.id === lane.attackerId)?.side !== "enemy");
    if (resolveHoldZoneCapture(state)) return;
    for (const enemy of scenario!.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated)) {
      if (state.processedEnemyPhaseCombatantIds?.includes(enemy.id)) continue;
      state.processedEnemyPhaseCombatantIds ??= [];
      state.processedEnemyPhaseCombatantIds.push(enemy.id);
      const activePlayers = scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
      const avoidedDoorIds = visibleCoveredDoorIds(state, enemy);
      const tacticalScenario = scenarioAvoidingVisibleCoveredDoors(scenario!, avoidedDoorIds);
      const fireSafeScenario = scenarioAvoidingFireForPathfinding(tacticalScenario);
      if (activePlayers.length === 0) break;
      const heard = enemy.concealed ? [...(state.playerNoiseContacts ?? [])].sort((a, b) => b.expiresAtTurn - a.expiresAtTurn || distanceBetween(enemy.position, a.point) - distanceBetween(enemy.position, b.point))[0] : null;
      if (heard) {
        state.investigationTargetByEnemyId ??= {};
        state.investigationTargetByEnemyId[enemy.id] = { ...heard.point };
        enemy.facing = Math.abs(heard.point.x - enemy.position.x) >= Math.abs(heard.point.y - enemy.position.y) ? heard.point.x > enemy.position.x ? "east" : "west" : heard.point.y > enemy.position.y ? "south" : "north";
        state.events.unshift(`${enemy.name} heard movement and oriented toward the sound`);
      }
      const moraleState = state.moraleStateByCombatantId?.[enemy.id] ?? "steady";
      if ((enemy.stunnedUntilTurn ?? 0) >= state.turn) {
        delete enemy.stunnedUntilTurn;
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} lost activation while stunned`);
        continue;
      }
      if (moraleState === "panicked") {
        const nearest = [...activePlayers].sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
        const retreats = [...reachableMovement(fireSafeScenario, enemy.id, 3).values()];
        const retreat = retreats.sort((a, b) => distanceBetween(b.destination, nearest.position) - distanceBetween(a.destination, nearest.position) || b.cost - a.cost)[0];
        if (retreat) {
          const before = retreat.path.length > 1 ? retreat.path[retreat.path.length - 2] : enemy.position;
          enemy.position = retreat.destination;
          enemy.facing = retreat.destination.x > before.x ? "east" : retreat.destination.x < before.x ? "west" : retreat.destination.y > before.y ? "south" : "north";
          state.events.unshift(`${enemy.name} panicked and retreated to ${enemy.position.x},${enemy.position.y}`);
        } else state.events.unshift(`${enemy.name} panicked but could not retreat`);
        state.actionPointsById[enemy.id] = 0;
        continue;
      }
      const defendedObjectiveId = scenario!.defendedObjectiveByCombatantId?.[enemy.id];
      const defendedObjective = defendedObjectiveId
        ? scenario!.objects.find((object) => object.id === defendedObjectiveId && !object.completed) ?? null
        : null;
      const stationThreatened = defendedObjective
        ? activePlayers.some((player) => distanceBetween(player.position, defendedObjective.position) === 1)
        : false;
      const withinDefensiveArea = (point: GridPoint) => !defendedObjective || distanceBetween(point, defendedObjective.position) <= 3;
      const enemySmokeDice = action.payload.enemyRolls[enemy.id]?.hitDice;
      const playerFiringSolutions = activePlayers.filter((player) => rangedEnemies(scenario!, player.id).some((target) => target.id === enemy.id)).length;
      const enemyInSmoke = scenario!.smokeCells?.some((cell) => pointKey(cell) === pointKey(enemy.position)) ?? false;
      if ((enemy.smokeGrenades ?? 0) > 0 && !enemyInSmoke && (state.suppressedCombatantIds.includes(enemy.id) || playerFiringSolutions >= 2) && enemySmokeDice) {
        const throwResult = grenadeLandingPoint(scenario!, enemy.position, enemy.position, enemySmokeDice, action.payload.enemyRolls[enemy.id]?.woundDice ?? enemySmokeDice);
        const smokeCells = grenadeBlastCells(scenario!, throwResult.landing);
        scenario!.smokeCells ??= [];
        smokeCells.forEach((cell) => {
          if (!scenario!.smokeCells!.some((smoke) => pointKey(smoke) === pointKey(cell))) scenario!.smokeCells!.push({ ...cell });
          state.smokeClearsAtTurnByCell[pointKey(cell)] = state.turn + 3;
        });
        enemy.smokeGrenades = (enemy.smokeGrenades ?? 0) - 1;
        state.lastGrenadeImpact = { kind: "smoke", intended: { ...enemy.position }, landing: throwResult.landing, scattered: !throwResult.hit, blastCells: smokeCells };
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(throwResult.hit
          ? `${enemy.name} deployed smoke at ${throwResult.landing.x},${throwResult.landing.y}`
          : `${enemy.name} deployed smoke; it scattered to ${throwResult.landing.x},${throwResult.landing.y}`);
        continue;
      }
      const nearestDiveThreat = [...activePlayers].sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const rallyDiceTotal = enemySmokeDice ? enemySmokeDice.first + enemySmokeDice.second : 7;
      const suppressionRequiresDive = state.suppressedCombatantIds.includes(enemy.id) && rallyDiceTotal < 7;
      const suppressionCanRally = state.suppressedCombatantIds.includes(enemy.id) && rallyDiceTotal >= 7;
      const defensiveDive = scenario!.gravityMode !== "zero-g" && enemy.posture !== "prone" && !suppressionCanRally && (suppressionRequiresDive || playerFiringSolutions >= 2)
        ? [...diveOptions(fireSafeScenario, enemy.id).values()]
          .filter((move) => !scenario!.fireCells?.some((fire) => pointKey(fire) === pointKey(move.destination)))
          .filter((move) => scenario!.objects.some((object) => object.kind === "cover" && distanceBetween(object.position, move.destination) === 1))
          .sort((a, b) => distanceBetween(b.destination, nearestDiveThreat.position) - distanceBetween(a.destination, nearestDiveThreat.position) || pointKey(a.destination).localeCompare(pointKey(b.destination)))[0] ?? null
        : null;
      const enemyLeaderId = state.leaderIdBySide?.enemy ?? null;
      const livingLeader = scenario!.combatants.find((unit) => unit.id === enemyLeaderId && !unit.defeated);
      const rallyTarget = enemy.id === enemyLeaderId ? scenario!.combatants.find((unit) => unit.side === "enemy" && unit.id !== enemy.id && !unit.defeated && state.suppressedCombatantIds.includes(unit.id) && distanceBetween(enemy.position, unit.position) <= 4) : null;
      const selfRally = state.suppressedCombatantIds.includes(enemy.id);
      if (rallyTarget || selfRally) {
        const target = rallyTarget ?? enemy;
        const dice = action.payload.enemyRolls[enemy.id]?.hitDice;
        const leaderInCommand = livingLeader && distanceBetween(target.position, livingLeader.position) <= 4;
        const leadership = leaderInCommand ? livingLeader.leadershipRating ?? 1 : 0;
        if (dice) {
          const total = dice.first + dice.second + leadership - (enemy.woundState === "light" ? 1 : 0);
          if (total >= 7) {
            state.suppressedCombatantIds = state.suppressedCombatantIds.filter((id) => id !== target.id);
            state.events.unshift(`${enemy.name} rallied ${target.id === enemy.id ? "themself" : target.name} ${total}/7${leadership ? ` with +${leadership} leadership` : ""}`);
            state.actionPointsById[enemy.id] = 0;
            continue;
          }
          state.events.unshift(`${enemy.name} failed to rally ${target.id === enemy.id ? "themself" : target.name} ${total}/7${leadership ? ` with +${leadership} leadership` : ""}`);
          if (!defensiveDive) {
            state.actionPointsById[enemy.id] = 0;
            continue;
          }
        }
      }
      const enemyShaken = moraleState === "shaken";
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
          const reaction = resolveSnapShot(coveringAttacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, coveringAttacker.id, enemy.id), "covering", state.evadingCombatantIds.includes(enemy.id), false, state.bracedCombatantIds.includes(coveringAttacker.id), visibilityAssessment(scenario!, coveringAttacker, enemy).modifier, state.weaponReadyCombatantIds?.includes(coveringAttacker.id), false, elevationAttackModifier(scenario!, coveringAttacker, enemy));
          if (reaction) clearWeaponReady(state, coveringAttacker.id);
          if (reaction) {
            if (!state.suppressedCombatantIds.includes(enemy.id)) state.suppressedCombatantIds.push(enemy.id);
            if (reaction.hit) applyCombatWound(state, enemy, reaction.woundState);
            state.events.unshift(`${coveringAttacker.name} covering fired at ${enemy.name} through ${reaction.attackArc} arc (+${reaction.arcModifier}): hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}${highGroundNote(scenario!, coveringAttacker, enemy)}`);
            applyZeroGravityRecoil(state, coveringAttacker.id);
            if (enemy.defeated) {
              state.events.unshift(`${enemy.name} action interrupted`);
              resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id);
              if (scenario!.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)) return;
              continue;
            }
          }
        }
      }
      const target = [...activePlayers].sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const meleeTarget = enemy.meleeRating > enemy.weaponSkill + 1 ? meleeEnemies(scenario!, enemy.id).find((candidate) => candidate.side === "player") : null;
      if (meleeTarget) {
        const dice = action.payload.enemyRolls[enemy.id];
        if (!dice) continue;
        const sameSquare = pointKey(enemy.position) === pointKey(meleeTarget.position);
        state.ahlMeleeDeclarations ??= [];
        state.ahlMeleeDeclarations.push({ attackerId: enemy.id, targetId: meleeTarget.id, roll: dice.hitDice.first, responseRoll: dice.woundDice.first, tieBreaker: dice.hitDice.second, sameSquare, attackerDived: false });
        state.ahlMeleeEngagedCombatantIds = [...new Set([...(state.ahlMeleeEngagedCombatantIds ?? []), enemy.id, meleeTarget.id])];
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} allocated AHL melee against ${meleeTarget.name}; results pending until the melee step resolves`);
        continue;
      }
      const enemyClimb = defensiveDive || stationThreatened || rangedEnemies(scenario!, enemy.id).some((candidate) => candidate.side === "player") ? null : climbUpOptions(scenario!, enemy.id)
        .filter(withinDefensiveArea)
        .filter((destination) => distanceBetween(destination, target.position) < distanceBetween(enemy.position, target.position))
        .sort((a, b) => distanceBetween(a, target.position) - distanceBetween(b, target.position))[0];
      if (enemyClimb) {
        const origin = { ...enemy.position };
        const footingDice = action.payload.enemyRolls[enemy.id]?.hitDice;
        const footingTotal = footingDice ? footingDice.first + footingDice.second : 7;
        state.actionPointsById[enemy.id] = 0;
        if (footingTotal >= 7) {
          enemy.position = enemyClimb;
          enemy.facing = enemyClimb.x > origin.x ? "east" : enemyClimb.x < origin.x ? "west" : enemyClimb.y > origin.y ? "south" : "north";
          state.events.unshift(`${enemy.name} passed climb check ${footingTotal}/7 and climbed to ${enemyClimb.x},${enemyClimb.y} (6 AP)`);
        } else {
          enemy.posture = "prone";
          state.events.unshift(`${enemy.name} failed climb check ${footingTotal}/7: remained below, prone, activation ended`);
        }
        continue;
      }
      const enemyDrop = defensiveDive || stationThreatened || rangedEnemies(scenario!, enemy.id).some((candidate) => candidate.side === "player") ? null : dropDownOptions(scenario!, enemy.id)
        .filter(withinDefensiveArea)
        .filter((destination) => distanceBetween(destination, target.position) < distanceBetween(enemy.position, target.position))
        .sort((a, b) => distanceBetween(a, target.position) - distanceBetween(b, target.position))[0];
      if (enemyDrop) {
        const origin = enemy.position;
        enemy.position = enemyDrop;
        enemy.facing = enemyDrop.x > origin.x ? "east" : enemyDrop.x < origin.x ? "west" : enemyDrop.y > origin.y ? "south" : "north";
        const footingDice = action.payload.enemyRolls[enemy.id]?.hitDice;
        const footingTotal = footingDice ? footingDice.first + footingDice.second : 7;
        state.actionPointsById[enemy.id] = 3;
        state.events.unshift(`${enemy.name} dropped down to ${enemyDrop.x},${enemyDrop.y} (3 AP)`);
        if (footingTotal < 7) {
          enemy.posture = "prone";
          state.actionPointsById[enemy.id] = 0;
          state.events.unshift(`${enemy.name} failed drop footing ${footingTotal}/7: prone, activation ended`);
        } else state.events.unshift(`${enemy.name} passed drop footing ${footingTotal}/7`);
        continue;
      }
      const enemyVault = defensiveDive || stationThreatened || rangedEnemies(scenario!, enemy.id).some((candidate) => candidate.side === "player") ? null : vaultOptions(scenario!, enemy.id)
        .filter(({ landing }) => withinDefensiveArea(landing))
        .filter(({ landing }) => distanceBetween(landing, target.position) < distanceBetween(enemy.position, target.position))
        .sort((a, b) => distanceBetween(a.landing, target.position) - distanceBetween(b.landing, target.position))[0];
      if (enemyVault) {
        const dx = enemyVault.landing.x - enemy.position.x;
        const dy = enemyVault.landing.y - enemy.position.y;
        enemy.position = enemyVault.landing;
        enemy.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
        state.actionPointsById[enemy.id] = 3;
        state.events.unshift(`${enemy.name} vaulted ${enemyVault.barrier.label} to ${enemyVault.landing.x},${enemyVault.landing.y} (3 AP)`);
        continue;
      }
      let attackTarget: CombatScenario["combatants"][number] | undefined = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => compareEnemyRangedTargets(scenario!, enemy, a, b, state.evadingCombatantIds))[0];
      if (!attackTarget) {
        const visibleTarget = scenario!.combatants
          .filter((candidate) => candidate.side === "player" && !candidate.defeated && snapShotTarget(enemy, candidate) && visibilityAssessment(scenario!, enemy, candidate).visible)
          .sort((a, b) => compareEnemyRangedTargets(scenario!, enemy, a, b, state.evadingCombatantIds))[0];
        const turn = visibleTarget ? facingTowardFieldOfFire(enemy, visibleTarget.position) : null;
        if (visibleTarget && turn && turn.turns > 0 && (state.actionPointsById[enemy.id] ?? 0) >= turn.turns + 3) {
          const priorFacing = enemy.facing;
          enemy.facing = turn.facing;
          state.actionPointsById[enemy.id] -= turn.turns;
          state.events.unshift(`${enemy.name} turned from ${priorFacing} to ${turn.facing} (${turn.turns} AP)`);
          attackTarget = rangedEnemies(scenario!, enemy.id).find((candidate) => candidate.id === visibleTarget.id);
        }
      }
      if (attackTarget) delete state.investigationTargetByEnemyId?.[enemy.id];
      const investigationTarget = !attackTarget ? state.investigationTargetByEnemyId?.[enemy.id] : null;
      if (investigationTarget && defendedObjective) {
        delete state.investigationTargetByEnemyId?.[enemy.id];
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} held defensive assignment at ${defendedObjective.label}`);
        continue;
      }
      if (investigationTarget) {
        const investigationGoals = [investigationTarget, { x: investigationTarget.x + 1, y: investigationTarget.y }, { x: investigationTarget.x - 1, y: investigationTarget.y }, { x: investigationTarget.x, y: investigationTarget.y + 1 }, { x: investigationTarget.x, y: investigationTarget.y - 1 }].filter((point) => point.x >= 0 && point.y >= 0 && point.x < scenario!.width && point.y < scenario!.height);
        const route = shortestPathToAny(fireSafeScenario, enemy.id, investigationGoals) ?? shortestPathToAny(scenario!, enemy.id, investigationGoals);
        if (route?.length) {
          const origin = { ...enemy.position };
          const steps = pathWithinMovementAllowance(scenario!, origin, route, state.mobilityImpairedCombatantIds?.includes(enemy.id) ? 1 : 3, enemy.facing);
          if (steps.length === 0) continue;
          const destination = steps.at(-1)!;
          const prior = steps.length > 1 ? steps[steps.length - 2] : enemy.position;
          enemy.position = destination;
          enemy.facing = destination.x > prior.x ? "east" : destination.x < prior.x ? "west" : destination.y > prior.y ? "south" : "north";
          state.actionPointsById[enemy.id] = 6 - movementPathCost(scenario!, origin, steps, enemy.facing);
          state.events.unshift(`${enemy.name} investigated sound sector ${investigationTarget.x},${investigationTarget.y}`);
          if (distanceBetween(destination, investigationTarget) <= 1) {
            delete state.investigationTargetByEnemyId?.[enemy.id];
            state.events.unshift(`${enemy.name} reached the sound sector without finding a target`);
          }
          continue;
        }
        const doorRoute = routeAllowingClosedDoors(fireSafeScenario, enemy.id, investigationGoals) ?? routeAllowingClosedDoors(scenario!, enemy.id, investigationGoals);
          if (doorRoute?.door && doorRoute.doorStepIndex === 0 && !state.placedBreachingChargeByDoorId[doorRoute.door.id] && !openingDoorWouldExpose(scenario!, doorRoute.door.id, enemy.id)) {
          if (avoidedDoorIds.size > 0 && !avoidedDoorIds.has(doorRoute.door.id)) state.events.unshift(`${enemy.name} avoided visibly covered ${[...avoidedDoorIds].join(", ")} and investigated via ${doorRoute.door.id}`);
          if (enemyBreachCoveredDoor(state, doorRoute.door, enemy, action.payload.enemyRolls[enemy.id])) { state.actionPointsById[enemy.id] = 0; continue; }
          addSoundContact(state, enemy, "door");
          openDoorAndApplyDecompression(state, doorRoute.door);
          state.actionPointsById[enemy.id] = 0;
          state.events.unshift(`${enemy.name} opened ${doorRoute.door.id} while investigating`);
          if (triggerCoveredDoor(state, doorRoute.door.id, enemy, action.payload.enemyRolls[enemy.id])) { resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id); }
          continue;
        }
        delete state.investigationTargetByEnemyId?.[enemy.id];
        state.events.unshift(`${enemy.name} could not reach the sound sector`);
      }
      if (!attackTarget && enemy.hasLamp && !enemy.lampOn) {
        addSoundContact(state, enemy, "equipment");
        enemy.lampOn = true;
        enemy.concealed = false;
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} switched lamp on after finding no visible target`);
        continue;
      }
      const attackProfile = attackTarget ? snapShotTarget(enemy, attackTarget) : null;
      const approachGoals = attackTarget ? [
        { x: attackTarget.position.x + 1, y: attackTarget.position.y },
        { x: attackTarget.position.x, y: attackTarget.position.y + 1 },
        { x: attackTarget.position.x - 1, y: attackTarget.position.y },
        { x: attackTarget.position.x, y: attackTarget.position.y - 1 },
      ] : [];
      const openApproach = !defendedObjective && attackTarget && scenario!.victoryCondition !== "hold-zone" && attackProfile && shouldImproveEnemyRange(enemy, attackProfile.rangeBand)
        ? shortestPathToAny(fireSafeScenario, enemy.id, approachGoals) ?? shortestPathToAny(scenario!, enemy.id, approachGoals) : null;
      const doorApproach = !defendedObjective && !openApproach && attackTarget && scenario!.victoryCondition !== "hold-zone" && attackProfile && shouldImproveEnemyRange(enemy, attackProfile.rangeBand)
        ? routeAllowingClosedDoors(fireSafeScenario, enemy.id, approachGoals) ?? routeAllowingClosedDoors(scenario!, enemy.id, approachGoals) : null;
      const improvingRange = Boolean(openApproach?.length || doorApproach?.door);
      if (attackTarget && !improvingRange && !defensiveDive) {
        const ammunition = state.ammunitionById[enemy.id] ?? 0;
        if (ammunition === 0) {
          state.ammunitionById[enemy.id] = magazineSize(scenario!, enemy.id);
          state.actionPointsById[enemy.id] -= 3;
          state.events.unshift(`${enemy.name} reloaded (3 AP)`);
          continue;
        }
        if (attackProfile?.rangeBand === "extreme") {
          const cells = fireLaneCells(scenario!, enemy.position, attackTarget.position);
          if (cells.length > 0) {
            state.overwatchLanes = [...state.overwatchLanes.filter((lane) => lane.attackerId !== enemy.id), { attackerId: enemy.id, target: attackTarget.position, cells }];
            state.actionPointsById[enemy.id] = 0;
            state.events.unshift(`${enemy.name} established overwatch toward ${attackTarget.position.x},${attackTarget.position.y}`);
            continue;
          }
        }
        const dice = action.payload.enemyRolls[enemy.id];
        if (!dice) continue;
        const suppressionTarget = enemy.weapon.automatic && ammunition >= 3 ? rangedEnemies(scenario!, enemy.id)
          .filter((candidate) => candidate.side === "player" && !state.suppressedCombatantIds.includes(candidate.id))
          .map((candidate) => ({ candidate, cover: coverProtection(scenario!, enemy.id, candidate.id) }))
          .filter(({ candidate, cover }) => candidate.armor >= 3 || cover > 0)
          .sort((a, b) => b.cover + b.candidate.armor - (a.cover + a.candidate.armor) || compareEnemyRangedTargets(scenario!, enemy, a.candidate, b.candidate, state.evadingCombatantIds))[0] : null;
        if (suppressionTarget) {
          const result = resolveSnapShot(enemy, suppressionTarget.candidate, dice.hitDice, dice.woundDice, suppressionTarget.cover, "suppressive", state.evadingCombatantIds.includes(suppressionTarget.candidate.id), state.suppressedCombatantIds.includes(enemy.id) || enemyShaken, false, visibilityAssessment(scenario!, enemy, suppressionTarget.candidate).modifier, false, false, (state.weaponDamagedCombatantIds?.includes(enemy.id) ? -1 : 0) + elevationAttackModifier(scenario!, enemy, suppressionTarget.candidate));
          if (!result) continue;
          const suppressionThreshold = result.targetNumber + result.cover;
          const suppressed = result.hitTotal >= suppressionThreshold;
          if (suppressed) state.suppressedCombatantIds.push(suppressionTarget.candidate.id);
          state.ammunitionById[enemy.id] -= 3;
          state.actionPointsById[enemy.id] = 0;
          addSoundContact(state, enemy, "weapon");
          enemy.concealed = false;
          state.events.unshift(`${enemy.name} suppressive fired at ${suppressionTarget.candidate.name}: ${result.hitTotal}/${suppressionThreshold}${result.cover ? ` including cover +${result.cover}` : ""} · ${suppressed ? "suppressed" : "held position"}${highGroundNote(scenario!, enemy, suppressionTarget.candidate)}`);
          applyZeroGravityRecoil(state, enemy.id);
          continue;
        }
        const enemyAutomaticModifier = attackProfile ? automaticFireModifierForRange(attackProfile.rangeBand, enemy.weapon.automaticFireBonusByRange) : null;
        const enemyFireMode: FireMode = enemy.weapon.automatic && ammunition >= 3 && enemyAutomaticModifier !== null ? "automatic" : "aimed";
        const result = resolveSnapShot(enemy, attackTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, attackTarget.id), enemyFireMode, state.evadingCombatantIds.includes(attackTarget.id), state.suppressedCombatantIds.includes(enemy.id) || enemyShaken, false, visibilityAssessment(scenario!, enemy, attackTarget).modifier, false, false, (state.weaponDamagedCombatantIds?.includes(enemy.id) ? -1 : 0) + elevationAttackModifier(scenario!, enemy, attackTarget));
        if (!result) continue;
        if (enemyFireMode === "automatic") {
          const dangerTargets = [attackTarget, ...automaticFireSecondaryTargets(scenario!, enemy.id, attackTarget.id)]
            .sort((a, b) => distanceInSquares(enemy, a) - distanceInSquares(enemy, b) || scenario!.combatants.indexOf(a) - scenario!.combatants.indexOf(b));
          let hits = 0;
          for (const [dangerIndex, dangerTarget] of dangerTargets.entries()) {
            const targetDice = dangerTarget.id === attackTarget.id ? dice : action.payload.dangerSpaceRolls?.[enemy.id]?.[dangerTarget.id] ?? dice;
            const dangerResult = dangerTarget.id === attackTarget.id ? result : resolveSnapShot(enemy, dangerTarget, targetDice.hitDice, targetDice.woundDice, coverProtection(scenario!, enemy.id, dangerTarget.id), "automatic", state.evadingCombatantIds.includes(dangerTarget.id), state.suppressedCombatantIds.includes(enemy.id) || enemyShaken, false, visibilityAssessment(scenario!, enemy, dangerTarget).modifier, false, false, (state.weaponDamagedCombatantIds?.includes(enemy.id) ? -1 : 0) + elevationAttackModifier(scenario!, enemy, dangerTarget));
            if (!dangerResult) continue;
            if (dangerResult.hit) {
              hits += 1;
              applyCombatWound(state, dangerTarget, dangerResult.woundState);
              if (dangerTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, maintainedTargetId]) => { if (maintainedTargetId === dangerTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
            } else if (dangerResult.targetNumber - dangerResult.hitTotal <= 2 && !state.suppressedCombatantIds.includes(dangerTarget.id)) state.suppressedCombatantIds.push(dangerTarget.id);
            state.events.unshift(`${enemy.name} automatic danger-space attack against ${dangerTarget.name}: hit ${dangerResult.hitTotal}/${dangerResult.targetNumber} · ${dangerResult.hit ? `wound ${dangerResult.woundTotal} (${dangerResult.woundState})` : "miss"}`);
            const nextTarget = dangerTargets[dangerIndex + 1];
            if (hits >= 2 && (!nextTarget || pointKey(nextTarget.position) !== pointKey(dangerTarget.position))) break;
          }
          state.ammunitionById[enemy.id] -= 3;
          state.actionPointsById[enemy.id] = 0;
          addSoundContact(state, enemy, "weapon");
          enemy.concealed = false;
          applyZeroGravityRecoil(state, enemy.id);
          if (resolveRescueFailure(state)) return;
          continue;
        }
        if (!result.hit && result.targetNumber - result.hitTotal <= 2 && !state.suppressedCombatantIds.includes(attackTarget.id)) state.suppressedCombatantIds.push(attackTarget.id);
        if (result.hit) applyCombatWound(state, attackTarget, result.woundState);
        if (attackTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === attackTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
        state.ammunitionById[enemy.id] -= 1;
        state.actionPointsById[enemy.id] = 0;
        addSoundContact(state, enemy, "weapon");
        enemy.concealed = false;
        state.events.unshift(`${enemy.name} ${enemyFireMode} fired at ${attackTarget.name} through ${result.attackArc} arc (+${result.arcModifier}): hit ${result.hitTotal}/${result.targetNumber} (weapon accuracy ${result.weaponAccuracy >= 0 ? "+" : ""}${result.weaponAccuracy}), ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, penetration +${result.weaponPenetration}${result.cover ? `, AHL cover wound +${result.cover}` : ""})` : result.cover ? "miss (target under cover; no numerical hit modifier)" : "miss"}${highGroundNote(scenario!, enemy, attackTarget)}`);
        applyZeroGravityRecoil(state, enemy.id);
        if (resolveRescueFailure(state)) return;
        continue;
      }
      const alreadyContestingStation = defendedObjective ? distanceBetween(enemy.position, defendedObjective.position) === 1 : false;
      if (defendedObjective && (!stationThreatened || alreadyContestingStation)) {
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} held defensive assignment at ${defendedObjective.label}`);
        continue;
      }
      const enemyTrotting = !attackTarget
        && scenario!.gravityMode !== "zero-g"
        && enemy.posture !== "prone"
        && !enemyShaken
        && !state.suppressedCombatantIds.includes(enemy.id)
        && !state.mobilityImpairedCombatantIds?.includes(enemy.id)
        && !defendedObjective
        && scenario!.victoryCondition !== "hold-zone"
        && !scenario!.flankBiasByCombatantId?.[enemy.id]
        && !defensiveDive
        && distanceBetween(enemy.position, target.position) > 4;
      let path: GridPoint[];
      const enemyDiving = Boolean(defensiveDive);
      let enemyCrawling = false;
      let enemyCrawlCost = 0;
      if (defensiveDive) path = defensiveDive.path;
      else if (enemy.posture === "prone" && scenario!.gravityMode !== "zero-g") {
        const crawlGoal = defendedObjective && stationThreatened ? defendedObjective.position : target.position;
        const crawl = [...reachableCrawling(fireSafeScenario, enemy.id, 6).values()]
          .filter((move) => withinDefensiveArea(move.destination))
          .filter((move) => distanceBetween(move.destination, crawlGoal) < distanceBetween(enemy.position, crawlGoal))
          .sort((a, b) => distanceBetween(a.destination, crawlGoal) - distanceBetween(b.destination, crawlGoal) || a.cost - b.cost || pointKey(a.destination).localeCompare(pointKey(b.destination)))[0];
        if (!crawl) {
          enemy.posture = "standing";
          state.actionPointsById[enemy.id] = 4;
          state.events.unshift(`${enemy.name} stood up (2 AP)`);
          continue;
        }
        path = crawl.path;
        enemyCrawling = true;
        enemyCrawlCost = crawl.cost;
      }
      else if (scenario!.gravityMode === "zero-g") {
        const adjacentDoor = closedDoorsAdjacentTo(scenario!, enemy.id)[0];
        if (adjacentDoor) {
          if (state.placedBreachingChargeByDoorId[adjacentDoor.id]) state.events.unshift(`${enemy.name} stopped at armed ${adjacentDoor.id}`);
          else if (openingDoorWouldExpose(scenario!, adjacentDoor.id, enemy.id)) state.events.unshift(`${enemy.name} refused to open ${adjacentDoor.id} into vacuum`);
          else if (enemyBreachCoveredDoor(state, adjacentDoor, enemy, action.payload.enemyRolls[enemy.id])) state.events.unshift(`${enemy.name} completed forced entry (6 AP)`);
          else { addSoundContact(state, enemy, "door"); openDoorAndApplyDecompression(state, adjacentDoor); state.events.unshift(`${enemy.name} opened ${adjacentDoor.id} (6 AP)`); if (triggerCoveredDoor(state, adjacentDoor.id, enemy, action.payload.enemyRolls[enemy.id])) resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id); }
          state.actionPointsById[enemy.id] = 0;
          continue;
        }
        const allPushes = [...zeroGravityPushes(scenario!, enemy.id).values()];
        const safePushes = allPushes.filter((move) => !move.path.some((step) => scenario!.fireCells?.some((fire) => pointKey(fire) === pointKey(step))));
        const pushes = (safePushes.length > 0 ? safePushes : allPushes).sort((a, b) => {
          const score = (move: typeof a) => distanceBetween(move.destination, target.position) + (snapShotTarget({ ...enemy, position: move.destination }, target) ? -10 : 0);
          return score(a) - score(b) || pointKey(a.destination).localeCompare(pointKey(b.destination));
        });
        if (pushes.length === 0) continue;
        path = pushes[0].path;
      } else {
        const control = scenario!.victoryCondition === "hold-zone" ? scenario!.objects.find((object) => object.kind === "control") : null;
        const defensiveContestGoals = defendedObjective && stationThreatened ? [
          { x: defendedObjective.position.x + 1, y: defendedObjective.position.y },
          { x: defendedObjective.position.x, y: defendedObjective.position.y + 1 },
          { x: defendedObjective.position.x - 1, y: defendedObjective.position.y },
          { x: defendedObjective.position.x, y: defendedObjective.position.y - 1 },
        ].filter((point) => point.x >= 0 && point.y >= 0 && point.x < scenario!.width && point.y < scenario!.height) : null;
        const standardMovementGoals = [
          { x: target.position.x + 1, y: target.position.y },
          { x: target.position.x, y: target.position.y + 1 },
          { x: target.position.x - 1, y: target.position.y },
          { x: target.position.x, y: target.position.y - 1 },
        ];
        const flankBias = scenario!.flankBiasByCombatantId?.[enemy.id];
        const targetForward = target.facing === "north" ? { x: 0, y: -1 } : target.facing === "east" ? { x: 1, y: 0 } : target.facing === "south" ? { x: 0, y: 1 } : { x: -1, y: 0 };
        const flankOffset = flankBias === "left"
          ? { x: targetForward.y, y: -targetForward.x }
          : flankBias === "right" ? { x: -targetForward.y, y: targetForward.x } : null;
        const flankGoal = flankOffset ? { x: target.position.x + flankOffset.x, y: target.position.y + flankOffset.y } : null;
        const validFlankGoal = flankGoal && flankGoal.x >= 0 && flankGoal.y >= 0 && flankGoal.x < scenario!.width && flankGoal.y < scenario!.height ? flankGoal : null;
        const movementGoals = control ? [control.position] : defensiveContestGoals ?? (validFlankGoal ? [validFlankGoal] : standardMovementGoals);
        let route = shortestPathToAny(fireSafeScenario, enemy.id, movementGoals) ?? shortestPathToAny(scenario!, enemy.id, movementGoals);
        if (!route && validFlankGoal) route = shortestPathToAny(fireSafeScenario, enemy.id, standardMovementGoals) ?? shortestPathToAny(scenario!, enemy.id, standardMovementGoals);
        if (!route) {
          const doorGoals = validFlankGoal ? [validFlankGoal, ...standardMovementGoals] : movementGoals;
          const doorRoute = routeAllowingClosedDoors(fireSafeScenario, enemy.id, doorGoals) ?? routeAllowingClosedDoors(scenario!, enemy.id, doorGoals);
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
            if (avoidedDoorIds.size > 0 && !avoidedDoorIds.has(doorRoute.door.id)) state.events.unshift(`${enemy.name} avoided visibly covered ${[...avoidedDoorIds].join(", ")} and routed via ${doorRoute.door.id}`);
            if (enemyBreachCoveredDoor(state, doorRoute.door, enemy, action.payload.enemyRolls[enemy.id])) { state.actionPointsById[enemy.id] = 0; continue; }
            addSoundContact(state, enemy, "door");
            openDoorAndApplyDecompression(state, doorRoute.door);
            state.actionPointsById[enemy.id] = 0;
            state.events.unshift(`${enemy.name} opened ${doorRoute.door.id} (6 AP)`);
            if (triggerCoveredDoor(state, doorRoute.door.id, enemy, action.payload.enemyRolls[enemy.id])) resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id);
            continue;
          }
          route = doorRoute.path.slice(0, doorRoute.doorStepIndex);
        }
        if (route.length === 0) continue;
        path = pathWithinMovementAllowance(scenario!, enemy.position, route, enemyTrotting ? 6 : state.mobilityImpairedCombatantIds?.includes(enemy.id) ? 1 : state.suppressedCombatantIds.includes(enemy.id) ? 2 : 3, enemy.facing, enemyTrotting);
        if (path.length === 0) continue;
      }
      const adjacencyOpportunity = scenario!.combatants
        .filter((reactor) => reactor.side === "player" && !reactor.defeated && !reactor.weapon.highEnergy && !state.movedCombatantIds?.includes(reactor.id) && !state.adjacencyReactionUsedCombatantIds?.includes(`${reactor.id}:${enemy.id}`) && !state.suppressedCombatantIds.includes(reactor.id) && (state.adjacencyReactionReserveById?.[reactor.id] ?? 0) >= 3 && (state.ammunitionById[reactor.id] ?? 0) >= 1)
        .map((reactor) => ({ reactor, stepIndex: adjacencyEntryStepIndex(scenario!, reactor.position, enemy.position, path) }))
        .filter(({ stepIndex }) => stepIndex >= 0)
        .sort((a, b) => a.stepIndex - b.stepIndex || scenario!.combatants.indexOf(a.reactor) - scenario!.combatants.indexOf(b.reactor))[0];
      if (adjacencyOpportunity) {
        state.pendingAdjacencyReaction = { reactorId: adjacencyOpportunity.reactor.id, moverId: enemy.id, trigger: { ...path[adjacencyOpportunity.stepIndex] } };
        state.events.unshift(`${adjacencyOpportunity.reactor.name} may take an adjacency snap shot as ${enemy.name} approaches`);
        return;
      }
      const crossedLane = state.coveringFireLanes.find((lane) => path.some((step) => lane.cells.some((cell) => pointKey(cell) === pointKey(step))));
      if (crossedLane) {
        const coveringAttacker = scenario!.combatants.find((unit) => unit.id === crossedLane.attackerId && !unit.defeated);
        const dice = action.payload.enemyRolls[enemy.id];
        state.coveringFireLanes = state.coveringFireLanes.filter((lane) => lane !== crossedLane);
        if (coveringAttacker && dice && (state.ammunitionById[coveringAttacker.id] ?? 0) >= 3) {
          state.ammunitionById[coveringAttacker.id] -= 3;
          const reaction = resolveSnapShot(coveringAttacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, coveringAttacker.id, enemy.id), "covering", state.evadingCombatantIds.includes(enemy.id) || enemyDiving, false, state.bracedCombatantIds.includes(coveringAttacker.id), visibilityAssessment(scenario!, coveringAttacker, enemy).modifier, state.weaponReadyCombatantIds?.includes(coveringAttacker.id), false, elevationAttackModifier(scenario!, coveringAttacker, enemy));
          if (reaction) clearWeaponReady(state, coveringAttacker.id);
          if (reaction) {
            if (!state.suppressedCombatantIds.includes(enemy.id)) state.suppressedCombatantIds.push(enemy.id);
            if (reaction.hit) applyCombatWound(state, enemy, reaction.woundState);
            state.events.unshift(`${coveringAttacker.name} covering fired as ${enemy.name} crossed the lane: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}${highGroundNote(scenario!, coveringAttacker, enemy)}`);
            applyZeroGravityRecoil(state, coveringAttacker.id);
            if (enemy.defeated) {
              state.events.unshift(`${enemy.name} movement interrupted`);
              resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id);
              if (scenario!.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)) return;
              continue;
            }
          }
        }
      }
      const overwatchCrossing = state.overwatchLanes
        .map((lane) => ({ lane, stepIndex: path.findIndex((step) => lane.cells.some((cell) => pointKey(cell) === pointKey(step))) }))
        .filter((crossing) => crossing.stepIndex >= 0)
        .sort((a, b) => a.stepIndex - b.stepIndex)[0];
      if (overwatchCrossing) {
        const overwatcher = scenario!.combatants.find((unit) => unit.id === overwatchCrossing.lane.attackerId && !unit.defeated);
        const trigger = path[overwatchCrossing.stepIndex];
        const prior = overwatchCrossing.stepIndex > 0 ? path[overwatchCrossing.stepIndex - 1] : enemy.position;
        const originalPosition = enemy.position;
        enemy.position = trigger;
        enemy.facing = trigger.x > prior.x ? "east" : trigger.x < prior.x ? "west" : trigger.y > prior.y ? "south" : "north";
        const canReact = overwatcher && (state.ammunitionById[overwatcher.id] ?? 0) >= 1 && rangedEnemies(scenario!, overwatcher.id).some((target) => target.id === enemy.id);
        if (overwatcher && canReact) {
          const dice = action.payload.enemyRolls[enemy.id];
          state.overwatchLanes = state.overwatchLanes.filter((lane) => lane !== overwatchCrossing.lane);
          delete state.coveredDoorByCombatantId?.[overwatchCrossing.lane.attackerId];
          if (dice) {
            state.ammunitionById[overwatcher.id] -= 1;
            const reaction = resolveSnapShot(overwatcher, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, overwatcher.id, enemy.id), "snap", state.evadingCombatantIds.includes(enemy.id) || enemyDiving, false, state.bracedCombatantIds.includes(overwatcher.id), visibilityAssessment(scenario!, overwatcher, enemy).modifier, state.weaponReadyCombatantIds?.includes(overwatcher.id), false, elevationAttackModifier(scenario!, overwatcher, enemy));
            if (reaction) clearWeaponReady(state, overwatcher.id);
            if (reaction) {
              if (!reaction.hit && reaction.targetNumber - reaction.hitTotal <= 2 && !state.suppressedCombatantIds.includes(enemy.id)) state.suppressedCombatantIds.push(enemy.id);
              if (reaction.hit) applyCombatWound(state, enemy, reaction.woundState);
              state.events.unshift(`${overwatcher.name} overwatch triggered as ${enemy.name} entered ${trigger.x},${trigger.y}: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}${highGroundNote(scenario!, overwatcher, enemy)}`);
              applyZeroGravityRecoil(state, overwatcher.id);
              if (enemy.defeated) {
                state.events.unshift(`${enemy.name} movement stopped by overwatch`);
                resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id);
                if (scenario!.combatants.filter((unit) => unit.side === "enemy").every((unit) => unit.defeated)) return;
                continue;
              }
            }
          }
        } else enemy.position = originalPosition;
      }
      const move = { destination: path[path.length - 1], path, cost: enemyCrawling ? enemyCrawlCost : enemyDiving || scenario!.gravityMode === "zero-g" ? 3 : movementPathCost(scenario!, enemy.position, path, enemy.facing, enemyTrotting) };
      const before = move.path.length > 1 ? move.path[move.path.length - 2] : enemy.position;
      const dx = move.destination.x - before.x;
      const dy = move.destination.y - before.y;
      const enemyMoveOrigin = { ...enemy.position };
      if (!enemyDiving && !enemyCrawling && scenario!.gravityMode !== "zero-g") queueMovementAnimation(state, enemy.id, enemyMoveOrigin, move.path, enemyTrotting ? "run" : "walk");
      enemy.position = move.destination;
      state.movedCombatantIds ??= [];
      if (!state.movedCombatantIds.includes(enemy.id)) state.movedCombatantIds.push(enemy.id);
      enemy.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
      if (enemyDiving) enemy.posture = "prone";
      state.actionPointsById[enemy.id] = enemyTrotting ? 0 : 6 - move.cost;
      addSoundContact(state, enemy, "movement");
      const flankBias = scenario!.flankBiasByCombatantId?.[enemy.id];
      state.events.unshift(enemyDiving
        ? `${enemy.name} dove to cover at ${move.destination.x},${move.destination.y} and went prone (3 AP)`
        : enemyCrawling
        ? `${enemy.name} crawled to ${move.destination.x},${move.destination.y} (${move.cost} AP)`
        : enemyTrotting
        ? `${enemy.name} trotted to ${move.destination.x},${move.destination.y} and ended activation (${move.cost} movement points)`
        : defendedObjective && stationThreatened
        ? `${enemy.name} moved to contest ${defendedObjective.label} at ${move.destination.x},${move.destination.y} (${move.cost} AP)`
        : flankBias
        ? `${enemy.name} advanced on the ${flankBias} flank to ${move.destination.x},${move.destination.y} (${move.cost} AP)`
        : `${enemy.name} moved to ${move.destination.x},${move.destination.y} (${move.cost} AP)`);
      const hazardDice = action.payload.enemyRolls[enemy.id]?.hitDice;
      if (entersHazardousTerrain(scenario!, move.path) && hazardDice) {
        const footingTotal = hazardDice.first + hazardDice.second;
        if (footingTotal < 7) {
          enemy.posture = "prone";
          state.actionPointsById[enemy.id] = 0;
          state.events.unshift(`${enemy.name} failed hazardous footing ${footingTotal}/7: prone, activation ended`);
        } else state.events.unshift(`${enemy.name} passed hazardous footing ${footingTotal}/7`);
      }
      if (scenario!.fireCells?.some((fire) => pointKey(fire) === pointKey(enemy.position))) {
        applyFireDamage(state, enemy);
        if (enemy.defeated) { resolveEnemyMorale(state, action.payload.moraleRolls, enemy.id); continue; }
      }
      if (resolveHoldZoneCapture(state)) return;
      const snapTarget = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => compareEnemyRangedTargets(scenario!, enemy, a, b, state.evadingCombatantIds))[0];
      const dice = action.payload.enemyRolls[enemy.id];
      if (!snapTarget || !dice || state.actionPointsById[enemy.id] < 3 || (state.ammunitionById[enemy.id] ?? 0) < 1) {
        if ((state.ammunitionById[enemy.id] ?? 0) === 0 && state.actionPointsById[enemy.id] >= 3) {
          state.ammunitionById[enemy.id] = magazineSize(scenario!, enemy.id);
          state.actionPointsById[enemy.id] -= 3;
          state.events.unshift(`${enemy.name} reloaded (3 AP)`);
        }
        continue;
      }
      const result = resolveSnapShot(enemy, snapTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, snapTarget.id), "snap", state.evadingCombatantIds.includes(snapTarget.id), state.suppressedCombatantIds.includes(enemy.id) || enemyShaken, false, visibilityAssessment(scenario!, enemy, snapTarget).modifier, false, false, (state.weaponDamagedCombatantIds?.includes(enemy.id) ? -1 : 0) + elevationAttackModifier(scenario!, enemy, snapTarget));
      if (!result) continue;
      if (!result.hit && result.targetNumber - result.hitTotal <= 2 && !state.suppressedCombatantIds.includes(snapTarget.id)) state.suppressedCombatantIds.push(snapTarget.id);
      if (result.hit) applyCombatWound(state, snapTarget, result.woundState);
      if (snapTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === snapTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
      state.ammunitionById[enemy.id] -= 1;
      state.actionPointsById[enemy.id] -= 3;
      state.events.unshift(`${enemy.name} snap fired at ${snapTarget.name} through ${result.attackArc} arc (+${result.arcModifier}): hit ${result.hitTotal}/${result.targetNumber} (weapon accuracy ${result.weaponAccuracy >= 0 ? "+" : ""}${result.weaponAccuracy}), ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, penetration +${result.weaponPenetration}${result.cover ? `, AHL cover wound +${result.cover}` : ""})` : result.cover ? "miss (target under cover; no numerical hit modifier)" : "miss"}${highGroundNote(scenario!, enemy, snapTarget)}`);
      applyZeroGravityRecoil(state, enemy.id);
      if (resolveRescueFailure(state)) return;
    }
    resolveQueuedAhlMelee(state, action.payload.moraleRolls);
    if (state.status !== "active" || resolveRescueFailure(state)) return;
    const vacuum = depressurizedCells(scenario!);
    scenario!.combatants.filter((unit) => unit.woundState !== "dead" && !unit.surrendered).forEach((unit) => {
      if (unit.vaccSuit || !vacuum.has(pointKey(unit.position))) { delete state.vacuumExposureByCombatantId[unit.id]; return; }
      const exposure = (state.vacuumExposureByCombatantId[unit.id] ?? 0) + 1;
      state.vacuumExposureByCombatantId[unit.id] = exposure;
      applyCombatWound(state, unit, exposure === 1 ? "light" : exposure === 2 ? "serious" : "dead");
      state.events.unshift(`${unit.name} vacuum exposure ${exposure}: ${unit.woundState}`);
    });
    const fireCells = new Set((scenario!.fireCells ?? []).map(pointKey));
    scenario!.combatants.filter((unit) => !unit.defeated && !unit.surrendered && fireCells.has(pointKey(unit.position))).forEach((unit) => applyFireDamage(state, unit));
    if (resolveCaptureOutcome(state)) return;
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
    Object.entries(state.ahlMeleeStunUntilTurnById ?? {}).forEach(([id, expires]) => {
      if (expires > state.turn) return;
      const unit = scenario!.combatants.find((candidate) => candidate.id === id);
      if (unit?.woundState === "light" && (unit.seriousWounds ?? 0) === 0) unit.woundState = "healthy";
      delete state.ahlMeleeStunUntilTurnById![id];
    });
    state.recoveringCombatantIds.forEach((id) => {
      const patient = scenario!.combatants.find((unit) => unit.id === id && unit.woundState !== "dead");
      if (patient) { patient.defeated = false; patient.health = 1; state.events.unshift(`${patient.name} is active after treatment`); }
    });
    state.recoveringCombatantIds = [];
    state.evadingCombatantIds = [];
    state.processedEnemyPhaseCombatantIds = [];
    state.ahlMeleeEngagedCombatantIds = [];
    state.enemySquareEnteredCombatantIds = [];
    state.trottingCombatantIds = [];
    const nextTurn = state.turn + 1;
    state.playerNoiseContacts = (state.playerNoiseContacts ?? []).filter((contact) => contact.expiresAtTurn >= nextTurn);
    state.soundContacts = (state.soundContacts ?? []).filter((contact) => contact.expiresAtTurn > nextTurn);
    const clearingSmoke = new Set(Object.entries(state.smokeClearsAtTurnByCell).filter(([, clearTurn]) => clearTurn <= nextTurn).map(([key]) => key));
    scenario!.smokeCells = scenario!.smokeCells?.filter((cell) => !clearingSmoke.has(pointKey(cell)));
    clearingSmoke.forEach((key) => { delete state.smokeClearsAtTurnByCell[key]; });
    const clearingFlares = new Set(Object.entries(state.flareClearsAtTurnByCell ?? {}).filter(([, clearTurn]) => clearTurn <= nextTurn).map(([key]) => key));
    scenario!.flareCells = scenario!.flareCells?.filter((cell) => !clearingFlares.has(pointKey(cell)));
    clearingFlares.forEach((key) => { delete state.flareClearsAtTurnByCell?.[key]; });
    const spread = scenario!.fireSpreadSchedule?.find((event) => event.turn === nextTurn);
    if (spread) {
      const sourceBurning = scenario!.fireCells?.some((fire) => pointKey(fire) === pointKey(spread.source));
      if (sourceBurning) {
        if (!scenario!.fireCells?.some((fire) => pointKey(fire) === pointKey(spread.fire))) scenario!.fireCells = [...(scenario!.fireCells ?? []), { ...spread.fire }];
        if (!scenario!.smokeCells?.some((smoke) => pointKey(smoke) === pointKey(spread.smoke))) scenario!.smokeCells = [...(scenario!.smokeCells ?? []), { ...spread.smoke }];
        state.events.unshift(`Fire spread from ${spread.source.x},${spread.source.y} to ${spread.fire.x},${spread.fire.y}; smoke at ${spread.smoke.x},${spread.smoke.y}`);
      } else state.events.unshift(`Fire spread prevented: source ${spread.source.x},${spread.source.y} was extinguished`);
    }
    updateDamageControlObjective(scenario!, nextTurn);
    if (scenario!.id === "damage-control" && scenario!.criticalFireDeadlineTurn === nextTurn) {
      if (remainingCriticalFireCells(scenario!).length > 0) {
        state.turn = nextTurn;
        state.status = "defeat";
        state.selectedCombatantId = null;
        state.plannedMove = null;
        state.plannedAttackTargetId = null;
        state.plannedObjectiveId = null;
        state.events.unshift("Engineering cascade: critical fires were not contained by turn 7");
        finalizeOutcome(state);
        return;
      }
      state.events.unshift("Engineering cascade contained; restore the damage-control console");
    }
    state.turn += 1;
    activateReinforcements(state);
    state.coveringFireLanes = [];
    state.overwatchLanes.filter((lane) => scenario!.combatants.find((unit) => unit.id === lane.attackerId)?.side === "player").forEach((lane) => {
      const unit = scenario!.combatants.find((combatant) => combatant.id === lane.attackerId);
      if (unit) state.events.unshift(`${unit.name} overwatch expired`);
    });
    state.overwatchLanes = state.overwatchLanes.filter((lane) => scenario!.combatants.find((unit) => unit.id === lane.attackerId)?.side === "enemy");
    state.adjacencyReactionReserveById = {};
    state.adjacencyReactionUsedCombatantIds = [];
    state.movedCombatantIds = [];
    state.pendingAdjacencyReaction = null;
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
  cancelMovePreview: (state) => { state.plannedMove = null; state.diveTargeting = false; state.hoveredDestination = null; },
  setHoveredDestination: (state, action: PayloadAction<GridPoint | null>) => { state.hoveredDestination = action.payload; },
  updateHudLayout: (state, action: PayloadAction<{ id: CharacterCombatHudId; layout: CharacterCombatHudLayout }>) => { state.hudLayouts[action.payload.id] = action.payload.layout; },
  restoreHud: (state, action: PayloadAction<CharacterCombatHudId>) => { state.hudLayouts[action.payload].visible = true; },
  acknowledgeAhlMeleeResolution: (state) => { state.awaitingAhlMeleeAcknowledgement = false; state.lastResolvedAhlMeleeDeclarations = []; state.lastAhlMeleeResults = []; },
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
  setBoardingTeamIds: (state, action: PayloadAction<string[]>) => { state.selectedBoardingTeamIds = action.payload.slice(0, 5); },
  setArmoryLoadout: (state, action: PayloadAction<{ index: number; loadoutId: ArmoryLoadoutId }>) => {
    if (action.payload.index < 0 || action.payload.index > 4) return;
    const selections = state.extendedArmoryLoadoutIds ?? [...state.armoryLoadoutIds, "assault", "scout", "breacher"];
    if (["heavy", "plasma", "fusion", "action-ram", "lag"].includes(action.payload.loadoutId) && selections.some((loadout, index) => index !== action.payload.index && loadout === action.payload.loadoutId)) return;
    selections[action.payload.index] = action.payload.loadoutId;
    state.extendedArmoryLoadoutIds = selections;
    state.armoryLoadoutIds = [selections[0], selections[1]];
  },
} });
export const { loadCombatScenario, clearCombatScenario, selectPlayerCombatant, startTrot, beginDragging, releaseDraggedCombatant, previewMove, previewDropDown, confirmMove, turnCombatant, previewOpenDoor, confirmOpenDoor, cancelOpenDoor, openDoor, closeDoor, previewExtinguishFire, confirmExtinguishFire, cancelExtinguishFire, previewAttack, selectAttackMode, confirmAttack, cancelAttackPreview, fireHighEnergyAtStructure, beginCoveringFire, previewCoveringFire, confirmCoveringFire, cancelCoveringFire, beginOverwatch, previewOverwatch, confirmOverwatch, cancelOverwatch, beginGrenadeTargeting, beginSmokeGrenadeTargeting, beginStunGrenadeTargeting, previewGrenadeTarget, cancelGrenadeTargeting, confirmGrenade, previewTreatment, cancelTreatmentPreview, confirmTreatment, previewSecureObjective, confirmSecureObjective, cancelObjectivePreview, previewBreachDoor, confirmBreachDoor, previewBreachDetonation, detonateBreachCharge, cancelBreachDoor, reloadWeapon, selectWeaponAmmunition, evade, goProne, braceWeapon, standUp, rally, rallyAlly, restrainEnemy, finishActivation, endPlayerTurn, acknowledgeAhlMeleeResolution, cancelMovePreview, setHoveredDestination, updateHudLayout, restoreHud, resetHudLayouts, setViewMode, rotateCamera, rotateCameraBy, adjustCameraZoom, panCameraBy, resetCamera, focusCameraOnSelected, setBoardingTeamIds, setArmoryLoadout } = slice.actions;
export const toggleLamp = slice.actions.toggleLamp;
export const beginStructuralTargeting = slice.actions.beginStructuralTargeting;
export const previewStructuralTarget = slice.actions.previewStructuralTarget;
export const cancelStructuralTargeting = slice.actions.cancelStructuralTargeting;
export const beginFlareGrenadeTargeting = slice.actions.beginFlareGrenadeTargeting;
export const refreshEnemyObservations = slice.actions.refreshEnemyObservations;
export const searchForEnemies = slice.actions.searchForEnemies;
export const toggleCautiousMovement = slice.actions.toggleCautiousMovement;
export const toggleAdvanceReady = slice.actions.toggleAdvanceReady;
export const aimAtPlannedTarget = slice.actions.aimAtPlannedTarget;
export const selectCalledShot = slice.actions.selectCalledShot;
export const resolveAdjacencyReaction = slice.actions.resolveAdjacencyReaction;
export const previewMeleeAttack = slice.actions.previewMeleeAttack;
export const previewSubdue = slice.actions.previewSubdue;
export const previewAhlMeleeDive = slice.actions.previewAhlMeleeDive;
export const coverDoor = slice.actions.coverDoor;
export const cancelDoorCoverage = slice.actions.cancelDoorCoverage;
export const beginDoorCoverage = slice.actions.beginDoorCoverage;
export const previewDoorCoverage = slice.actions.previewDoorCoverage;
export const confirmDoorCoverage = slice.actions.confirmDoorCoverage;
export const cancelDoorCoverageTargeting = slice.actions.cancelDoorCoverageTargeting;
export const readyWeapon = slice.actions.readyWeapon;
export const vaultBarrier = slice.actions.vaultBarrier;
export const previewClimbUp = slice.actions.previewClimbUp;
export const beginDive = slice.actions.beginDive;
export const previewDive = slice.actions.previewDive;
export const cancelDive = slice.actions.cancelDive;
export const clearTarget = slice.actions.clearTarget;

export default slice.reducer;
