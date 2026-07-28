import type { PayloadAction } from "@reduxjs/toolkit";
import type { CharacterCombatHudLayout, CharacterCombatState } from "./types";

export const tacticalHudReducers = {
  updateTacticalCharacterHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.characterHudLayout = action.payload;
  },
  updateTacticalEnemyHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.enemyHudLayout = action.payload;
  },
  updateTacticalActionHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.actionHudLayout = action.payload;
  },
  updateTacticalDeploymentHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.deploymentHudLayout = action.payload;
  },
  updateTacticalCharacterInformationHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.characterInformationHudLayout = action.payload;
  },
  updateTacticalEventsHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.eventsHudLayout = action.payload;
  },
  updateTacticalScenarioHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.scenarioHudLayout = action.payload;
  },
  updateTacticalNavigationHud: (state: CharacterCombatState, action: PayloadAction<CharacterCombatHudLayout>) => {
    if (state.tacticalMap) state.tacticalMap.navigationHudLayout = action.payload;
  },
};
