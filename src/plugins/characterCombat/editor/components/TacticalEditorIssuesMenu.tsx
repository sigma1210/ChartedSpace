"use client";

import { useState } from "react";
import type { TacticalEditorIssue } from "@/plugins/characterCombat/editor/lib/tacticalEditorValidation";

const TacticalEditorIssuesMenu = ({ issues }: {
  issues: TacticalEditorIssue[];
}) => {
  const [open, setOpen] = useState(false);
  if (issues.length === 0) return null;

  const hasError = issues.some((issue) => issue.severity === "error");
  return <>
    <button
      type="button"
      aria-label="Open editor issues"
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
      className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${hasError ? "border-red-500 text-red-200" : "border-amber-500 text-amber-200"}`}
    >
      {issues.length} {issues.length === 1 ? "Issue" : "Issues"}
    </button>
    {open && <div role="dialog" aria-label="Editor issues" className="absolute right-0 top-[calc(100%+1rem)] z-[90] w-96 border border-amber-600 bg-slate-950 p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100">Editor issues</div>
        <button type="button" aria-label="Close editor issues" onClick={() => setOpen(false)} className="h-7 w-7 border border-slate-700 text-slate-300 hover:border-amber-500">×</button>
      </div>
      <div className="space-y-2">
        {issues.map((issue, index) => <div key={`${issue.severity}-${index}`} role={issue.severity === "error" ? "alert" : "status"} className={`border p-2 text-[10px] normal-case ${issue.severity === "error" ? "border-red-600/70 bg-red-950/50 text-red-100" : "border-amber-600/70 bg-amber-950/40 text-amber-100"}`}>{issue.message}</div>)}
      </div>
    </div>}
  </>;
};

export default TacticalEditorIssuesMenu;
