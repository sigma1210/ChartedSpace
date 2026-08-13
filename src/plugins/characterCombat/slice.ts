import { createSlice } from "@reduxjs/toolkit";
import type { CharacterCombatState } from "./types";
import { collateralCheckPasses } from "./tacticalCollateral";
import { tacticalCoveringFireReducers } from "./tacticalCoveringFireReducers";
import { tacticalDeploymentReducers } from "./tacticalDeploymentReducers";
import { tacticalExplosivesReducers } from "./tacticalExplosivesReducers";
import { tacticalEnemyMovementReactionReducers } from "./tacticalEnemyMovementReactions";
import { tacticalEnemyPhaseReducers } from "./tacticalEnemyPhaseReducers";
import { tacticalHudReducers } from "./tacticalHudReducers";
import { tacticalMeleeReducers } from "./tacticalMeleeReducers";
import { tacticalMedicalReducers } from "./tacticalMedicalReducers";
import { tacticalMoraleReducers } from "./tacticalMoraleReducers";
import { tacticalPlayerMovementReducers } from "./tacticalPlayerMovementReducers";
import { tacticalRangedReducers } from "./tacticalRangedReducers";
import { tacticalScenarioReducers } from "./tacticalScenarioReducers";
import { tacticalTerrainReducers } from "./tacticalTerrainReducers";
import { tacticalTurnLifecycleReducers } from "./tacticalTurnLifecycle";

export const initialCharacterCombatState: CharacterCombatState = {};
const slice = createSlice({ name: "characterCombat", initialState: initialCharacterCombatState, reducers: {
  ...tacticalScenarioReducers,
  ...tacticalDeploymentReducers,
  ...tacticalHudReducers,
  ...tacticalEnemyMovementReactionReducers,
  ...tacticalRangedReducers,
  ...tacticalCoveringFireReducers,
  ...tacticalExplosivesReducers,
  ...tacticalMedicalReducers,
  ...tacticalMeleeReducers,
  ...tacticalMoraleReducers,
  ...tacticalTurnLifecycleReducers,
  ...tacticalEnemyPhaseReducers,
  ...tacticalPlayerMovementReducers,
  ...tacticalTerrainReducers,
} });
export const { updateTacticalCharacterHud, updateTacticalActionHud } = slice.actions;
export const initializeTacticalMapSetup = slice.actions.initializeTacticalMapSetup;
export const initializeTacticalDraftPlaytest = slice.actions.initializeTacticalDraftPlaytest;
export const selectTacticalLightingPreset = slice.actions.selectTacticalLightingPreset;
export const setTacticalTerrainLights = slice.actions.setTacticalTerrainLights;
export const recordTacticalExploration = slice.actions.recordTacticalExploration;
export const recordTacticalEnemySightings = slice.actions.recordTacticalEnemySightings;
export const startTacticalScenario = slice.actions.startTacticalScenario;
export const selectTacticalDeploymentCharacter = slice.actions.selectTacticalDeploymentCharacter;
export const deployTacticalCharacter = slice.actions.deployTacticalCharacter;
export const rotateTacticalDeploymentCharacter = slice.actions.rotateTacticalDeploymentCharacter;
export const setTacticalDeploymentPosture = slice.actions.setTacticalDeploymentPosture;
export const equipTacticalDeploymentItem = slice.actions.equipTacticalDeploymentItem;
export const unequipTacticalDeploymentItem = slice.actions.unequipTacticalDeploymentItem;
export const setTacticalMovementMode = slice.actions.setTacticalMovementMode;
export const previewTacticalMove = slice.actions.previewTacticalMove;
export const activateTacticalCharacter = slice.actions.activateTacticalCharacter;
export const finishTacticalActivation = slice.actions.finishTacticalActivation;
export const resolveTacticalAdjacencyReaction = slice.actions.resolveTacticalAdjacencyReaction;
export const runTacticalEnemyPhase = slice.actions.runTacticalEnemyPhase;
export const resolveTacticalCoveringFireSnap = slice.actions.resolveTacticalCoveringFireSnap;
export const resetTacticalScenario = slice.actions.resetTacticalScenario;
export const resetTacticalDraftPlaytest = slice.actions.resetTacticalDraftPlaytest;
export const confirmTacticalMove = slice.actions.confirmTacticalMove;
export const turnTacticalCharacter = slice.actions.turnTacticalCharacter;
export const toggleTacticalPosture = slice.actions.toggleTacticalPosture;
export const selectTacticalTerrainObject = slice.actions.selectTacticalTerrainObject;
export const beginTacticalConversation = slice.actions.beginTacticalConversation;
export const finishTacticalConversation = slice.actions.finishTacticalConversation;
export const interactWithTacticalTerrain = slice.actions.interactWithTacticalTerrain;
export const attemptTacticalConsoleCheck = slice.actions.attemptTacticalConsoleCheck;
export const fireAtTacticalTerrain = slice.actions.fireAtTacticalTerrain;
export const updateTacticalCharacterInformationHud = slice.actions.updateTacticalCharacterInformationHud;
export const updateTacticalDeploymentHud = slice.actions.updateTacticalDeploymentHud;
export const updateTacticalEventsHud = slice.actions.updateTacticalEventsHud;
export const updateTacticalScenarioHud = slice.actions.updateTacticalScenarioHud;
export const updateTacticalNavigationHud = slice.actions.updateTacticalNavigationHud;
export const updateTacticalEnemyHud = slice.actions.updateTacticalEnemyHud;
export const selectTacticalAttackTarget = slice.actions.selectTacticalAttackTarget;
export const selectTacticalAttackMode = slice.actions.selectTacticalAttackMode;
export const confirmTacticalAttack = slice.actions.confirmTacticalAttack;
export const cancelTacticalAttack = slice.actions.cancelTacticalAttack;
export const aimTacticalAttack = slice.actions.aimTacticalAttack;
export const reloadTacticalWeapon = slice.actions.reloadTacticalWeapon;
export const selectTacticalWeaponAmmunition = slice.actions.selectTacticalWeaponAmmunition;
export const rallyTacticalCharacter = slice.actions.rallyTacticalCharacter;
export const braceTacticalWeapon = slice.actions.braceTacticalWeapon;
export const beginTacticalCoveringFire = slice.actions.beginTacticalCoveringFire;
export const previewTacticalCoveringFire = slice.actions.previewTacticalCoveringFire;
export const confirmTacticalCoveringFire = slice.actions.confirmTacticalCoveringFire;
export const cancelTacticalCoveringFire = slice.actions.cancelTacticalCoveringFire;
export const beginTacticalGrenadeTargeting = slice.actions.beginTacticalGrenadeTargeting;
export const beginTacticalSmokeGrenadeTargeting = slice.actions.beginTacticalSmokeGrenadeTargeting;
export const previewTacticalGrenadeTarget = slice.actions.previewTacticalGrenadeTarget;
export const confirmTacticalGrenade = slice.actions.confirmTacticalGrenade;
export const cancelTacticalGrenadeTargeting = slice.actions.cancelTacticalGrenadeTargeting;
export const previewTacticalExtinguishFire = slice.actions.previewTacticalExtinguishFire;
export const confirmTacticalExtinguishFire = slice.actions.confirmTacticalExtinguishFire;
export const cancelTacticalExtinguishFire = slice.actions.cancelTacticalExtinguishFire;
export const beginTacticalSatchelPlacement = slice.actions.beginTacticalSatchelPlacement;
export const confirmTacticalSatchelPlacement = slice.actions.confirmTacticalSatchelPlacement;
export const cancelTacticalSatchelPlacement = slice.actions.cancelTacticalSatchelPlacement;
export const detonateTacticalSatchelCharge = slice.actions.detonateTacticalSatchelCharge;
export const defuseTacticalSatchelCharge = slice.actions.defuseTacticalSatchelCharge;
export const previewTacticalTreatment = slice.actions.previewTacticalTreatment;
export const confirmTacticalTreatment = slice.actions.confirmTacticalTreatment;
export const cancelTacticalTreatment = slice.actions.cancelTacticalTreatment;
export const beginTacticalDragging = slice.actions.beginTacticalDragging;
export const releaseTacticalDraggedCombatant = slice.actions.releaseTacticalDraggedCombatant;
export const previewTacticalMelee = slice.actions.previewTacticalMelee;
export const previewTacticalMeleeDive = slice.actions.previewTacticalMeleeDive;
export const previewTacticalEnemyEntry = slice.actions.previewTacticalEnemyEntry;
export const confirmTacticalMelee = slice.actions.confirmTacticalMelee;
export const cancelTacticalMelee = slice.actions.cancelTacticalMelee;
export { collateralCheckPasses };


export default slice.reducer;
