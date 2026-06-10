import { registeredPluginManifests } from "./catalog";

export const registeredPluginActions = registeredPluginManifests.flatMap(
  (plugin) => plugin.actions,
);
