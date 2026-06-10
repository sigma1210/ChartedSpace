import type { PluginHudLayoutRegistration } from "./types";
import { registeredPluginManifests } from "./catalog";

export const registeredPluginHudLayouts: PluginHudLayoutRegistration[] =
  registeredPluginManifests.flatMap(
    (plugin) => [...plugin.huds],
  );
