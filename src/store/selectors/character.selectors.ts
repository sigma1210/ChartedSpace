import type { RootState } from "../index";
import type { CharacterSummary } from "../slices/characterSlice";

export const selectCharacters = (state: RootState): CharacterSummary[] =>
  state.characters.items;

export const selectCharactersStatus = (state: RootState) =>
  state.characters.status;

export const selectCurrentCharacter = (state: RootState): CharacterSummary | null => {
  const id = state.ui.activeCharacterId;
  if (!id) return null;
  return state.characters.items.find(c => c.id === id) ?? null;
};
