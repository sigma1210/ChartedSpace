import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CharacterCombatHudId, CharacterCombatHudLayout, CharacterCombatState, CharacterCombatViewMode, CombatScenario, FireMode, GridPoint } from "./types";
import { adjacentEnemies, adjacentObjectives, closedDoorsAdjacentTo, coverProtection, grenadeBlastCells, grenadeCoverProtection, pointKey, proposedMoveFor, rangedEnemies, reachableMovement, treatableAllies, validGrenadeTargets } from "./geometry";
import { resolveMelee, resolveSnapShot, woundStateForTotal, type DicePair } from "./combatResolution";

const distanceBetween = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

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
type MoraleRolls = Record<string, DicePair>;

const startingCombatants = (scenario: CombatScenario) => Object.fromEntries(scenario.combatants.filter((unit) => unit.side === "player").map((unit) => [unit.id, { id: unit.id, name: unit.name, sourceCrewId: unit.sourceCrewId, sourceCharacterId: unit.sourceCharacterId, woundState: unit.woundState, grenades: unit.grenades, medkits: unit.medkits }]));

const finalizeOutcome = (state: CharacterCombatState) => {
  const scenario = state.scenario;
  if (!scenario || state.status === "active") return;
  const enemies = scenario.combatants.filter((unit) => unit.side === "enemy");
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
  if (enemies.length > 0 && enemies.every((unit) => unit.defeated)) {
    state.status = "victory";
    state.selectedCombatantId = null;
    state.plannedMove = null;
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    state.events.unshift("All hostile crew neutralized or surrendered");
    finalizeOutcome(state);
  }
};

export const initialCharacterCombatState: CharacterCombatState = { scenario: null, selectedBoardingTeamIds: [], combatantStarts: {}, outcome: null, viewMode: "3d", camera: { quarterTurn: 0, zoom: 42, focus: null }, status: "active", turn: 1, selectedCombatantId: null, plannedMove: null, plannedAttackTargetId: null, plannedAttackMode: null, grenadeTargeting: false, plannedGrenadeTarget: null, plannedTreatmentTargetId: null, recoveringCombatantIds: [], maintainedTargetByCombatantId: {}, coveringFireByTargetId: {}, plannedObjectiveId: null, hoveredDestination: null, actionPointsById: {}, actedCombatantIds: [], events: [], hudLayouts: freshHudLayouts() };
const slice = createSlice({ name: "characterCombat", initialState: initialCharacterCombatState, reducers: {
  loadCombatScenario: (state, action: PayloadAction<CombatScenario>) => { state.scenario = action.payload; state.combatantStarts = startingCombatants(action.payload); state.outcome = null; state.camera.focus = null; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.maintainedTargetByCombatantId = {}; state.coveringFireByTargetId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = freshActionPoints(action.payload); state.actedCombatantIds = []; state.events = []; },
  clearCombatScenario: (state) => { state.scenario = null; state.combatantStarts = {}; state.outcome = null; state.status = "active"; state.turn = 1; state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedTreatmentTargetId = null; state.recoveringCombatantIds = []; state.maintainedTargetByCombatantId = {}; state.coveringFireByTargetId = {}; state.plannedObjectiveId = null; state.hoveredDestination = null; state.actionPointsById = {}; state.actedCombatantIds = []; state.events = []; },
  selectPlayerCombatant: (state, action: PayloadAction<string | null>) => {
    if (state.status !== "active") return;
    if (action.payload === null) { state.selectedCombatantId = null; state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedObjectiveId = null; state.hoveredDestination = null; return; }
    const combatant = state.scenario?.combatants.find((unit) => unit.id === action.payload);
    if (combatant?.side === "player" && !combatant.defeated) { const maintained = state.maintainedTargetByCombatantId[combatant.id]; state.selectedCombatantId = combatant.id; state.plannedMove = null; state.plannedAttackTargetId = maintained && state.scenario && rangedEnemies(state.scenario, combatant.id).some((target) => target.id === maintained) ? maintained : null; state.plannedAttackMode = null; state.plannedObjectiveId = null; state.hoveredDestination = null; }
  },
  previewMove: (state, action: PayloadAction<GridPoint>) => {
    if (state.status !== "active" || !state.scenario || !state.selectedCombatantId || state.actedCombatantIds.includes(state.selectedCombatantId)) return;
    state.plannedMove = proposedMoveFor(state.scenario, state.selectedCombatantId, action.payload, Math.min(4, state.actionPointsById[state.selectedCombatantId] ?? 0));
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
    unit.position = final;
    unit.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
    state.actionPointsById[unit.id] = Math.max(0, (state.actionPointsById[unit.id] ?? 0) - move.cost);
    if (state.actionPointsById[unit.id] === 0 && !state.actedCombatantIds.includes(unit.id)) state.actedCombatantIds.push(unit.id);
    state.events.unshift(`${unit.name} moved to ${final.x},${final.y}`);
    state.plannedMove = null;
    const maintained = state.maintainedTargetByCombatantId[unit.id];
    state.plannedAttackTargetId = maintained && rangedEnemies(scenario, unit.id).some((target) => target.id === maintained) ? maintained : null;
    state.hoveredDestination = null;
  },
  openDoor: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const combatantId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !combatantId || state.actedCombatantIds.includes(combatantId) || (state.actionPointsById[combatantId] ?? 0) < 6) return;
    const unit = scenario.combatants.find((combatant) => combatant.id === combatantId);
    const door = closedDoorsAdjacentTo(scenario, combatantId).find((candidate) => candidate.id === action.payload);
    if (!unit || !door) return;
    door.open = true;
    state.actionPointsById[unit.id] = 0;
    state.actedCombatantIds.push(unit.id);
    state.plannedMove = null;
    state.hoveredDestination = null;
    state.events.unshift(`${unit.name} opened ${door.id}`);
  },
  previewAttack: (state, action: PayloadAction<string>) => {
    const scenario = state.scenario;
    const attackerId = state.selectedCombatantId;
    if (state.status !== "active" || !scenario || !attackerId || state.actedCombatantIds.includes(attackerId)) return;
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
    if (state.status !== "active" || !scenario || !attackerId || !targetId || !fireMode || state.actedCombatantIds.includes(attackerId) || (state.actionPointsById[attackerId] ?? 0) < apCost) return;
    const attacker = scenario.combatants.find((unit) => unit.id === attackerId);
    const target = (fireMode === "melee" ? adjacentEnemies(scenario, attackerId) : rangedEnemies(scenario, attackerId)).find((unit) => unit.id === targetId);
    if (!attacker || !target || (fireMode === "automatic" && !attacker.weapon.automatic)) return;
    if (fireMode === "covering") {
      state.coveringFireByTargetId[target.id] = attacker.id;
      state.maintainedTargetByCombatantId[attacker.id] = target.id;
      state.actionPointsById[attacker.id] = 0;
      if (!state.actedCombatantIds.includes(attacker.id)) state.actedCombatantIds.push(attacker.id);
      state.events.unshift(`${attacker.name} covers ${target.name} (3 AP)`);
      state.plannedAttackTargetId = null;
      state.plannedAttackMode = null;
      return;
    }
    const meleeResult = fireMode === "melee" ? resolveMelee(attacker, target, action.payload.hitDice.first) : null;
    const fireResult = fireMode !== "melee" ? resolveSnapShot(attacker, target, action.payload.hitDice, action.payload.woundDice, coverProtection(scenario, attacker.id, target.id), fireMode) : null;
    const woundState = meleeResult?.woundState ?? fireResult?.woundState;
    if (!woundState) return;
    target.woundState = woundState;
    target.defeated = woundState === "serious" || woundState === "unconscious" || woundState === "dead";
    if (target.defeated) target.health = 0;
    if (fireMode !== "melee") state.maintainedTargetByCombatantId[attacker.id] = target.id;
    if (target.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === target.id) delete state.maintainedTargetByCombatantId[combatantId]; });
    state.actionPointsById[attacker.id] -= apCost;
    if (state.actionPointsById[attacker.id] === 0) state.actedCombatantIds.push(attacker.id);
    state.events.unshift(meleeResult ? `${attacker.name} melee attacked ${target.name} (3 AP): ${meleeResult.roll} ${meleeResult.modifier >= 0 ? "+" : ""}${meleeResult.modifier} = ${meleeResult.total} (${meleeResult.woundState})` : `${attacker.name} ${fireMode} fired at ${target.name}: hit ${fireResult!.hitTotal}/${fireResult!.targetNumber}, ${fireResult!.hit ? `wound ${fireResult!.woundTotal} (${fireResult!.woundState}, cover -${fireResult!.cover})` : `miss (cover -${fireResult!.cover})`}`);
    state.plannedAttackTargetId = null;
    state.plannedAttackMode = null;
    if (target.side === "enemy" && target.defeated) resolveEnemyMorale(state, action.payload.moraleRolls);
  },
  cancelAttackPreview: (state) => { state.plannedAttackTargetId = null; state.plannedAttackMode = null; },
  beginGrenadeTargeting: (state) => {
    const id = state.selectedCombatantId;
    const unit = state.scenario?.combatants.find((combatant) => combatant.id === id);
    if (state.status !== "active" || !id || !unit || unit.defeated || unit.grenades < 1 || state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) < 6) return;
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
    state.status = "victory";
    state.plannedObjectiveId = null;
    state.selectedCombatantId = null;
    state.events.unshift(`${unit.name} secured ${objective.label}`);
    finalizeOutcome(state);
  },
  cancelObjectivePreview: (state) => { state.plannedObjectiveId = null; },
  finishActivation: (state) => { const id = state.selectedCombatantId; if (!id || state.actedCombatantIds.includes(id)) return; state.actionPointsById[id] = 0; state.actedCombatantIds.push(id); state.plannedMove = null; state.plannedAttackTargetId = null; state.plannedAttackMode = null; state.grenadeTargeting = false; state.plannedGrenadeTarget = null; state.plannedTreatmentTargetId = null; state.plannedObjectiveId = null; },
  endPlayerTurn: (state, action: PayloadAction<{ enemyRolls: Record<string, { hitDice: DicePair; woundDice: DicePair }>; moraleRolls?: MoraleRolls }>) => {
    const scenario = state.scenario;
    const playerIds = scenario?.combatants.filter((unit) => unit.side === "player" && !unit.defeated).map((unit) => unit.id) ?? [];
    if (state.status !== "active" || playerIds.length === 0 || !playerIds.every((id) => state.actedCombatantIds.includes(id) || (state.actionPointsById[id] ?? 0) === 0)) return;
    for (const enemy of scenario!.combatants.filter((unit) => unit.side === "enemy" && !unit.defeated)) {
      const activePlayers = scenario!.combatants.filter((unit) => unit.side === "player" && !unit.defeated);
      if (activePlayers.length === 0) break;
      const coveringAttackerId = state.coveringFireByTargetId[enemy.id];
      if (coveringAttackerId) {
        const coveringAttacker = scenario!.combatants.find((unit) => unit.id === coveringAttackerId && !unit.defeated);
        const validTarget = coveringAttacker && rangedEnemies(scenario!, coveringAttacker.id).some((candidate) => candidate.id === enemy.id);
        const dice = action.payload.enemyRolls[enemy.id];
        delete state.coveringFireByTargetId[enemy.id];
        if (coveringAttacker && validTarget && dice) {
          const reaction = resolveSnapShot(coveringAttacker, enemy, dice.hitDice, dice.woundDice, coverProtection(scenario!, coveringAttacker.id, enemy.id), "covering");
          if (reaction) {
            enemy.woundState = reaction.woundState;
            enemy.defeated = reaction.woundState === "serious" || reaction.woundState === "unconscious" || reaction.woundState === "dead";
            if (enemy.defeated) enemy.health = 0;
            state.events.unshift(`${coveringAttacker.name} covering fired at ${enemy.name}: hit ${reaction.hitTotal}/${reaction.targetNumber}, ${reaction.hit ? `wound ${reaction.woundTotal} (${reaction.woundState})` : "miss"}`);
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
        const result = resolveMelee(enemy, meleeTarget, dice.hitDice.first);
        meleeTarget.woundState = result.woundState;
        meleeTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
        if (meleeTarget.defeated) meleeTarget.health = 0;
        if (meleeTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === meleeTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
        state.actionPointsById[enemy.id] = 3;
        state.events.unshift(`${enemy.name} melee attacked ${meleeTarget.name} (3 AP): ${result.roll} ${result.modifier >= 0 ? "+" : ""}${result.modifier} = ${result.total} (${result.woundState})`);
        continue;
      }
      const attackTarget = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      if (attackTarget) {
        const dice = action.payload.enemyRolls[enemy.id];
        if (!dice) continue;
        const enemyFireMode: FireMode = enemy.weapon.automatic ? "automatic" : "aimed";
        const result = resolveSnapShot(enemy, attackTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, attackTarget.id), enemyFireMode);
        if (!result) continue;
        attackTarget.woundState = result.woundState;
        attackTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
        if (attackTarget.defeated) attackTarget.health = 0;
        if (attackTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === attackTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
        state.actionPointsById[enemy.id] = 0;
        state.events.unshift(`${enemy.name} ${enemyFireMode} fired at ${attackTarget.name} (6 AP): hit ${result.hitTotal}/${result.targetNumber}, ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, cover -${result.cover})` : `miss (cover -${result.cover})`}`);
        continue;
      }
      const destinations = [...reachableMovement(scenario!, enemy.id, 3).values()]
        .sort((a, b) => distanceBetween(a.destination, target.position) - distanceBetween(b.destination, target.position) || b.cost - a.cost);
      const move = destinations[0];
      if (!move) continue;
      const before = move.path.length > 1 ? move.path[move.path.length - 2] : enemy.position;
      const dx = move.destination.x - before.x;
      const dy = move.destination.y - before.y;
      enemy.position = move.destination;
      enemy.facing = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
      state.actionPointsById[enemy.id] = 6 - move.cost;
      state.events.unshift(`${enemy.name} moved to ${move.destination.x},${move.destination.y} (${move.cost} AP)`);
      const snapTarget = rangedEnemies(scenario!, enemy.id).filter((candidate) => candidate.side === "player").sort((a, b) => distanceBetween(enemy.position, a.position) - distanceBetween(enemy.position, b.position))[0];
      const dice = action.payload.enemyRolls[enemy.id];
      if (!snapTarget || !dice || state.actionPointsById[enemy.id] < 3) continue;
      const result = resolveSnapShot(enemy, snapTarget, dice.hitDice, dice.woundDice, coverProtection(scenario!, enemy.id, snapTarget.id), "snap");
      if (!result) continue;
      snapTarget.woundState = result.woundState;
      snapTarget.defeated = result.woundState === "serious" || result.woundState === "unconscious" || result.woundState === "dead";
      if (snapTarget.defeated) snapTarget.health = 0;
      if (snapTarget.defeated) Object.entries(state.maintainedTargetByCombatantId).forEach(([combatantId, targetId]) => { if (targetId === snapTarget.id) delete state.maintainedTargetByCombatantId[combatantId]; });
      state.actionPointsById[enemy.id] -= 3;
      state.events.unshift(`${enemy.name} snap fired at ${snapTarget.name} (3 AP): hit ${result.hitTotal}/${result.targetNumber}, ${result.hit ? `wound ${result.woundTotal} (${result.woundState}, cover -${result.cover})` : `miss (cover -${result.cover})`}`);
    }
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
    state.recoveringCombatantIds.forEach((id) => {
      const patient = scenario!.combatants.find((unit) => unit.id === id && unit.woundState !== "dead");
      if (patient) { patient.defeated = false; patient.health = 1; state.events.unshift(`${patient.name} is active after treatment`); }
    });
    state.recoveringCombatantIds = [];
    state.turn += 1;
    state.coveringFireByTargetId = {};
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
  rotateCamera: (state, action: PayloadAction<-1 | 1>) => { state.camera.quarterTurn = ((state.camera.quarterTurn + action.payload + 4) % 4) as 0 | 1 | 2 | 3; },
  adjustCameraZoom: (state, action: PayloadAction<-1 | 1>) => { state.camera.zoom = Math.min(63, Math.max(28, state.camera.zoom + action.payload * 7)); },
  resetCamera: (state) => { state.camera = { quarterTurn: 0, zoom: 42, focus: null }; },
  focusCameraOnSelected: (state) => { const unit = state.scenario?.combatants.find((candidate) => candidate.id === state.selectedCombatantId); state.camera.focus = unit ? { ...unit.position } : null; },
  setBoardingTeamIds: (state, action: PayloadAction<string[]>) => { state.selectedBoardingTeamIds = action.payload.slice(0, 2); },
} });
export const { loadCombatScenario, clearCombatScenario, selectPlayerCombatant, previewMove, confirmMove, openDoor, previewAttack, selectAttackMode, confirmAttack, cancelAttackPreview, beginGrenadeTargeting, previewGrenadeTarget, cancelGrenadeTargeting, confirmGrenade, previewTreatment, cancelTreatmentPreview, confirmTreatment, previewSecureObjective, confirmSecureObjective, cancelObjectivePreview, finishActivation, endPlayerTurn, cancelMovePreview, setHoveredDestination, updateHudLayout, restoreHud, resetHudLayouts, setViewMode, rotateCamera, adjustCameraZoom, resetCamera, focusCameraOnSelected, setBoardingTeamIds } = slice.actions;
export default slice.reducer;
