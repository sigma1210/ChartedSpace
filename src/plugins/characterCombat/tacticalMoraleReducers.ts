import { advanceTacticalPlayerActivation, tacticalCombatant } from "./tacticalStateHelpers";
import type { CharacterCombatState } from "./types";

export const tacticalMoraleReducers = {
  rallyTacticalCharacter: (state: CharacterCombatState) => {
    const map = state.tacticalMap;
    const id = map?.activeCharacterId;
    const character = map ? tacticalCombatant(map, id) : null;
    if (!map || !id || !character || character.defeated || !map.suppressedCombatantIds.includes(id) || (map.actionPointsByCharacterId[id] ?? 0) < 3) return;
    map.suppressedCombatantIds = map.suppressedCombatantIds.filter((combatantId) => combatantId !== id);
    map.actionPointsByCharacterId[id] -= 3;
    map.plannedDestination = null;
    map.events.unshift(`${character.name} rallied (3 AP)`);
    if (map.actionPointsByCharacterId[id] > 0) return;
    if (!map.actedCharacterIds.includes(id)) map.actedCharacterIds.push(id);
    advanceTacticalPlayerActivation(map);
  },
};
