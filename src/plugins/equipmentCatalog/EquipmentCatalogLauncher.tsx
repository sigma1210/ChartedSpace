"use client";

import { ShoppingBag } from "lucide-react";
import { HudIconButton } from "@/components/world/HudPrimitives";
import { useAppDispatch } from "@/store/hooks";
import { openModal } from "@/store/slices/uiSlice";

export const EquipmentCatalogLauncher = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="flex items-center gap-1">
      <HudIconButton
        title="Open equipment catalog"
        onClick={() => dispatch(openModal("equipmentCatalog"))}
      >
        <ShoppingBag size={13} aria-hidden="true" />
      </HudIconButton>
      <span className="font-mono text-[7px] uppercase tracking-wider text-(--hud-text-dim)">
        Catalog
      </span>
    </div>
  );
};
