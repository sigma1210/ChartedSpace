"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, WandSparkles } from "lucide-react";
import {
  buildAvatarPromptSlug,
  buildDefaultAvatarSlugValues,
  DEFAULT_AVATAR_SLUG_FIELDS,
  type AvatarSlugValues,
} from "@/lib/characters/avatar";
import { usePluginDispatch, usePluginSelector } from "@/plugin-api";
import { refreshShip } from "@/plugins/ship";
import { fetchCharacters, invalidateCharacters, refreshCharacters } from "./charactersSlice";
import { selectCurrentCharacter, selectSelectedProfileCharacter } from "./selectors";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type GenerationStatus = "idle" | "queued" | "error";
type DraftState = { characterId: string; values: AvatarSlugValues } | null;
type SaveState = { characterId: string | null; status: SaveStatus; error: string | null };
type GenerationState = {
  characterId: string | null;
  status: GenerationStatus;
  error: string | null;
  initialPortraitPath?: string | null;
  attempts?: number;
};

const editableFields = DEFAULT_AVATAR_SLUG_FIELDS.filter((field) =>
  ["build", "clothing", "hairColor", "eyeColor"].includes(field.key),
);
const genderField = DEFAULT_AVATAR_SLUG_FIELDS.find((field) => field.key === "gender");

const currentGender = (values: AvatarSlugValues) =>
  values.gender === "female" || values.gender === "male" ? values.gender : null;

export const CharacterAvatarCustomizeHudContent = () => {
  const dispatch = usePluginDispatch();
  const currentCharacter = usePluginSelector(selectCurrentCharacter);
  const selectedCharacter = usePluginSelector(selectSelectedProfileCharacter);
  const character = selectedCharacter?.kind === "player" ? selectedCharacter : currentCharacter;
  const characterSource = selectedCharacter?.kind === "player" ? "Selected Player" : "Current Player";
  const [draft, setDraft] = useState<DraftState>(null);
  const [saveState, setSaveState] = useState<SaveState>({
    characterId: null,
    status: "idle",
    error: null,
  });
  const [generationState, setGenerationState] = useState<GenerationState>({
    characterId: null,
    status: "idle",
    error: null,
  });
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);

  const storedGender = character?.gender ?? currentGender(character?.avatar?.slugValues ?? {}) ?? null;
  const age = character?.age ?? null;
  const baseValues = useMemo(
    () => {
      if (!character) return {};
      const seedValues: AvatarSlugValues = {
        ...(character.avatar?.slugValues ?? {}),
      };
      if (storedGender) seedValues.gender = storedGender;

      const defaults = buildDefaultAvatarSlugValues(DEFAULT_AVATAR_SLUG_FIELDS, seedValues);
      if (!storedGender && !currentGender(seedValues)) delete defaults.gender;
      return defaults;
    },
    [character, storedGender],
  );
  const values = draft && draft.characterId === character?.id ? draft.values : baseValues;
  const gender = storedGender ?? currentGender(values);
  const needsLegacyGender = Boolean(character?.kind === "player" && !storedGender);
  const visibleSaveState = saveState.characterId === character?.id
    ? saveState
    : { characterId: character?.id ?? null, status: "idle" as SaveStatus, error: null };
  const visibleGenerationState = generationState.characterId === character?.id
    ? generationState
    : { characterId: character?.id ?? null, status: "idle" as GenerationStatus, error: null };

  const promptSlug = useMemo(() => {
    if (!gender) return "";
    try {
      return buildAvatarPromptSlug(DEFAULT_AVATAR_SLUG_FIELDS, {
        ...values,
        gender,
      });
    } catch {
      return "";
    }
  }, [gender, values]);

  const portraitPath = character?.avatar?.currentPortraitPath ?? null;
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;
  const canSave = Boolean(character?.id && character.kind === "player" && gender && visibleSaveState.status !== "saving");
  const hasUnsavedDraft = Boolean(draft && draft.characterId === character?.id);
  const canGenerate = Boolean(
    character?.id &&
    character.kind === "player" &&
    character.avatar?.promptSlug &&
    !hasUnsavedDraft &&
    visibleSaveState.status !== "saving",
  );
  const generationUpdated = Boolean(
    visibleGenerationState.status === "queued" &&
    portraitPath &&
    portraitPath !== visibleGenerationState.initialPortraitPath,
  );

  useEffect(() => {
    if (
      !character?.id ||
      visibleGenerationState.status !== "queued" ||
      visibleGenerationState.characterId !== character.id
    ) {
      return;
    }

    if (generationUpdated) return;

    const attempts = visibleGenerationState.attempts ?? 0;
    if (attempts >= 40) return;

    const timeoutId = window.setTimeout(() => {
      setGenerationState((current) => (
        current.characterId === character.id && current.status === "queued"
          ? { ...current, attempts: (current.attempts ?? 0) + 1 }
          : current
      ));
      void Promise.all([
        dispatch(refreshCharacters()),
        dispatch(refreshShip()),
      ]);
    }, 3_000);

    return () => window.clearTimeout(timeoutId);
  }, [
    character?.id,
    dispatch,
    generationUpdated,
    portraitPath,
    visibleGenerationState.attempts,
    visibleGenerationState.characterId,
    visibleGenerationState.initialPortraitPath,
    visibleGenerationState.status,
  ]);

  const updateValue = (key: string, value: string) => {
    if (!character?.id) return;
    setDraft((current) => ({
      characterId: character.id,
      values: {
        ...(current?.characterId === character.id ? current.values : baseValues),
        [key]: value,
      },
    }));
    setSaveState({ characterId: character.id, status: "idle", error: null });
    setGenerationState({ characterId: character.id, status: "idle", error: null });
  };

  const saveAvatar = async () => {
    if (!character?.id || !canSave) return;
    setSaveState({ characterId: character.id, status: "saving", error: null });
    try {
      const response = await fetch(`/api/characters/${character.id}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugValues: values,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to save avatar settings");

      dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());
      setDraft(null);
      setSaveState({ characterId: character.id, status: "saved", error: null });
    } catch (err) {
      console.error("[avatar customization]", err);
      setSaveState({
        characterId: character.id,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to save avatar settings",
      });
    }
  };

  const generateAvatar = async () => {
    if (!character?.id || !canGenerate) return;
    setGenerationState({ characterId: character.id, status: "idle", error: null });
    try {
      const response = await fetch(`/api/characters/${character.id}/avatar/generate`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to queue avatar generation");

      setGenerationState({
        characterId: character.id,
        status: "queued",
        error: null,
        initialPortraitPath: portraitPath,
        attempts: 0,
      });
    } catch (err) {
      console.error("[avatar generation]", err);
      setGenerationState({
        characterId: character.id,
        status: "error",
        error: err instanceof Error ? err.message : "Failed to queue avatar generation",
      });
    }
  };

  if (!character) {
    return (
      <div className="w-72 p-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        No current player character
      </div>
    );
  }

  if (character.kind !== "player") {
    return (
      <div className="w-72 p-1 font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
        Avatar customization is only available for player characters
      </div>
    );
  }

  return (
    <div className="flex max-h-[48vh] w-80 flex-col gap-1 overflow-hidden p-0.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex items-center justify-between border-b border-(--hud-border-subtle) pb-1">
        <div className="min-w-0">
          <div className="truncate text-[9px] text-(--hud-text)">
            {character.name}
          </div>
          <div className="text-[7px] text-(--hud-text-dim)">
            {characterSource} / Age {typeof age === "number" ? age : "Unknown"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={saveAvatar}
            disabled={!canSave}
            className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
            title="Save avatar appearance"
          >
            {visibleSaveState.status === "saving" ? (
              <Loader2 size={10} className="animate-spin" aria-hidden="true" />
            ) : (
              <Save size={10} aria-hidden="true" />
            )}
            Save
          </button>
          <button
            type="button"
            onClick={generateAvatar}
            disabled={!canGenerate}
            className="flex h-5 items-center gap-1 border border-(--hud-border) px-1.5 text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
            title={hasUnsavedDraft ? "Save avatar settings before generating" : "Generate avatar portrait"}
          >
            <WandSparkles size={10} aria-hidden="true" />
            Generate
          </button>
        </div>
      </div>

      {(visibleSaveState.error || visibleGenerationState.error) && (
        <div className="border border-(--hud-error)/40 bg-(--hud-error)/5 px-1.5 py-1 text-(--hud-error)">
          {visibleSaveState.error ?? visibleGenerationState.error}
        </div>
      )}

      {visibleSaveState.status === "saved" && (
        <div className="border border-(--hud-accent)/30 bg-(--hud-accent)/5 px-1.5 py-1 text-(--hud-accent)">
          Avatar settings saved
        </div>
      )}

      {visibleGenerationState.status === "queued" && !generationUpdated && (
        <div className="border border-(--hud-accent)/30 bg-(--hud-accent)/5 px-1.5 py-1 text-(--hud-accent)">
          Avatar generation queued
        </div>
      )}

      {generationUpdated && (
        <div className="border border-(--hud-accent)/30 bg-(--hud-accent)/5 px-1.5 py-1 text-(--hud-accent)">
          Avatar portrait updated
        </div>
      )}

      <div className="grid grid-cols-[1fr_5rem] gap-2 overflow-hidden">
        <div className="flex min-w-0 flex-col gap-1 overflow-y-auto pr-1">
          {needsLegacyGender && genderField && (
            <label className="flex flex-col gap-0.5">
              <span className="text-[7px] text-(--hud-text-dim)">Gender</span>
              <select
                value={values.gender ?? ""}
                onChange={(event) => updateValue("gender", event.target.value)}
                className="h-6 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              >
                <option value="" disabled>
                  Select
                </option>
                {genderField.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {editableFields.map((field) => (
            <label key={field.key} className="flex flex-col gap-0.5">
              <span className="text-[7px] text-(--hud-text-dim)">{field.label}</span>
              <select
                value={values[field.key] ?? field.defaultOptionId ?? ""}
                onChange={(event) => updateValue(field.key, event.target.value)}
                className="h-6 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              >
                {field.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <div className="border-t border-(--hud-border-subtle) pt-1">
            <div className="text-[7px] text-(--hud-text-dim)">Prompt Slug</div>
            <div className="mt-0.5 normal-case tracking-normal text-(--hud-text-dim)">
              {promptSlug || "Incomplete avatar settings"}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden border border-(--hud-border-subtle) bg-(--hud-surface)">
            {showPortrait && (
              <Image
                src={portraitPath}
                alt={`${character.name} portrait`}
                fill
                sizes="80px"
                onError={() => setFailedPortraitPath(portraitPath)}
                className="object-cover"
              />
            )}
            {!showPortrait && (
              <span className="flex h-full w-full items-center justify-center text-[16px] text-(--hud-text-dim)">
                {character.name.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-center text-[7px] text-(--hud-text-dim)">
            Current
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterAvatarCustomizeHudContent;
