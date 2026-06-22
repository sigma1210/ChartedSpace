import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { User, Users, UserPlus } from "lucide-react";
import { CharacterCreateHudContent } from "./CharacterCreateHud";
import { CharacterListHudContent } from "./CharacterListHud";
import { CharacterProfileHudContent } from "./CharacterProfileHud";
import { CharactersPluginBar } from "./CharactersPluginBar";
import {
  characterActionsHudId,
  characterCreateHudId,
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

export const characterCreateHudRenderer = {
  id: characterCreateHudId,
  Icon: UserPlus,
  Component: CharacterCreateHudContent,
} satisfies PluginHudRendererRegistration;

export const characterHudRenderers = [
  characterActionsHudRenderer,
  characterProfileHudRenderer,
  characterListHudRenderer,
  characterCreateHudRenderer,
] as const;
