"use client";

import { useState } from "react";
import { Eye, Plus, Loader2 } from "lucide-react";
import { usePluginDispatch, usePluginSelector } from "@/plugin-api";
import { setHudVisible } from "@/store/slices/hudSlice";
import { openModal } from "@/store/slices/uiSlice";
import { fetchCharacters, setSelectedProfileCharacter } from "./charactersSlice";
import { fetchShip, invalidateShip } from "@/plugins/ship";
import {
  selectCharacters,
  selectCharactersStatus,
} from "./selectors";
import type { CharacterSummary } from "./charactersSlice";
import { characterProfileHudId } from "./metadata";

const genderLabel = (gender: CharacterSummary["gender"]) => {
  if (gender === "female") return "Female";
  if (gender === "male") return "Male";
  if (gender === "nonbinary") return "Nonbinary";
  return null;
};

const CharacterCard = ({
  character,
  onProfile,
  onStart,
  starting,
}: {
  character: CharacterSummary;
  onProfile: (characterId: string) => void;
  onStart: (characterId: string) => void;
  starting: boolean;
}) => {
  return (
    <div className="w-full border border-(--hud-border-subtle) bg-(--hud-surface-2)/70 px-1.5 py-1 text-left">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[9px] font-semibold leading-tight text-(--hud-text)">
          {character.name}
        </span>
        <span className="shrink-0 font-mono text-[8px] leading-tight text-(--hud-text-dim)">
          Cr {character.credits.toLocaleString()}
        </span>
      </div>
      {character.worldName && (
        <div className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[8px] leading-tight text-(--hud-text-dim)">
          <span className="truncate">
            ◉ {character.worldName}
            {character.sectorAbbr && ` · ${character.sectorAbbr}`}
            {character.hex && ` · ${character.hex}`}
          </span>
        </div>
      )}
      <div className="mt-0.5 flex gap-2 font-mono text-[8px] leading-tight text-(--hud-text-dim)">
        <span className="text-(--hud-accent)">{character.upp}</span>
        {genderLabel(character.gender) && <span>{genderLabel(character.gender)}</span>}
        <span>Skills: {character.skills.length}</span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onProfile(character.id)}
          className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
          title={`View ${character.name}`}
        >
          <Eye size={10} aria-hidden="true" />
          Profile
        </button>
        <button
          type="button"
          onClick={() => onStart(character.id)}
          disabled={starting}
          className="h-5 border border-(--hud-accent) px-1.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-accent) transition-colors hover:bg-(--hud-accent)/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {starting ? "Starting..." : "Start"}
        </button>
      </div>
    </div>
  );
};

export const CharacterListHudContent = () => {
  const dispatch = usePluginDispatch();
  const characters = usePluginSelector(selectCharacters);
  const status = usePluginSelector(selectCharactersStatus);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const handleStartCharacter = async (characterId: string) => {
    if (startingId) return;
    setStartingId(characterId);
    setStartError(null);
    try {
      const res = await fetch(`/api/characters/${characterId}/play`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setStartError(body.error ?? "Failed to start character");
        return;
      }

      dispatch(invalidateShip());
      await dispatch(fetchShip());
    } catch (err) {
      console.error("[start character]", err);
      setStartError("Failed to start character");
    } finally {
      setStartingId(null);
    }
  };

  const handleViewProfile = (characterId: string) => {
    dispatch(setSelectedProfileCharacter(characterId));
    dispatch(setHudVisible({ id: characterProfileHudId, visible: true }));
  };

  const headerRight = (
    <button
      onClick={() => dispatch(openModal("characterGeneration"))}
      className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 text-[8px] uppercase tracking-wider text-(--hud-text) transition-colors hover:border-(--hud-accent)"
    >
      <Plus size={10} />
      New
    </button>
  );

  return (
    <div className="flex max-h-[36vh] w-72 flex-col gap-1 overflow-hidden p-0.5">
      <div className="flex items-center justify-between border-b border-(--hud-border-subtle) pb-1">
        <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
          Roster
        </span>
        {headerRight}
      </div>
      <div className="min-h-0 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1">
        {status === "loading" && (
          <div className="flex items-center justify-center gap-1.5 py-5 text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
            <Loader2 size={14} className="animate-spin" />
            Loading…
          </div>
        )}

        {status === "error" && (
          <div className="py-5 text-center text-[8px] uppercase tracking-wider text-(--hud-error)">
            Failed to load characters
          </div>
        )}

        {startError && (
          <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-center text-[8px] uppercase tracking-wider text-(--hud-error)">
            {startError}
          </div>
        )}

        {(status === "loaded" || status === "idle") && characters.length === 0 && (
          <div className="py-5 text-center">
            <p className="text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
              No characters yet
            </p>
            <button
              onClick={() => dispatch(openModal("characterGeneration"))}
              className="mt-2 border border-(--hud-border) px-2 py-1 text-[8px] uppercase tracking-wider text-(--hud-text) transition-colors hover:border-(--hud-accent)"
            >
              Create character
            </button>
          </div>
        )}

        {status === "loaded" && characters.length > 0 && (
          <>
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onProfile={handleViewProfile}
                onStart={handleStartCharacter}
                starting={startingId === c.id}
              />
            ))}
            <p className="pt-0.5 text-center text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
              {characters.length} character{characters.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default CharacterListHudContent;
