import type { PluginHudRendererRegistration } from "@/plugin-api/types";
import { BriefcaseBusiness, Palette, User, Users } from "lucide-react";
import { CharacterAvatarCustomizeHudContent } from "./CharacterAvatarCustomizeHud";
import { CharacterListHudContent } from "./CharacterListHud";
import { CharacterProfessionalBoardHudContent } from "./CharacterProfessionalBoardHud";
import {
  CurrentCharacterProfileHudContent,
  SelectedCharacterProfileHudContent,
} from "./CharacterProfileHud";
import { CharactersPluginBar } from "./CharactersPluginBar";
import {
  characterActionsHudId,
  characterAvatarCustomizeHudId,
  characterListHudId,
  characterProfessionalBoardHudId,
  characterProfileHudId,
  selectedCharacterProfileHudId,
} from "./metadata";

export const characterActionsHudRenderer = {
  id: characterActionsHudId,
  Icon: Users,
  Component: CharactersPluginBar,
} satisfies PluginHudRendererRegistration;

export const characterProfileHudRenderer = {
  id: characterProfileHudId,
  Icon: User,
  Component: CurrentCharacterProfileHudContent,
} satisfies PluginHudRendererRegistration;

export const selectedCharacterProfileHudRenderer = {
  id: selectedCharacterProfileHudId,
  Icon: User,
  Component: SelectedCharacterProfileHudContent,
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

export const characterAvatarCustomizeHudRenderer = {
  id: characterAvatarCustomizeHudId,
  Icon: Palette,
  Component: CharacterAvatarCustomizeHudContent,
} satisfies PluginHudRendererRegistration;

export const characterHudRenderers = [
  characterActionsHudRenderer,
  characterProfileHudRenderer,
  selectedCharacterProfileHudRenderer,
  characterListHudRenderer,
  characterProfessionalBoardHudRenderer,
  characterAvatarCustomizeHudRenderer,
] as const;
