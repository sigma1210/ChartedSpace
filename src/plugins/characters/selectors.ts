import type { RootState } from "@/store";
import type { CharacterSummary } from "./charactersSlice";
import { selectOwnerOperatorCharacterId, selectShipLocation } from "@/plugins/ship";

export interface CharacterProfileLocation {
  worldName: string | null;
  sectorAbbr: string | null;
  hex: string | null;
}

export const selectCharacters = (state: RootState): CharacterSummary[] =>
  state.plugins.characters.items;

export const selectCharactersStatus = (state: RootState) =>
  state.plugins.characters.status;

export const selectCurrentCharacter = (state: RootState): CharacterSummary | null => {
  const id = state.ui.activeCharacterId;
  if (!id) return null;
  return state.plugins.characters.items.find(c => c.id === id) ?? null;
};

export const selectOwnerOperatorCharacter = (state: RootState): CharacterSummary | null => {
  const id = selectOwnerOperatorCharacterId(state);
  if (!id) return null;
  return state.plugins.characters.items.find((character) => character.id === id) ?? null;
};

export const selectOwnerOperatorCredits = (state: RootState): number | null =>
  selectOwnerOperatorCharacter(state)?.credits ?? null;

export const selectFallbackCharacter = (state: RootState): CharacterSummary | null =>
  state.plugins.characters.items.find((character) => character.sectorAbbr && character.hex) ??
  state.plugins.characters.items[0] ??
  null;

export const selectEffectiveCharacterProfile = (state: RootState): CharacterSummary | null =>
  selectCurrentCharacter(state) ??
  selectOwnerOperatorCharacter(state) ??
  selectFallbackCharacter(state);

export const selectEffectiveCharacterProfileLocation = (
  state: RootState,
): CharacterProfileLocation | null => {
  const character = selectEffectiveCharacterProfile(state);
  if (!character) return null;
  const shipLocation = selectShipLocation(state);

  return {
    worldName: shipLocation?.worldName ?? character.worldName ?? null,
    sectorAbbr: shipLocation?.sectorAbbr ?? character.sectorAbbr ?? null,
    hex: shipLocation?.hex ?? character.hex ?? null,
  };
};
