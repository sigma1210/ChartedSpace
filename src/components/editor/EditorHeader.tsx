"use client";

import type { ReactNode } from "react";

export type EditorHeaderMessage = { kind: "error" | "success"; text: string } | null;

type EditorHeaderProps = {
  title: string;
  detail: string;
  message?: EditorHeaderMessage;
  dialogOpen?: boolean;
  dirty: boolean;
  menuLabel: string;
  menus: ReactNode;
  actions?: ReactNode;
};

const EditorHeader = ({
  title,
  detail,
  message = null,
  dialogOpen = false,
  dirty,
  menuLabel,
  menus,
  actions,
}: EditorHeaderProps) => <header className="relative flex h-16 shrink-0 items-center justify-between gap-4 border-b border-cyan-800 bg-slate-950 px-4">
  <div className="flex min-w-0 items-center gap-6">
    <div className="min-w-0">
      <div className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-100">{title}</div>
      <div className="mt-1 max-w-[34rem] truncate text-[10px] uppercase tracking-wider text-slate-500">{detail}</div>
    </div>
    <nav aria-label={menuLabel} className="flex self-stretch">
      {menus}
    </nav>
  </div>
  <div className="relative flex shrink-0 items-center gap-2">
    {message && !dialogOpen && <span role={message.kind === "error" ? "alert" : "status"} className={`max-w-96 truncate text-[10px] ${message.kind === "error" ? "text-red-300" : "text-emerald-300"}`}>{message.text}</span>}
    {actions}
    <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${dirty ? "border-amber-400 text-amber-200" : "border-slate-600 text-slate-400"}`}>{dirty ? "Unsaved draft" : "Unchanged"}</span>
  </div>
</header>;

export default EditorHeader;
