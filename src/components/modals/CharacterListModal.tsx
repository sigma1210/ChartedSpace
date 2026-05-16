"use client";

import { Plus, ChevronRight } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch } from "../../store/hooks";
import { openCharacterCreate, openCharacterProfile } from "../../store/slices/uiSlice";

interface CharacterSummary {
  id: string;
  name: string;
  upp: string;
  credits: number;
  skillCount: number;
  worldName: string | null;
  sectorAbbr: string | null;
  hex: string | null;
}

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
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-(--hud-text-dim)">
        {character.worldName && (
          <span>
            ◉ {character.worldName}
            {character.sectorAbbr && ` · ${character.sectorAbbr}`}
            {character.hex && ` · ${character.hex}`}
          </span>
        )}
      </div>
      <div className="mt-1 flex gap-4 font-mono text-xs text-(--hud-text-dim)">
        <span>{character.upp}</span>
        <span>Cr {character.credits.toLocaleString()}</span>
        <span>Skills: {character.skillCount}</span>
      </div>
    </button>
  );
}

// Placeholder data — will be replaced with server data fetch
const PLACEHOLDER_CHARACTERS: CharacterSummary[] = [];

const CharacterListModal = () => {
  const dispatch = useAppDispatch();
  const characters = PLACEHOLDER_CHARACTERS;

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
    <HudModal title="Characters" headerRight={headerRight}>
      <div className="flex flex-col gap-2 p-3">
        {characters.length === 0 ? (
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
        ) : (
          <>
            {characters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
            <p className="pt-1 text-center text-[10px] text-(--hud-text-dim) uppercase tracking-wider">
              Showing {characters.length} character{characters.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </HudModal>
  );
}
export default CharacterListModal
