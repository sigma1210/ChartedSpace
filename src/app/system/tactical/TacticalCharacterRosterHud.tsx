import Image from "next/image";
import { useState } from "react";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import {
  activateTacticalCharacter,
  selectTacticalDeploymentCharacter,
  updateTacticalCharacterHud,
} from "@/plugins/characterCombat/slice";
import type { Combatant, TacticalMapState } from "@/plugins/characterCombat/types";
import {
  setSelectedProfileCharacter,
  type CharacterSummary,
} from "@/plugins/characters";
import { useAppDispatch } from "@/store/hooks";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

const TacticalCharacterButton = ({
  character,
  actionPoints,
  selected,
  disabled,
  setup,
  onSelect,
}: {
  character: CharacterSummary;
  actionPoints: number;
  selected: boolean;
  disabled: boolean;
  setup: boolean;
  onSelect: () => void;
}) => {
  const portraitPath = character.avatar?.currentPortraitPath ?? null;
  const [failedPortraitPath, setFailedPortraitPath] = useState<string | null>(null);
  const showPortrait = portraitPath && failedPortraitPath !== portraitPath;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-label={`Select ${character.name}${setup ? " for deployment" : `, ${actionPoints} AP`}`}
      aria-pressed={selected}
      title={`Select ${character.name}${setup ? " for deployment" : ` · ${actionPoints} AP`}`}
      className={`group relative flex h-16 w-16 shrink-0 flex-col items-center justify-end border p-1 transition-colors ${selected ? "border-yellow-200 bg-yellow-300/20 text-yellow-50 shadow-[0_0_12px_rgba(250,204,21,0.35)]" : "border-(--hud-border) bg-(--hud-bg)/90 text-(--hud-text-dim) hover:border-cyan-300 hover:text-(--hud-text)"} disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45`}
    >
      <span className="absolute right-0.5 top-0.5 border border-emerald-400/60 bg-emerald-950 px-1 text-[7px] text-emerald-100">{setup ? "Deploy" : `${actionPoints} AP`}</span>
      <span className="relative mb-1 h-10 w-10 overflow-hidden rounded-sm border border-(--hud-border-subtle) bg-black/50">
        {showPortrait ? <Image src={portraitPath} alt="" fill sizes="40px" onError={() => setFailedPortraitPath(portraitPath)} className="object-cover" /> : <span className="flex h-full w-full items-center justify-center text-sm font-bold uppercase">{character.name.slice(0, 1)}</span>}
      </span>
      <span className="w-full truncate text-center text-[7px] font-bold leading-none">{character.name}</span>
    </button>
  );
};

const TacticalAllyButton = ({
  combatant,
  actionPoints,
  selected,
  onSelect,
}: {
  combatant: Combatant;
  actionPoints: number;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    disabled={actionPoints < 1}
    onClick={onSelect}
    aria-label={`Select ally ${combatant.name}, ${actionPoints} AP`}
    aria-pressed={selected}
    className={`group relative flex h-16 w-16 shrink-0 flex-col items-center justify-end border p-1 transition-colors ${selected ? "border-yellow-200 bg-yellow-300/20 text-yellow-50" : "border-emerald-500/70 bg-emerald-950/70 text-emerald-100 hover:border-emerald-200"} disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45`}
  >
    <span className="absolute right-0.5 top-0.5 border border-emerald-400/60 bg-emerald-950 px-1 text-[7px] text-emerald-100">{actionPoints} AP</span>
    <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-sm border border-emerald-600/60 bg-black/50 text-sm font-bold uppercase">{combatant.name.slice(0, 1)}</span>
    <span className="w-full truncate text-center text-[7px] font-bold leading-none">{combatant.name}</span>
  </button>
);

export const TacticalCharacterRosterHud = ({
  tacticalMap,
  characters,
  transformedAllies,
  activeCombatant,
  characterStatus,
  shipStatus,
}: {
  tacticalMap: TacticalMapState;
  characters: CharacterSummary[];
  transformedAllies: Combatant[];
  activeCombatant: Combatant | null;
  characterStatus: LoadStatus;
  shipStatus: LoadStatus;
}) => {
  const dispatch = useAppDispatch();
  const setup = (tacticalMap.scenarioStatus ?? "active") === "setup";

  return (
    <FloatingPluginHud
      title="Characters"
      layout={tacticalMap.characterHudLayout}
      onLayoutChange={(layout) => dispatch(updateTacticalCharacterHud(layout))}
      className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <nav aria-label="Tactical character roster" className="flex max-w-[75vw] gap-1 p-1">
        {characters.map((character) => {
          const actionPoints = tacticalMap.actionPointsByCharacterId[character.id] ?? 0;
          return (
            <TacticalCharacterButton
              key={character.id}
              character={character}
              actionPoints={actionPoints}
              selected={activeCombatant?.id === character.id}
              disabled={!setup && actionPoints < 1}
              setup={setup}
              onSelect={() => {
                dispatch(
                  setup
                    ? selectTacticalDeploymentCharacter(character.id)
                    : activateTacticalCharacter(character.id),
                );
                dispatch(setSelectedProfileCharacter(character.id));
              }}
            />
          );
        })}
        {transformedAllies.map((ally) => (
          <TacticalAllyButton
            key={ally.id}
            combatant={ally}
            actionPoints={tacticalMap.actionPointsByCharacterId[ally.id] ?? 0}
            selected={activeCombatant?.id === ally.id}
            onSelect={() => {
              dispatch(activateTacticalCharacter(ally.id));
              dispatch(setSelectedProfileCharacter(null));
            }}
          />
        ))}
        {characterStatus === "loaded" && shipStatus === "loaded" && characters.length === 0 && (
          <span className="px-3 py-4 text-(--hud-text-dim)">No assigned character crew</span>
        )}
      </nav>
    </FloatingPluginHud>
  );
};
