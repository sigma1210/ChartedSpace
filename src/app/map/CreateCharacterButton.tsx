"use client";

import { useAppDispatch } from "../../store/hooks";
import { openCharacterCreate } from "../../store/slices/uiSlice";

const CreateCharacterButton = () => {
  const dispatch = useAppDispatch();
  return (
    <button
      onClick={() => dispatch(openCharacterCreate())}
      className="font-mono text-xs uppercase tracking-widest px-3 py-1.5 border border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors"
    >
      Create Character
    </button>
  );
};

export default CreateCharacterButton;
