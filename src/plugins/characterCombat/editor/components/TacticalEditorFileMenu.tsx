"use client";

type TacticalEditorFileMenuProps = {
  open: boolean;
  fileBusy: boolean;
  mapValid: boolean;
  currentScenarioIsDefault: boolean;
  dirty: boolean;
  draftBlocked: boolean;
  draftBlockedReason: string | null;
  onToggle: () => void;
  onClose: () => void;
  onNewScenario: () => void;
  onOpenScenario: () => void;
  onSave: () => void | Promise<void>;
  onSaveAs: () => void;
  onDelete: () => void | Promise<void>;
};

const TacticalEditorFileMenu = ({
  open,
  fileBusy,
  mapValid,
  currentScenarioIsDefault,
  dirty,
  draftBlocked,
  draftBlockedReason,
  onToggle,
  onClose,
  onNewScenario,
  onOpenScenario,
  onSave,
  onSaveAs,
  onDelete,
}: TacticalEditorFileMenuProps) => <div className="relative h-full">
  <button type="button" aria-label="File menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={`h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${open ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`}>File</button>
  {open && <div role="menu" aria-label="File" className="absolute left-0 top-full z-50 min-w-52 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    <button type="button" role="menuitem" disabled={fileBusy || !mapValid} onClick={() => {
      onClose();
      if (dirty && !window.confirm("Create a new scenario and discard the unsaved changes in this draft?")) return;
      onNewScenario();
    }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">New Scenario…</button>
    <button type="button" role="menuitem" onClick={onOpenScenario} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:bg-cyan-950">Open Scenario…</button>
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={fileBusy || currentScenarioIsDefault || !dirty || draftBlocked} onClick={() => {
      onClose();
      void onSave();
    }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Save</button>
    <button type="button" role="menuitem" disabled={fileBusy || draftBlocked} onClick={onSaveAs} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Save As…</button>
    {draftBlocked && <div role="alert" className="mx-2 mb-1 border border-red-700/80 bg-red-950/60 p-2 text-[9px] normal-case leading-4 text-red-100">
      <div className="font-bold uppercase tracking-wider">Save unavailable</div>
      <div className="mt-1">{draftBlockedReason ?? "Resolve the scenario validation error shown in the editor."}</div>
    </div>}
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={fileBusy || currentScenarioIsDefault} onClick={() => {
      onClose();
      void onDelete();
    }} className="h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider text-red-200 hover:bg-red-950/50 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent">Delete Scenario…</button>
  </div>}
</div>;

export default TacticalEditorFileMenu;
