"use client";

import { useEffect } from "react";
import { Plus, ChevronRight, Loader2 } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { closeModal, openCharacterCreate, openCharacterProfile } from "../../store/slices/uiSlice";
import { fetchCharacters } from "../../store/slices/characterSlice";
import {
  selectCharacters,
  selectCharactersStatus,
} from "../../store/selectors/character.selectors";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import type { CharacterSummary } from "../../store/slices/characterSlice";

const CharacterCard = ({ character }: { character: CharacterSummary }) => {
  const dispatch = useAppDispatch();

  return (
    <button
      onClick={() => dispatch(openCharacterProfile(character.id))}
      className="w-full border border-(--hud-border-subtle) bg-(--hud-surface-2) p-3 text-left hover:border-(--hud-border) hover:bg-(--hud-surface) transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-(--hud-text)">
          {character.name}
        </span>
        <ChevronRight size={14} strokeWidth={1.5} className="text-(--hud-text-dim) shrink-0" />
      </div>
      {character.worldName && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--hud-text-dim)">
          <span>
            ◉ {character.worldName}
            {character.sectorAbbr && ` · ${character.sectorAbbr}`}
            {character.hex && ` · ${character.hex}`}
          </span>
        </div>
      )}
      <div className="mt-1 flex gap-4 font-mono text-xs text-(--hud-text-dim)">
        <span>{character.upp}</span>
        <span>Cr {character.credits.toLocaleString()}</span>
        <span>Skills: {character.skills.length}</span>
      </div>
    </button>
  );
};

const CharacterListModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const characters = useAppSelector(selectCharacters);
  const status = useAppSelector(selectCharactersStatus);

  useEffect(() => {
    if (activeModal === "characterList") {
      dispatch(fetchCharacters());
    }
  }, [activeModal, dispatch]);

  if (activeModal !== "characterList") return null;

  const headerRight = (
    <button
      onClick={() => dispatch(openCharacterCreate())}
      className="flex items-center gap-1 border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      <Plus size={10} />
      New
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => dispatch(closeModal())}>
      <div className="w-full max-w-md px-4" onClick={e => e.stopPropagation()}>
    <HudModal title="Characters" headerRight={headerRight}>
      <div className="flex flex-col gap-2 p-3">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-(--hud-text-dim) uppercase tracking-wider">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        )}

        {status === "error" && (
          <div className="py-8 text-center text-xs text-(--hud-error) uppercase tracking-wider">
            Failed to load characters
          </div>
        )}

        {(status === "loaded" || status === "idle") && characters.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-(--hud-text-dim) uppercase tracking-wider">
              No characters yet
            </p>
            <button
              onClick={() => dispatch(openCharacterCreate())}
              className="mt-3 border border-(--hud-border) px-4 py-2 text-xs uppercase tracking-wider text-(--hud-text) hover:border-(--hud-accent) transition-colors"
            >
              Create your first character
            </button>
          </div>
        )}

        {status === "loaded" && characters.length > 0 && (
          <>
            {characters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
            <p className="pt-1 text-center text-[10px] text-(--hud-text-dim) uppercase tracking-wider">
              {characters.length} character{characters.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </HudModal>
      </div>
    </div>
  );
};

export default CharacterListModal;
