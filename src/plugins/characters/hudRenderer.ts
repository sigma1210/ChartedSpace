import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { BriefcaseBusiness, User, Users } from "lucide-react";
import { CharacterListHudContent } from "./CharacterListHud";
import { CharacterProfessionalBoardHudContent } from "./CharacterProfessionalBoardHud";
import { CharacterProfileHudContent } from "./CharacterProfileHud";
import { CharactersPluginBar } from "./CharactersPluginBar";
import {
  characterActionsHudId,
  characterListHudId,
  characterProfessionalBoardHudId,
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

export const characterProfessionalBoardHudRenderer = {
  id: characterProfessionalBoardHudId,
  Icon: BriefcaseBusiness,
  Component: CharacterProfessionalBoardHudContent,
} satisfies PluginHudRendererRegistration;

export const characterHudRenderers = [
  characterActionsHudRenderer,
  characterProfileHudRenderer,
  characterListHudRenderer,
  characterProfessionalBoardHudRenderer,
] as const;
