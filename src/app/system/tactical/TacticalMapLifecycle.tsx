import { useEffect } from "react";
import {
  initializeTacticalDraftPlaytest,
  initializeTacticalMapSetup,
  recordTacticalEnemySightings,
  recordTacticalExploration,
} from "@/plugins/characterCombat/slice";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { Combatant } from "@/plugins/characterCombat/types";
import {
  fetchCharacters,
  setSelectedProfileCharacter,
  type CharacterSummary,
} from "@/plugins/characters";
import { useAppDispatch } from "@/store/hooks";

type LoadStatus = "idle" | "loading" | "loaded" | "error";

type TacticalMapLifecycleProps = {
  characterStatus: LoadStatus;
  shipStatus: LoadStatus;
  characters: CharacterSummary[];
  exploredCells: ReadonlySet<string>;
  visibleCellKeys: string[];
  visibleEnemySightings: Array<{
    id: string;
    position: { x: number; y: number };
  }>;
  activeCombatant: Combatant | null;
  selectedProfileCharacterId: string | null;
  draftPlaytest?: {
    definition: TacticalScenarioDefinitionFile;
    consoleVictory: TacticalConsoleVictoryDefinitionFile;
  };
};

export const TacticalMapLifecycle = ({
  characterStatus,
  shipStatus,
  characters,
  exploredCells,
  visibleCellKeys,
  visibleEnemySightings,
  activeCombatant,
  selectedProfileCharacterId,
  draftPlaytest,
}: TacticalMapLifecycleProps) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (characterStatus === "idle") void dispatch(fetchCharacters());
  }, [characterStatus, dispatch]);

  useEffect(() => {
    const newlyExplored = visibleCellKeys.filter((key) => !exploredCells.has(key));
    if (newlyExplored.length > 0) dispatch(recordTacticalExploration(newlyExplored));
  }, [dispatch, exploredCells, visibleCellKeys]);

  useEffect(() => {
    dispatch(recordTacticalEnemySightings({
      visibleCellKeys,
      enemies: visibleEnemySightings,
    }));
  }, [dispatch, visibleCellKeys, visibleEnemySightings]);

  useEffect(() => {
    if (characterStatus !== "loaded" || shipStatus !== "loaded") return;
    const crew = characters.map((character) => ({
      id: character.id,
      name: character.name,
      weaponSkill: character.skills.find((skill) => skill.name === "Gun Combat")?.level ?? 0,
      meleeRating: character.skills.find((skill) => skill.name === "Melee")?.level ?? 0,
      skills: character.skills,
    }));
    dispatch(
      draftPlaytest
        ? initializeTacticalDraftPlaytest({
            crew,
            definition: draftPlaytest.definition,
            consoleVictory: draftPlaytest.consoleVictory,
          })
        : initializeTacticalMapSetup(crew),
    );
  }, [characters, characterStatus, dispatch, draftPlaytest, shipStatus]);

  useEffect(() => {
    const profileId = activeCombatant?.sourceCharacterId ?? activeCombatant?.id ?? null;
    if (profileId && selectedProfileCharacterId !== profileId) {
      dispatch(setSelectedProfileCharacter(profileId));
    }
  }, [
    activeCombatant?.id,
    activeCombatant?.sourceCharacterId,
    dispatch,
    selectedProfileCharacterId,
  ]);

  return null;
};
