"use client";

import type { TacticalEditorScenarioPropertiesDraft } from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

type TacticalEditorScenarioPropertiesDialogProps = {
  draft: TacticalEditorScenarioPropertiesDraft | null;
  error: string | null;
  onChange: (draft: TacticalEditorScenarioPropertiesDraft) => void;
  onApply: () => void;
  onClose: () => void;
};

const TacticalEditorScenarioPropertiesDialog = ({
  draft,
  error,
  onChange,
  onApply,
  onClose,
}: TacticalEditorScenarioPropertiesDialogProps) => {
  if (!draft) return null;

  return <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div role="dialog" aria-modal="true" aria-labelledby="scenario-properties-title" onKeyDown={(event) => {
      if (event.key === "Escape") onClose();
    }} className="w-full max-w-xl border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
        <div>
          <h2 id="scenario-properties-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Scenario Properties</h2>
          <div className="mt-1 text-[10px] text-slate-400">Changes are staged until Apply is selected.</div>
        </div>
        <button type="button" aria-label="Close Scenario Properties" onClick={onClose} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100">×</button>
      </div>
      <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Title
        <input autoFocus aria-label="Scenario title" value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} className="mt-1 h-9 w-full border border-slate-600 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
      </label>
      <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Briefing
        <textarea aria-label="Scenario briefing" value={draft.briefing} onChange={(event) => onChange({ ...draft, briefing: event.target.value })} rows={4} className="mt-1 w-full resize-none border border-slate-600 bg-[#071019] p-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
      </label>
      <label className="mb-3 block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Objective
        <textarea aria-label="Scenario objective" value={draft.objective} onChange={(event) => onChange({ ...draft, objective: event.target.value })} rows={3} className="mt-1 w-full resize-none border border-slate-600 bg-[#071019] p-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" />
      </label>
      <div className="border-t border-slate-700 pt-3">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200">Crew deployment edges</div>
        <div className="mb-2 text-[9px] normal-case text-slate-500">Each selected edge allows setup within six squares of that edge.</div>
        <div className="grid grid-cols-4 gap-1">
          {(["north", "east", "south", "west"] as const).map((edge) => {
            const selected = draft.deploymentEdges.includes(edge);
            return <button key={edge} type="button" aria-label={`Allow ${edge} deployment`} aria-pressed={selected} onClick={() => onChange({
              ...draft,
              deploymentEdges: selected
                ? draft.deploymentEdges.filter((item) => item !== edge)
                : [...draft.deploymentEdges, edge],
            })} className={`h-8 border text-[8px] font-bold uppercase ${selected ? "border-emerald-300 bg-emerald-300/20 text-emerald-50" : "border-slate-700 text-slate-400"}`}>{edge}</button>;
          })}
        </div>
      </div>
      {error && <div role="alert" className="mt-3 border border-red-500/70 bg-red-950/60 p-2 text-[10px] text-red-100">{error}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200">Cancel</button>
        <button type="button" onClick={onApply} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100">Apply</button>
      </div>
    </div>
  </div>;
};

export default TacticalEditorScenarioPropertiesDialog;
