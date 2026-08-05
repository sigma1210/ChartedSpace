"use client";

import { useTacticalEditorViewport } from "@/plugins/characterCombat/editor/TacticalEditorViewport";

const TacticalEditorDrawingPrecisionControl = () => {
  const editorViewport = useTacticalEditorViewport();
  if (!editorViewport) {
    throw new Error("Drawing precision requires an editor viewport provider.");
  }

  return <label className="block font-bold text-cyan-200">Precision
    <select
      aria-label="Drawing precision"
      value={editorViewport.snapMode}
      onChange={(event) => editorViewport.setSnapMode(
        event.target.value as typeof editorViewport.snapMode,
      )}
      className="mt-1 h-8 w-full border border-cyan-700 bg-slate-950 px-2 text-[9px] normal-case tracking-normal text-cyan-50"
    >
      <option value="grid">Grid · 1 square</option>
      <option value="half-grid">Half grid · 0.5</option>
      <option value="quarter-grid">Quarter grid · 0.25</option>
      <option value="freeform">Freeform</option>
    </select>
  </label>;
};

export default TacticalEditorDrawingPrecisionControl;
