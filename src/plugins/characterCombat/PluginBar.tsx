"use client";

import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import { HudIconButton } from "@/components/world/HudPrimitives";

export const CharacterCombatPluginBar = () => {
  const router = useRouter();

  return (
    <HudIconButton
      title="Open Character Combat"
      onClick={() => router.push("/system/tactical")}
    >
      <Swords size={13} aria-hidden="true" />
    </HudIconButton>
  );
};
