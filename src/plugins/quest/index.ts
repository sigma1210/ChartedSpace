import type { PluginManifest } from "@/plugin-api/types";
import { questPluginId } from "./metadata";
import { questStateRegistration } from "./stateRegistration";
import type { QuestState } from "./questSlice";

export const questPlugin = {
  metadata: { id: questPluginId },
  state: questStateRegistration,
  huds: [],
  actions: [],
  handlers: [],
  effectResolvers: [],
} satisfies PluginManifest<QuestState>;

export { initialQuestState } from "./questSlice";

