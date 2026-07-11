import { Swords } from "lucide-react";
import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { CharacterCombatPluginBar } from "./PluginBar";
import { characterCombatHudId } from "./metadata";
export const characterCombatHudRenderer = { id: characterCombatHudId, Icon: Swords, Component: CharacterCombatPluginBar } satisfies PluginHudRendererRegistration;
