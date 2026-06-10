import { registeredPluginManifests } from "./catalog";

export const registeredPluginHudLayouts = registeredPluginManifests.flatMap(
  (plugin) => plugin.huds,
);
