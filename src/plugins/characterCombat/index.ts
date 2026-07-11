import type { PluginManifest } from "@/plugin-api/types";
import { characterCombatHudMetadata } from "./hudMetadata";
import { characterCombatPluginId } from "./metadata";
import { characterCombatStateRegistration } from "./stateRegistration";
import type { CharacterCombatState } from "./types";
export const characterCombatPlugin = { metadata: { id: characterCombatPluginId }, state: characterCombatStateRegistration, huds: characterCombatHudMetadata, actions: [], handlers: [], effectResolvers: [] } satisfies PluginManifest<CharacterCombatState>;
export { initialCharacterCombatState, loadCombatScenario } from "./slice";
