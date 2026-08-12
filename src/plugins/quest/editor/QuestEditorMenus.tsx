"use client";

import type { ReactNode } from "react";
import type { QuestEditorState, QuestFileMessage } from "../questSlice";
import { questEditorHudIds, type QuestEditorHudId, type QuestEditorHudLayouts } from "./hudLayouts";

const menuButtonClass = (open: boolean) => `h-full border-x px-4 text-[11px] font-bold uppercase tracking-wider ${open ? "border-cyan-500 bg-cyan-950/70 text-cyan-50" : "border-transparent text-slate-300 hover:border-cyan-800 hover:bg-cyan-950/30 hover:text-cyan-100"}`;
const itemClass = "h-9 w-full px-3 text-left text-[10px] font-bold uppercase tracking-wider hover:bg-cyan-950 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent";

export const QuestFileMenu = ({ open, busy, saved, dirty, onToggle, onClose, onNew, onOpen, onSave, onSaveAs, onDelete }: {
  open: boolean; busy: boolean; saved: boolean; dirty: boolean;
  onToggle: () => void; onClose: () => void; onNew: () => void; onOpen: () => void;
  onSave: () => void; onSaveAs: () => void; onDelete: () => void;
}) => <div className="relative h-full">
  <button type="button" aria-label="File menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={menuButtonClass(open)}>File</button>
  {open && <div role="menu" aria-label="File" className="absolute left-0 top-full z-50 min-w-52 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    <button type="button" role="menuitem" disabled={busy} onClick={() => { onClose(); if (!dirty || window.confirm("Create a new quest and discard unsaved changes?")) onNew(); }} className={`${itemClass} text-cyan-100`}>New Quest…</button>
    <button type="button" role="menuitem" disabled={busy} onClick={onOpen} className={`${itemClass} text-cyan-100`}>Open Quest…</button>
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={busy || !saved || !dirty} onClick={() => { onClose(); onSave(); }} className={`${itemClass} text-emerald-100`}>Save</button>
    <button type="button" role="menuitem" disabled={busy} onClick={onSaveAs} className={`${itemClass} text-emerald-100`}>Save As…</button>
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" disabled={busy || !saved} onClick={() => { onClose(); onDelete(); }} className={`${itemClass} text-red-200 hover:bg-red-950/50`}>Delete Quest…</button>
  </div>}
</div>;

export const QuestMenu = ({ open, dirty, onToggle, onClose, onEditProperties, onDiscard }: {
  open: boolean; dirty: boolean; onToggle: () => void; onClose: () => void; onEditProperties: () => void; onDiscard: () => void;
}) => <div className="relative h-full">
  <button type="button" aria-label="Quest menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={menuButtonClass(open)}>Quest</button>
  {open && <div role="menu" aria-label="Quest" className="absolute left-0 top-full z-50 min-w-56 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    <button type="button" role="menuitem" onClick={() => { onClose(); onEditProperties(); }} className={`${itemClass} text-cyan-100`}>Quest Properties…</button>
    <button type="button" role="menuitem" disabled={!dirty} onClick={() => { onClose(); if (window.confirm("Discard all unsaved quest changes?")) onDiscard(); }} className={`${itemClass} text-amber-100`}>Discard Draft Changes</button>
  </div>}
</div>;

const hudTitles: Record<QuestEditorHudId, string> = {
  tools: "Tools", "scenario-library": "Scenario Library", "quest-scenarios": "Quest Scenarios",
  "quest-items": "Quest Items",
  "quest-item-editor": "Quest Item Editor",
  inspector: "Inspector", links: "Links", navigation: "Navigation",
};

export const QuestViewMenu = ({ open, layouts, onToggle, onClose, onToggleHud, onReset }: {
  open: boolean; layouts: QuestEditorHudLayouts; onToggle: () => void; onClose: () => void;
  onToggleHud: (id: QuestEditorHudId) => void; onReset: () => void;
}) => <div className="relative h-full">
  <button type="button" aria-label="View menu" aria-haspopup="menu" aria-expanded={open} onClick={onToggle} className={menuButtonClass(open)}>View</button>
  {open && <div role="menu" aria-label="View" className="absolute left-0 top-full z-50 min-w-56 border border-cyan-700 bg-slate-950 p-1 shadow-2xl">
    {questEditorHudIds.map((id) => <button key={id} type="button" role="menuitemcheckbox" aria-checked={layouts[id].visible} onClick={() => onToggleHud(id)} className={`flex items-center gap-2 ${itemClass} text-cyan-100`}><span aria-hidden="true" className="w-3">{layouts[id].visible ? "✓" : ""}</span>{hudTitles[id]}</button>)}
    <div className="my-1 border-t border-slate-700" />
    <button type="button" role="menuitem" onClick={() => { onClose(); onReset(); }} className={`${itemClass} text-slate-300`}>Reset HUD Layout</button>
  </div>}
</div>;

const DialogFrame = ({ title, busy, onClose, children, actions }: { title: string; busy: boolean; onClose: () => void; children: ReactNode; actions: ReactNode }) => <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-6" onPointerDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
  <div role="dialog" aria-modal="true" aria-label={title} onKeyDown={(event) => { if (event.key === "Escape" && !busy) onClose(); }} className="w-full max-w-md border border-cyan-600 bg-slate-950 p-4 shadow-2xl">
    <div className="mb-4 flex items-center justify-between border-b border-cyan-900 pb-3"><h2 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">{title}</h2><button type="button" aria-label={`Close ${title}`} disabled={busy} onClick={onClose} className="h-8 w-8 border border-slate-700 text-slate-300 hover:border-cyan-500">×</button></div>
    {children}<div className="mt-4 flex justify-end gap-2">{actions}</div>
  </div>
</div>;

const messageBlock = (message: QuestFileMessage) => message && <div role={message.kind === "error" ? "alert" : "status"} className={`mt-3 border p-2 text-[10px] ${message.kind === "error" ? "border-red-500/70 bg-red-950/60 text-red-100" : "border-emerald-500/70 bg-emerald-950/50 text-emerald-100"}`}>{message.text}</div>;
const dialogButton = "h-9 border px-4 text-[9px] font-bold uppercase tracking-wider disabled:opacity-40";

export const QuestNameDialog = ({ kind, name, busy, message, onNameChange, onSubmit, onClose }: {
  kind: "new" | "save-as"; name: string; busy: boolean; message: QuestFileMessage;
  onNameChange: (name: string) => void; onSubmit: () => void; onClose: () => void;
}) => <DialogFrame title={kind === "new" ? "New Quest" : "Save Quest As"} busy={busy} onClose={onClose} actions={<><button type="button" disabled={busy} onClick={onClose} className={`${dialogButton} border-slate-600 text-slate-200`}>Cancel</button><button type="button" disabled={busy || !name.trim()} onClick={onSubmit} className={`${dialogButton} border-cyan-400 text-cyan-100`}>{busy ? "Working…" : kind === "new" ? "Create" : "Save"}</button></>}>
  <label className="block text-[9px] font-bold uppercase tracking-wider text-cyan-200">Quest name<input autoFocus aria-label="Quest name" value={name} onChange={(event) => onNameChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && name.trim() && !busy) onSubmit(); }} className="mt-1 h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-xs normal-case tracking-normal text-slate-100 outline-none focus:border-cyan-400" /></label>
  {messageBlock(message)}
</DialogFrame>;

export const QuestOpenDialog = ({ dialog, items, busy, message, onSearch, onSelect, onOpen, onClose }: {
  dialog: Extract<QuestEditorState["file"]["dialog"], { kind: "open" }>; items: { id: string; title: string }[]; busy: boolean; message: QuestFileMessage;
  onSearch: (value: string) => void; onSelect: (id: string) => void; onOpen: () => void; onClose: () => void;
}) => {
  const filtered = items.filter((item) => `${item.title} ${item.id}`.toLowerCase().includes(dialog.searchQuery.toLowerCase()));
  return <DialogFrame title="Open Quest" busy={busy} onClose={onClose} actions={<><button type="button" disabled={busy} onClick={onClose} className={`${dialogButton} border-slate-600 text-slate-200`}>Cancel</button><button type="button" disabled={busy || !dialog.selectedQuestId} onClick={onOpen} className={`${dialogButton} border-cyan-400 text-cyan-100`}>{busy ? "Opening…" : "Open"}</button></>}>
    <input autoFocus aria-label="Search quests" value={dialog.searchQuery} onChange={(event) => onSearch(event.target.value)} placeholder="Search saved quests" className="h-9 w-full border border-cyan-800 bg-[#071019] px-3 text-xs text-slate-100 outline-none" />
    <div className="mt-3 max-h-64 overflow-y-auto border border-slate-800 p-1">{filtered.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={`block h-10 w-full px-3 text-left text-[10px] ${dialog.selectedQuestId === item.id ? "bg-cyan-950 text-cyan-100" : "text-slate-300 hover:bg-slate-900"}`}>{item.title}<span className="ml-2 text-[8px] text-slate-600">{item.id}</span></button>)}{filtered.length === 0 && <div className="p-3 text-[10px] text-slate-500">No saved quests found.</div>}</div>
    {messageBlock(message)}
  </DialogFrame>;
};

export { hudTitles };
