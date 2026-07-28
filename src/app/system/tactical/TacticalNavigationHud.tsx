"use client";

import Link from "next/link";
import {
  FloatingPluginHud,
  type FloatingPluginHudLayout,
} from "@/components/hud/FloatingPluginHud";

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
}) => (
  <FloatingPluginHud
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
        <Link
          href="/system/tactical"
          className="border border-cyan-400/70 px-3 py-2 text-center font-bold text-cyan-100 hover:bg-cyan-950"
        >
          Return to tactical map
        </Link>
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
  </FloatingPluginHud>
);
