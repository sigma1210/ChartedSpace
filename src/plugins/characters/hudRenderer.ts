import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { User, Users } from "lucide-react";
import { CharacterListHudContent } from "./CharacterListHud";
import { CharacterProfileHudContent } from "./CharacterProfileHud";
import { CharactersPluginBar } from "./CharactersPluginBar";
import {
  characterActionsHudId,
  characterListHudId,
  characterProfileHudId,
} from "./metadata";

export const characterActionsHudRenderer = {
  id: characterActionsHudId,
  Icon: Users,
  Component: CharactersPluginBar,
} satisfies PluginHudRendererRegistration;

export const characterProfileHudRenderer = {
  id: characterProfileHudId,
  Icon: User,
  Component: CharacterProfileHudContent,
} satisfies PluginHudRendererRegistration;

export const characterListHudRenderer = {
  id: characterListHudId,
  Icon: Users,
  Component: CharacterListHudContent,
} satisfies PluginHudRendererRegistration;

export const characterHudRenderers = [
  characterActionsHudRenderer,
  characterProfileHudRenderer,
  characterListHudRenderer,
] as const;
