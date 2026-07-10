"use client";

import { Radar } from "lucide-react";
import { HudIconButton } from "@/components/world/HudPrimitives";
import { useAppDispatch } from "@/store/hooks";
import { openModal } from "@/store/slices/uiSlice";

export const MaydayPluginBar = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="flex items-center gap-1">
      <HudIconButton
        title="Open Mayday"
        onClick={() => dispatch(openModal("mayday"))}
      >
        <Radar size={13} aria-hidden="true" />
      </HudIconButton>
    </div>
  );
};
