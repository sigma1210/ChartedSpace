import type { InternalPluginRegistration } from "@/plugin-api/types";
import { charactersPluginId, charactersStateKey } from "./metadata";
import charactersReducer, { type CharacterState } from "./charactersSlice";

export const charactersStateRegistration = {
  id: charactersPluginId,
  stateKey: charactersStateKey,
  reducer: charactersReducer,
} satisfies InternalPluginRegistration<CharacterState>;
