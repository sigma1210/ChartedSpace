"use client";

import type {
  TacticalEditorFileMessage,
  TacticalEditorScenarioSummary,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

type TacticalEditorOpenScenarioDialogProps = {
  open: boolean;
  fileBusy: boolean;
  scenarioListBusy: boolean;
  fileMessage: TacticalEditorFileMessage;
  currentScenarioId: string;
  availableScenarios: TacticalEditorScenarioSummary[];
  filteredScenarios: TacticalEditorScenarioSummary[];
  searchQuery: string;
  selectedScenarioId: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectScenario: (id: string) => void;
  onLoadScenario: (id?: string) => void | Promise<void>;
};

const TacticalEditorOpenScenarioDialog = ({
  open,
  fileBusy,
  scenarioListBusy,
  fileMessage,
  currentScenarioId,
  availableScenarios,
  filteredScenarios,
  searchQuery,
  selectedScenarioId,
  onClose,
  onSearchChange,
  onSelectScenario,
  onLoadScenario,
}: TacticalEditorOpenScenarioDialogProps) => {
  if (!open) return null;

  return <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
    if (event.target === event.currentTarget && !fileBusy) onClose();
  }}>
    <div role="dialog" aria-modal="true" aria-labelledby="open-scenario-title" tabIndex={-1} onKeyDown={(event) => {
      if (event.key === "Escape" && !fileBusy) onClose();
    }} className="w-full max-w-xl border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
        <div>
          <h2 id="open-scenario-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">Open Scenario</h2>
          <div className="mt-1 text-[10px] text-slate-400">Choose a saved scenario or the immutable default.</div>
        </div>
        <button type="button" aria-label="Close Open Scenario" disabled={fileBusy} onClick={onClose} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100 disabled:opacity-40">×</button>
      </div>
      <div className="mb-3 flex gap-2">
        <label className="min-w-0 flex-1 text-[9px] font-bold uppercase tracking-wider text-cyan-200">Search scenarios
          <input
            autoFocus
            aria-label="Search scenarios"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                if (filteredScenarios.length === 0) return;
                const selectedIndex = filteredScenarios.findIndex(
                  (scenario) => scenario.id === selectedScenarioId,
                );
                const nextIndex = event.key === "ArrowDown"
                  ? Math.min(filteredScenarios.length - 1, Math.max(0, selectedIndex + 1))
                  : Math.max(0, selectedIndex < 0 ? 0 : selectedIndex - 1);
                onSelectScenario(filteredScenarios[nextIndex].id);
                event.preventDefault();
              } else if (
                event.key === "Enter"
                && selectedScenarioId
                && filteredScenarios.some((scenario) => scenario.id === selectedScenarioId)
              ) {
                void onLoadScenario();
                event.preventDefault();
              }
            }}
            placeholder="Title or file ID"
            className="mt-1 h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-[11px] normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
          />
        </label>
        <button type="button" aria-label="Clear scenario search" disabled={!searchQuery || fileBusy} onClick={() => onSearchChange("")} className="mt-[1.15rem] h-9 border border-slate-700 px-3 text-[9px] font-bold uppercase tracking-wider text-slate-300 hover:border-cyan-600 hover:text-cyan-100 disabled:opacity-35">Clear</button>
      </div>
      <div role="listbox" aria-label="Available scenarios" className="max-h-[50vh] space-y-1 overflow-y-auto border border-slate-800 bg-[#071019] p-2">
        {scenarioListBusy && <div className="p-4 text-center text-[10px] uppercase tracking-wider text-slate-400">Loading scenarios…</div>}
        {!scenarioListBusy && availableScenarios.length === 0 && <div className="p-4 text-center text-[10px] text-slate-400">No scenarios are available.</div>}
        {!scenarioListBusy && availableScenarios.length > 0 && filteredScenarios.length === 0 && <div className="p-4 text-center text-[10px] text-slate-400">No matching scenarios.</div>}
        {!scenarioListBusy && filteredScenarios.map((scenario) => {
          const selected = scenario.id === selectedScenarioId;
          const current = scenario.id === currentScenarioId;
          return <button
            key={scenario.id}
            type="button"
            role="option"
            aria-label={`${scenario.title} · ${scenario.id}`}
            aria-selected={selected}
            disabled={fileBusy}
            onClick={() => onSelectScenario(scenario.id)}
            onDoubleClick={() => void onLoadScenario(scenario.id)}
            className={`flex min-h-14 w-full items-center justify-between gap-4 border px-3 py-2 text-left ${selected ? "border-cyan-300 bg-cyan-950/70" : "border-slate-700 bg-slate-950 hover:border-cyan-700"}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold text-slate-100">{scenario.title}</span>
              <span className="mt-1 block truncate text-[9px] text-slate-500">{scenario.id}</span>
            </span>
            <span className="flex shrink-0 gap-1 text-[8px] font-bold uppercase tracking-wider">
              {scenario.isDefault && <span className="border border-amber-600 px-1.5 py-1 text-amber-200">Default</span>}
              {!scenario.isDefault && <span className="border border-slate-600 px-1.5 py-1 text-slate-300">Saved</span>}
              {current && <span className="border border-cyan-500 px-1.5 py-1 text-cyan-200">Current</span>}
            </span>
          </button>;
        })}
      </div>
      {fileMessage?.kind === "error" && <div role="alert" className="mt-3 border border-red-600 bg-red-950/50 p-2 text-[10px] text-red-100">{fileMessage.text}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" disabled={fileBusy} onClick={onClose} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:opacity-40">Cancel</button>
        <button type="button" disabled={fileBusy || scenarioListBusy || !selectedScenarioId} onClick={() => void onLoadScenario()} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">{fileBusy ? "Opening…" : "Open"}</button>
      </div>
    </div>
  </div>;
};

export default TacticalEditorOpenScenarioDialog;
