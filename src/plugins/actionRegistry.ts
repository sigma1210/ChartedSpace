import { registeredPluginManifests } from "./catalog";
import type { PluginActionRegistration } from "./types";

export const registeredPluginActions: PluginActionRegistration[] =
  registeredPluginManifests.flatMap(
    (plugin) => [...plugin.actions] as PluginActionRegistration[],
  );
