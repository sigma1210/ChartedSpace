"use client";
import { Swords } from "lucide-react";
import { HudIconButton } from "@/components/world/HudPrimitives";
import { useAppDispatch } from "@/store/hooks";
import { openModal } from "@/store/slices/uiSlice";
export const CharacterCombatPluginBar = () => { const dispatch = useAppDispatch(); return <HudIconButton title="Open Character Combat" onClick={() => dispatch(openModal("characterCombat"))}><Swords size={13} aria-hidden="true" /></HudIconButton>; };
