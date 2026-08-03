"use client";

import Link from "next/link";
import {
  FloatingPluginHud,
  type FloatingPluginHudLayout,
} from "@/components/hud/FloatingPluginHud";
import { useTacticalEditorViewport } from "@/plugins/characterCombat/editor/TacticalEditorViewport";

type TacticalNavigationMode = "tactical" | "editor" | "playtest";

export const TacticalNavigationHud = ({
  layout,
  mode,
  onLayoutChange,
  onReturnToEditor,
}: {
  layout: FloatingPluginHudLayout;
  mode: TacticalNavigationMode;
  onLayoutChange: (layout: FloatingPluginHudLayout) => void;
  onReturnToEditor?: () => void;
}) => {
  const editorViewport = useTacticalEditorViewport();
  return <FloatingPluginHud
    title="Navigation"
    layout={layout}
    onLayoutChange={onLayoutChange}
    className="w-48 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
  >
    <div className="grid gap-2 py-1">
      {mode === "playtest" && (
        <button
          type="button"
          onClick={onReturnToEditor}
          className="border border-amber-300/70 px-3 py-2 font-bold text-amber-100 hover:bg-amber-950"
        >
          Return to editor
        </button>
      )}
      {mode === "editor" && (
        <>
          {editorViewport && <div className="grid grid-cols-2 gap-1 border-b border-cyan-900 pb-2">
            <button type="button" onClick={editorViewport.zoomIn} className="border border-cyan-500/70 px-2 py-2 font-bold text-cyan-100 hover:bg-cyan-950">Zoom in</button>
            <button type="button" onClick={editorViewport.zoomOut} className="border border-cyan-500/70 px-2 py-2 font-bold text-cyan-100 hover:bg-cyan-950">Zoom out</button>
            <button type="button" onClick={editorViewport.fitMap} className="border border-cyan-500/70 px-2 py-2 font-bold text-cyan-100 hover:bg-cyan-950">Fit map</button>
            <button type="button" onClick={editorViewport.resetView} className="border border-cyan-500/70 px-2 py-2 font-bold text-cyan-100 hover:bg-cyan-950">Reset view</button>
            <div className="col-span-2 text-center text-cyan-200" aria-label="Editor map zoom">{editorViewport.zoomPercent}%</div>
            <div className="col-span-2 normal-case text-(--hud-text-dim)">Wheel to zoom · middle-drag or Space + drag to pan</div>
          </div>}
          <Link
            href="/system/tactical"
            className="border border-cyan-400/70 px-3 py-2 text-center font-bold text-cyan-100 hover:bg-cyan-950"
          >
            Return to tactical map
          </Link>
        </>
      )}
      {mode === "tactical" && (
        <>
          <Link
            href="/system"
            className="border border-cyan-400/70 px-3 py-2 text-center font-bold text-cyan-100 hover:bg-cyan-950"
          >
            System view
          </Link>
          <Link
            href="/system/tactical/editor"
            className="border border-amber-300/70 px-3 py-2 text-center font-bold text-amber-100 hover:bg-amber-950"
          >
            Scenario editor
          </Link>
        </>
      )}
    </div>
  </FloatingPluginHud>;
};
