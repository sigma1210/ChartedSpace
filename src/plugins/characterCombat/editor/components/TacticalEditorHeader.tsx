"use client";

import type { ReactNode } from "react";
import type {
  TacticalEditorFileMessage,
  TacticalEditorScenarioSummary,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import type { TacticalEditorIssue } from "@/plugins/characterCombat/editor/lib/tacticalEditorValidation";
import TacticalEditorIssuesMenu from "@/plugins/characterCombat/editor/components/TacticalEditorIssuesMenu";

type TacticalEditorHeaderProps = {
  currentScenario: TacticalEditorScenarioSummary;
  fileMessage: TacticalEditorFileMessage;
  fileDialogOpen: boolean;
  issues: TacticalEditorIssue[];
  dirty: boolean;
  children: ReactNode;
};

const TacticalEditorHeader = ({
  currentScenario,
  fileMessage,
  fileDialogOpen,
  issues,
  dirty,
  children,
}: TacticalEditorHeaderProps) => <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 border-b border-cyan-800 bg-slate-950 px-4">
  <div className="flex items-center gap-6">
    <div>
      <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">Scenario Editor</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{currentScenario.title} · {currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft</div>
    </div>
    <nav aria-label="Scenario editor menu bar" className="flex self-stretch">
      {children}
    </nav>
  </div>
  <div className="relative flex items-center gap-2">
    {fileMessage && !fileDialogOpen && <span role={fileMessage.kind === "error" ? "alert" : "status"} className={`max-w-96 truncate text-[10px] ${fileMessage.kind === "error" ? "text-red-300" : "text-emerald-300"}`}>{fileMessage.text}</span>}
    <TacticalEditorIssuesMenu issues={issues} />
    <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${dirty ? "border-amber-400 text-amber-200" : "border-slate-600 text-slate-400"}`}>{dirty ? "Unsaved draft" : "Unchanged"}</span>
  </div>
</header>;

export default TacticalEditorHeader;
