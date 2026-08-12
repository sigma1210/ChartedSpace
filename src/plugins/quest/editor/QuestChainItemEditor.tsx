"use client";

import { Plus, Trash2 } from "lucide-react";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  chainItemRequirementAdded, chainItemRequirementRemoved, chainItemRequirementUpdated,
  chainItemRewardAdded, chainItemRewardRemoved, chainItemRewardUpdated,
} from "../questSlice";
import { QUEST_ITEM_CONSUMPTION_TRIGGERS, type QuestItemRewardRecipient } from "./types";

const selectEditor = (state: RootState) => state.plugins.quest.editor;
const fieldClass = "h-7 border border-slate-700 bg-slate-950 px-1 text-[8px] text-slate-100 outline-none focus:border-cyan-500";

const QuestChainItemEditor = () => {
  const dispatch = useAppDispatch();
  const editor = useAppSelector(selectEditor);
  const scenario = editor.document.scenarioInstances.find((item) => item.id === editor.activeScenarioInstanceId);
  const node = scenario?.nodes.find((item) => item.id === editor.selection.nodeId);
  const chain = node?.kind === "entity" ? node.chains.find((item) => item.id === editor.selection.chainId) : null;
  const items = editor.document.itemDefinitions;
  if (!chain) return null;

  const firstItemId = items[0]?.id ?? "";
  const recipientForMode = (mode: QuestItemRewardRecipient["mode"]): QuestItemRewardRecipient => mode === "character"
    ? { mode, characterId: "character-id" }
    : { mode };

  return <div className="mt-3 border-t border-slate-800 pt-3">
    <div className="flex items-center justify-between"><div><div className="font-bold uppercase text-amber-100">Required Quest Items</div><div className="text-[8px] text-slate-600">Possessed by the attempting character</div></div><button type="button" disabled={!firstItemId} onClick={() => dispatch(chainItemRequirementAdded(firstItemId))} className="border border-amber-700 px-2 py-1 uppercase text-amber-100 disabled:opacity-30"><Plus size={9} className="inline" /> Add</button></div>
    <div className="mt-2 grid gap-2">{chain.itemRequirements.map((requirement) => <div key={requirement.id} className="border border-amber-900/70 bg-amber-950/10 p-2">
      <div className="grid grid-cols-[1fr_58px_20px] gap-1"><select aria-label="Required quest item" value={requirement.itemDefinitionId} onChange={(event) => dispatch(chainItemRequirementUpdated({ requirementId: requirement.id, itemDefinitionId: event.target.value }))} className={fieldClass}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Required copies" type="number" min={1} value={requirement.quantity} onChange={(event) => dispatch(chainItemRequirementUpdated({ requirementId: requirement.id, quantity: Number(event.target.value) }))} className={fieldClass} /><button type="button" aria-label="Remove item requirement" onClick={() => dispatch(chainItemRequirementRemoved(requirement.id))} className="text-slate-500 hover:text-red-300"><Trash2 size={10} /></button></div>
      <div className="mt-2 text-[8px] uppercase text-slate-500">Consume on <span className="normal-case text-slate-600">(none = persistent)</span></div><div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">{QUEST_ITEM_CONSUMPTION_TRIGGERS.map((trigger) => <label key={trigger} className="flex items-center gap-1 text-[8px] text-slate-400"><input type="checkbox" checked={requirement.consumeOn.includes(trigger)} onChange={(event) => dispatch(chainItemRequirementUpdated({ requirementId: requirement.id, consumeOn: event.target.checked ? [...requirement.consumeOn, trigger] : requirement.consumeOn.filter((item) => item !== trigger) }))} />{trigger.replace("-", " ")}</label>)}</div>
    </div>)}{chain.itemRequirements.length === 0 && <div className="text-[8px] text-slate-600">No quest item is required to attempt this chain.</div>}</div>

    <div className="mt-4 flex items-center justify-between"><div><div className="font-bold uppercase text-emerald-100">Success Item Rewards</div><div className="text-[8px] text-slate-600">Bestowed when this chain succeeds</div></div><button type="button" disabled={!firstItemId} onClick={() => dispatch(chainItemRewardAdded(firstItemId))} className="border border-emerald-700 px-2 py-1 uppercase text-emerald-100 disabled:opacity-30"><Plus size={9} className="inline" /> Add</button></div>
    <div className="mt-2 grid gap-2">{chain.successRewards.map((reward) => <div key={reward.id} className="border border-emerald-900/70 bg-emerald-950/10 p-2">
      <div className="grid grid-cols-[1fr_58px_20px] gap-1"><select aria-label="Reward quest item" value={reward.itemDefinitionId} onChange={(event) => dispatch(chainItemRewardUpdated({ rewardId: reward.id, itemDefinitionId: event.target.value }))} className={fieldClass}>{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Reward copies" type="number" min={1} value={reward.quantity} onChange={(event) => dispatch(chainItemRewardUpdated({ rewardId: reward.id, quantity: Number(event.target.value) }))} className={fieldClass} /><button type="button" aria-label="Remove item reward" onClick={() => dispatch(chainItemRewardRemoved(reward.id))} className="text-slate-500 hover:text-red-300"><Trash2 size={10} /></button></div>
      <div className="mt-2 grid grid-cols-2 gap-2"><label className="block uppercase text-slate-500">Recipient<select value={reward.recipient.mode} onChange={(event) => dispatch(chainItemRewardUpdated({ rewardId: reward.id, recipient: recipientForMode(event.target.value as QuestItemRewardRecipient["mode"]) }))} className={`mt-1 w-full ${fieldClass}`}><option value="performer">Performer</option><option value="player-choice">Player choice</option><option value="character">Character ID</option></select></label><label className="flex items-end gap-1 pb-1 text-[8px] text-slate-400"><input type="checkbox" checked={reward.repeatable} onChange={(event) => dispatch(chainItemRewardUpdated({ rewardId: reward.id, repeatable: event.target.checked }))} />Repeat reward</label></div>
      {reward.recipient.mode === "character" && <input aria-label="Reward character ID" value={reward.recipient.characterId} onChange={(event) => dispatch(chainItemRewardUpdated({ rewardId: reward.id, recipient: { mode: "character", characterId: event.target.value } }))} className={`mt-2 w-full ${fieldClass}`} />}
    </div>)}{chain.successRewards.length === 0 && <div className="text-[8px] text-slate-600">This chain does not bestow a quest item.</div>}</div>
  </div>;
};

export default QuestChainItemEditor;
