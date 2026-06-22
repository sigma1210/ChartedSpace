import type { PluginManifest } from "@/plugin-api/types";
import { characterHudMetadata } from "./hudMetadata";
import { charactersPluginId } from "./metadata";
import { charactersStateRegistration } from "./stateRegistration";
import type { CharacterState } from "./charactersSlice";

export const charactersPlugin = {
  metadata: {
    id: charactersPluginId,
  },
  state: charactersStateRegistration,
  huds: characterHudMetadata,
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<CharacterState>;

export {
  characterActionsHudId,
  characterCreateHudId,
  characterListHudId,
  characterProfileHudId,
  charactersPluginId,
  charactersStateKey,
} from "./metadata";
export {
  fetchCharacters,
  initialCharactersState,
  invalidateCharacters,
  updateCharacterInList,
  type CharacterState,
  type CharacterSummary,
} from "./charactersSlice";
export {
  selectCharacters,
  selectCharactersStatus,
  selectCurrentCharacter,
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  selectFallbackCharacter,
  selectOwnerOperatorCharacter,
  selectOwnerOperatorCredits,
  type CharacterProfileLocation,
} from "./selectors";
export {
  classicTravellerGenerator,
  classicTravellerGeneratorId,
  getCharacterGenerator,
  registeredCharacterGenerators,
  type CharacterGenerationLogEvent,
  type CharacterGenerationRunResult,
  type CharacterGenerationStep,
  type CharacterGeneratorContext,
  type CharacterGeneratorPlugin,
} from "./generation";
