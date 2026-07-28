import type { PayloadAction } from "@reduxjs/toolkit";
import { treatableAllies } from "./geometry";
import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import type { CharacterCombatState } from "./types";

export const tacticalMedicalReducers = {
  previewTacticalTreatment: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const medicId = map?.activeCharacterId;
    const medic = map ? tacticalCombatant(map, medicId) : null;
    if (!map || !medicId || !medic || medic.defeated || medic.medkits < 1 || (map.actionPointsByCharacterId[medicId] ?? 0) < 6) return;
    if (!treatableAllies(map.scenario, medicId).some((patient) => patient.id === action.payload)) return;
    map.plannedTreatmentTargetId = action.payload;
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.grenadeTargeting = false;
    map.plannedGrenadeTarget = null;
    map.coveringFireTargeting = false;
    map.plannedCoveringFireTarget = null;
    map.plannedExtinguishFire = null;
    map.selectedTerrainObjectId = null;
    map.movementMode = null;
  },
  cancelTacticalTreatment: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    if (!map) return;
    map.plannedTreatmentTargetId = null;
    map.movementMode = "walk";
  },
  confirmTacticalTreatment: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const medicId = map?.activeCharacterId;
    const patientId = map?.plannedTreatmentTargetId;
    const medic = map ? tacticalCombatant(map, medicId) : null;
    const patient = map && medicId && patientId ? treatableAllies(map.scenario, medicId).find((unit) => unit.id === patientId) : null;
    if (!map || !medicId || !medic || !patient || medic.defeated || medic.medkits < 1 || (map.actionPointsByCharacterId[medicId] ?? 0) < 6) return;
    const wasIncapacitated = patient.defeated;
    if (patient.woundState === "light") {
      patient.woundState = "healthy";
      patient.seriousWounds = 0;
    } else patient.seriousWounds = Math.max(1, patient.seriousWounds ?? 1);
    medic.medkits -= 1;
    map.actionPointsByCharacterId[medicId] = 0;
    if (!map.actedCharacterIds.includes(medicId)) map.actedCharacterIds.push(medicId);
    map.events.unshift(`${medic.name} treated ${patient.name}: ${wasIncapacitated ? `${patient.woundState} stabilized; remains incapacitated` : patient.woundState}`);
    map.plannedTreatmentTargetId = null;
    map.movementMode = "walk";
    advanceTacticalPlayerActivation(map);
  },
  beginTacticalDragging: (state: CharacterCombatState, action: PayloadAction<string>) => {
    const map = state.tacticalMap;
    const carrierId = map?.activeCharacterId;
    const carrier = map ? tacticalCombatant(map, carrierId) : null;
    const patient = map ? tacticalCombatant(map, action.payload) : null;
    if (!map || !carrierId || !carrier || !patient || carrier.defeated || patient.side !== carrier.side || !patient.defeated || patient.woundState === "dead" || Math.abs(carrier.position.x - patient.position.x) + Math.abs(carrier.position.y - patient.position.y) !== 1 || Object.values(map.draggingCombatantByCarrierId).includes(patient.id)) return;
    map.draggingCombatantByCarrierId[carrierId] = patient.id;
    map.movementMode = "walk";
    map.plannedDestination = null;
    map.plannedAttackTargetId = null;
    map.plannedAttackMode = null;
    map.plannedTreatmentTargetId = null;
    map.plannedExtinguishFire = null;
    map.events.unshift(`${carrier.name} began dragging ${patient.name}`);
  },
  releaseTacticalDraggedCombatant: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const carrierId = map?.activeCharacterId;
    const patientId = carrierId ? map?.draggingCombatantByCarrierId[carrierId] : null;
    if (!map || !carrierId || !patientId) return;
    const patient = tacticalCombatant(map, patientId);
    delete map.draggingCombatantByCarrierId[carrierId];
    map.plannedDestination = null;
    map.events.unshift(`${patient?.name ?? "Incapacitated character"} released`);
  },
};
