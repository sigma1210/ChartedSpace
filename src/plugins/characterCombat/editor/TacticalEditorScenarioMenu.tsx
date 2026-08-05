"use client";

import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalEditorScenarioPropertiesDraft } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";

type TacticalEditorScenarioMenuProps = {
  open: boolean;
  draft: TacticalScenarioDefinitionFile;
  canBeginPlaytest: boolean;
  dirty: boolean;
  onToggle: () => void;
  onClose: () => void;
  onOpenProperties: (draft: TacticalEditorScenarioPropertiesDraft) => void;
  onBeginPlaytest: () => void;
  onDiscardDraft: () => void;
};

const TacticalEditorScenarioMenu = ({
  open,
  draft,
  canBeginPlaytest,
  dirty,
  onToggle,
  onClose,
  onOpenProperties,
  onBeginPlaytest,
  onDiscardDraft,
}: TacticalEditorScenarioMenuProps) => <div className="relative h-full">
  <button type="button" aria-label="Scenario menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={`h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${open ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`}>Scenario</button>
  {open && <div role="menu" aria-label="Scenario" className="absolute left-0 top-full z-50 min-w-60 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    <button type="button" role="menuitem" onClick={() => onOpenProperties({
      title: draft.title,
      briefing: draft.briefing,
      objective: draft.objective,
      deploymentEdges: [...(draft.deploymentEdges ?? ["south"])],
    })} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">Scenario Properties…</button>
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={!canBeginPlaytest} onClick={() => {
      onClose();
      onBeginPlaytest();
    }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Playtest Draft</button>
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={!dirty} onClick={() => {
      onClose();
      onDiscardDraft();
    }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-amber-100 hover:bg-amber-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Discard Draft Changes…</button>
  </div>}
</div>;

export default TacticalEditorScenarioMenu;
