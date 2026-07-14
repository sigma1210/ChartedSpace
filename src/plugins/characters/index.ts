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
  characterAvatarCustomizeHudId,
  characterListHudId,
  characterProfessionalBoardHudId,
  characterProfileHudId,
  charactersPluginId,
  charactersStateKey,
  selectedCharacterProfileHudId,
} from "./metadata";
export {
  fetchCharacters,
  initialCharactersState,
  invalidateCharacters,
  refreshCharacters,
  setSelectedProfileCharacter,
  updateCharacterInList,
  type CharacterState,
  type CharacterSummary,
} from "./charactersSlice";
export {
  selectCharacters,
  selectCharactersStatus,
  selectCurrentCharacter,
  selectCurrentCharacterProfileLocation,
  selectEffectiveCharacterProfile,
  selectEffectiveCharacterProfileLocation,
  selectFallbackCharacter,
  selectOwnerOperatorCharacter,
  selectOwnerOperatorCredits,
  selectSelectedCharacterProfileLocation,
  selectSelectedProfileCharacter,
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
