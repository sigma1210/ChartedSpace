import type { InternalPluginRegistration } from "@/plugin-api/types";
import reducer, { initialQuestState } from "./questSlice";
import { questPluginId, questPluginStateKey } from "./metadata";

export const questStateRegistration = {
  id: questPluginId,
  stateKey: questPluginStateKey,
  reducer,
  initialState: initialQuestState,
} satisfies InternalPluginRegistration<typeof initialQuestState> & {
  initialState: typeof initialQuestState;
};

