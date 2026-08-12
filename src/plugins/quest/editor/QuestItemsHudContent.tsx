"use client";

import { KeyRound, Plus, Trash2 } from "lucide-react";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { questHudVisibilityToggled, questItemDefinitionAdded, questItemDefinitionRemoved, questItemDefinitionSelected } from "../questSlice";

const selectEditor = (state: RootState) => state.plugins.quest.editor;

const QuestItemsHudContent = () => {
  const dispatch = useAppDispatch();
  const editor = useAppSelector(selectEditor);
  const referenceCount = (itemId: string) => editor.document.scenarioInstances.reduce((total, scenario) => total + scenario.nodes.reduce((nodeTotal, node) => node.kind !== "entity" ? nodeTotal : nodeTotal + node.chains.reduce((chainTotal, chain) => chainTotal + chain.itemRequirements.filter((entry) => entry.itemDefinitionId === itemId).length + chain.successRewards.filter((entry) => entry.itemDefinitionId === itemId).length, 0), 0), 0);

  const selectItem = (itemId: string) => {
    dispatch(questItemDefinitionSelected(itemId));
    if (!editor.hudLayouts["quest-item-editor"].visible) dispatch(questHudVisibilityToggled("quest-item-editor"));
  };

  return <div className="pointer-events-auto max-h-[48vh] overflow-y-auto p-2 font-mono text-[9px] text-slate-300">
    <button type="button" onClick={() => { dispatch(questItemDefinitionAdded()); if (!editor.hudLayouts["quest-item-editor"].visible) dispatch(questHudVisibilityToggled("quest-item-editor")); }} className="mb-2 flex h-8 w-full items-center justify-center gap-1 border border-cyan-600 uppercase text-cyan-100 hover:bg-cyan-950/50"><Plus size={10} /> New Quest Item</button>
    <div className="grid gap-1">
      {editor.document.itemDefinitions.map((item) => {
        const references = referenceCount(item.id);
        const selected = editor.selectedQuestItemId === item.id;
        return <div key={item.id} className={`flex items-center gap-2 border px-2 py-2 ${selected ? "border-amber-300 bg-amber-950/30" : "border-slate-800 bg-slate-950/70 hover:border-slate-600"}`}>
          <button type="button" onClick={() => selectItem(item.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <KeyRound size={12} className="shrink-0 text-amber-200" />
            <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-100">{item.name}</span><span className="block truncate text-[8px] text-slate-600">{item.id}</span></span>
            <span title="Chain references" className="shrink-0 border border-slate-700 px-1 text-[8px] text-slate-400">{references}</span>
          </button>
          <button type="button" aria-label={`Delete ${item.name}`} onClick={() => {
            if (references > 0 && !window.confirm(`${item.name} is used by ${references} chain requirement or reward entries. Delete it and remove those references?`)) return;
            dispatch(questItemDefinitionRemoved(item.id));
          }} className="shrink-0 text-slate-500 hover:text-red-300"><Trash2 size={11} /></button>
        </div>;
      })}
      {editor.document.itemDefinitions.length === 0 && <div className="border border-dashed border-slate-800 p-3 text-slate-600">No quest items defined.</div>}
    </div>
  </div>;
};

export default QuestItemsHudContent;
