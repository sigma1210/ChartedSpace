"use client";

import { KeyRound } from "lucide-react";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { questItemDefinitionUpdated } from "../questSlice";

const selectEditor = (state: RootState) => state.plugins.quest.editor;
const fieldClass = "mt-1 h-8 w-full border border-slate-700 bg-slate-950 px-2 text-[9px] normal-case text-slate-100 outline-none focus:border-cyan-500";

const QuestItemEditorHudContent = () => {
  const dispatch = useAppDispatch();
  const editor = useAppSelector(selectEditor);
  const item = editor.document.itemDefinitions.find((candidate) => candidate.id === editor.selectedQuestItemId) ?? null;

  if (!item) return <div className="pointer-events-auto p-4 font-mono text-[9px] text-slate-600">Select an item from the Quest Items list.</div>;
  return <div className="pointer-events-auto max-h-[48vh] overflow-y-auto p-3 font-mono text-[9px] text-slate-300">
    <div className="mb-3 flex items-center gap-2 border-b border-amber-900 pb-2"><KeyRound size={14} className="text-amber-200" /><div className="min-w-0"><div className="truncate font-bold uppercase text-amber-100">{item.name}</div><div className="truncate text-[8px] text-slate-600">{item.id}</div></div></div>
    <label className="block uppercase text-slate-500">Player-facing name<input value={item.name} onChange={(event) => dispatch(questItemDefinitionUpdated({ id: item.id, name: event.target.value }))} className={fieldClass} /></label>
    <label className="mt-3 block uppercase text-slate-500">Description<textarea rows={4} value={item.description} onChange={(event) => dispatch(questItemDefinitionUpdated({ id: item.id, description: event.target.value }))} className={`${fieldClass} h-auto resize-none py-2`} /></label>
    <label className="mt-3 block uppercase text-slate-500">Icon reference<input value={item.icon} onChange={(event) => dispatch(questItemDefinitionUpdated({ id: item.id, icon: event.target.value }))} placeholder="key" className={fieldClass} /></label>
    <div className="mt-3 grid grid-cols-[1fr_84px] gap-2">
      <label className="block uppercase text-slate-500">Required skill<input value={item.requiredSkill ?? ""} onChange={(event) => dispatch(questItemDefinitionUpdated({ id: item.id, requiredSkill: event.target.value || null }))} placeholder="None" className={fieldClass} /></label>
      <label className="block uppercase text-slate-500">No-skill DM<input type="number" max={0} value={item.unskilledDm} onChange={(event) => dispatch(questItemDefinitionUpdated({ id: item.id, unskilledDm: Number(event.target.value) }))} className={fieldClass} /></label>
    </div>
  </div>;
};

export default QuestItemEditorHudContent;
