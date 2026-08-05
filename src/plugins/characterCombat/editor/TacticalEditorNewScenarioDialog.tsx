"use client";

import type { TacticalEditorFileMessage } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";

type TacticalEditorNewScenarioDialogProps = {
  open: boolean;
  name: string;
  map: { width: number; height: number };
  fileBusy: boolean;
  fileMessage: TacticalEditorFileMessage;
  onNameChange: (name: string) => void;
  onCreate: () => void | Promise<void>;
  onClose: () => void;
};

const TacticalEditorNewScenarioDialog = ({
  open,
  name,
  map,
  fileBusy,
  fileMessage,
  onNameChange,
  onCreate,
  onClose,
}: TacticalEditorNewScenarioDialogProps) => {
  if (!open) return null;

  const canCreate = Boolean(name.trim()) && map.width > 0 && map.height > 0 && !fileBusy;
  return <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => {
    if (event.target === event.currentTarget && !fileBusy) onClose();
  }}>
    <div role="dialog" aria-modal="true" aria-labelledby="new-scenario-title" onKeyDown={(event) => {
      if (event.key === "Escape" && !fileBusy) onClose();
    }} className="w-full max-w-md border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-cyan-900 pb-3">
        <div>
          <h2 id="new-scenario-title" className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">New Scenario</h2>
          <div className="mt-1 text-[10px] text-slate-400">Create an empty {map.width} × {map.height} scenario with the current drawing precision.</div>
        </div>
        <button type="button" aria-label="Close New Scenario" disabled={fileBusy} onClick={onClose} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-cyan-100 disabled:opacity-40">×</button>
      </div>
      <label className="block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Scenario name
        <input autoFocus aria-label="New scenario name" value={name} onChange={(event) => onNameChange(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && canCreate) {
            void onCreate();
            event.preventDefault();
          }
        }} placeholder="Boarding action" className="mt-1 h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400" />
      </label>
      {fileMessage && <div role={fileMessage.kind === "error" ? "alert" : "status"} className={`mt-3 border p-2 text-[10px] ${fileMessage.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{fileMessage.text}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" disabled={fileBusy} onClick={onClose} className="h-9 border border-slate-600 px-4 text-[9px] font-bold uppercase tracking-wider text-slate-200 disabled:opacity-40">Cancel</button>
        <button type="button" disabled={!canCreate} onClick={() => void onCreate()} className="h-9 border border-cyan-400 px-4 text-[9px] font-bold uppercase tracking-wider text-cyan-100 disabled:opacity-40">{fileBusy ? "Creating…" : "Create"}</button>
      </div>
    </div>
  </div>;
};

export default TacticalEditorNewScenarioDialog;
