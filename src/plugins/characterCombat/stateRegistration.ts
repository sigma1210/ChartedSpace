import type { InternalPluginRegistration } from "@/plugin-api/types";
import reducer, { initialCharacterCombatState } from "./slice";
import { characterCombatPluginId, characterCombatPluginStateKey } from "./metadata";
export const characterCombatStateRegistration = { id: characterCombatPluginId, stateKey: characterCombatPluginStateKey, reducer, initialState: initialCharacterCombatState } satisfies InternalPluginRegistration<typeof initialCharacterCombatState> & { initialState: typeof initialCharacterCombatState };
