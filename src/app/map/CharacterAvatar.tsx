"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { openCharacterProfile } from "../../store/slices/uiSlice";
import { selectCurrentCharacter } from "../../store/selectors/character.selectors";

const initials = (name: string) => {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const CharacterAvatar = () => {
  const dispatch = useAppDispatch();
  const character = useAppSelector(selectCurrentCharacter);

  if (!character) return null;

  return (
    <button
      onClick={() => dispatch(openCharacterProfile(character.id))}
      title={character.name}
      className="group flex items-center gap-2 border border-(--hud-border) bg-(--hud-surface) px-2 py-1 hover:border-(--hud-accent) transition-colors"
    >
      <span className="flex h-6 w-6 items-center justify-center bg-(--hud-accent)/20 font-mono text-[10px] font-bold text-(--hud-accent) group-hover:bg-(--hud-accent)/30 transition-colors">
        {initials(character.name)}
      </span>
      <span className="max-w-28 truncate font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) group-hover:text-(--hud-accent) transition-colors">
        {character.name}
      </span>
    </button>
  );
};

export default CharacterAvatar;
