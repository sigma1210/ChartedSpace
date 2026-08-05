"use client";

import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { TacticalEditorLayersPanel } from "@/plugins/characterCombat/editor/TacticalEditorLayersPanel";
import type {
  TacticalEditorLayerGroup,
  TacticalEditorLayerObject,
} from "@/plugins/characterCombat/editor/tacticalEditorLayers";
import type { TacticalEditorHudLayout } from "@/plugins/characterCombat/editor/state/hudLayouts";

type TacticalEditorLayersHudProps = {
  layout: TacticalEditorHudLayout;
  onLayoutChange: (layout: TacticalEditorHudLayout) => void;
  groups: TacticalEditorLayerGroup[];
  selectedKey: string | null;
  hiddenKeys: ReadonlySet<string>;
  lockedKeys: ReadonlySet<string>;
  onSelect: (object: TacticalEditorLayerObject) => void;
  onToggleHidden: (object: TacticalEditorLayerObject) => void;
  onToggleLocked: (object: TacticalEditorLayerObject) => void;
  onMove: (object: TacticalEditorLayerObject, direction: -1 | 1) => void;
};

const TacticalEditorLayersHud = ({
  layout,
  onLayoutChange,
  groups,
  selectedKey,
  hiddenKeys,
  lockedKeys,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onMove,
}: TacticalEditorLayersHudProps) => <FloatingPluginHud
  title="Layers"
  layout={layout}
  onLayoutChange={onLayoutChange}
  className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
>
  <TacticalEditorLayersPanel
    groups={groups}
    selectedKey={selectedKey}
    hiddenKeys={hiddenKeys}
    lockedKeys={lockedKeys}
    onSelect={onSelect}
    onToggleHidden={onToggleHidden}
    onToggleLocked={onToggleLocked}
    onMove={onMove}
  />
</FloatingPluginHud>;

export default TacticalEditorLayersHud;
