"use client";

import { useAppDispatch } from "../../store/hooks";
import { openCharacterList } from "../../store/slices/uiSlice";

const CharacterListButton = () => {
  const dispatch = useAppDispatch();
  return (
    <button
      onClick={() => dispatch(openCharacterList())}
      className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 border border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors"
    >
      Characters
    </button>
  );
};

export default CharacterListButton;
