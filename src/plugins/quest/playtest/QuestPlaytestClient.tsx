"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import TacticalMapPageClient from "@/plugins/characterCombat/TacticalMapPageClient";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadQuestSourceScenario } from "../editor/api";
import {
  questPlaytestEnded,
  questPlaytestPendingRewardAssigned,
  questPlaytestScenarioLoadFailed,
  questPlaytestScenarioLoaded,
  questPlaytestScenarioLoadRequested,
  questPlaytestScenarioVictoryReached,
} from "../questSlice";

const selectRuntime = (state: RootState) => state.plugins.quest.editor.playtest;

const QuestPlaytestClient = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const runtime = useAppSelector(selectRuntime);
  const tacticalMap = useAppSelector((state: RootState) => state.plugins.characterCombat.tacticalMap);
  const currentScenario = runtime.definition?.scenarioInstances.find((scenario) => scenario.id === runtime.currentScenarioInstanceId) ?? null;

  useEffect(() => {
    if (!currentScenario || runtime.loadedScenarioInstanceId === currentScenario.id || runtime.status === "error") return;
    dispatch(questPlaytestScenarioLoadRequested());
    void loadQuestSourceScenario(currentScenario.sourceScenarioId)
      .then((definition) => dispatch(questPlaytestScenarioLoaded({ scenarioInstanceId: currentScenario.id, definition })))
      .catch((error: unknown) => dispatch(questPlaytestScenarioLoadFailed(error instanceof Error ? error.message : "Could not load the quest scenario.")));
  }, [currentScenario, dispatch, runtime.loadedScenarioInstanceId, runtime.status]);

  useEffect(() => {
    if (tacticalMap?.scenarioStatus !== "victory" || !runtime.consoleVictory || !currentScenario) return;
    const completed = new Set(tacticalMap.completedConsoleOperationIds ?? []);
    const victoryOperation = runtime.consoleVictory.operations.find((operation) => operation.result.type === "victory" && completed.has(operation.id) && operation.quest?.scenarioVictoryNodeId);
    const victoryNodeId = victoryOperation?.quest?.scenarioVictoryNodeId;
    const key = victoryNodeId ? `${currentScenario.id}:${victoryNodeId}` : null;
    if (!victoryNodeId || !key || runtime.completedScenarioVictoryKeys.includes(key)) return;
    dispatch(questPlaytestScenarioVictoryReached({ scenarioInstanceId: currentScenario.id, victoryNodeId }));
  }, [currentScenario, dispatch, runtime.completedScenarioVictoryKeys, runtime.consoleVictory, tacticalMap?.completedConsoleOperationIds, tacticalMap?.scenarioStatus]);

  const exit = useCallback(() => {
    dispatch(questPlaytestEnded());
    router.push("/system/quest/editor");
  }, [dispatch, router]);

  const draftPlaytest = useMemo(() => runtime.sourceDefinition && runtime.consoleVictory ? {
    definition: runtime.sourceDefinition,
    consoleVictory: runtime.consoleVictory,
    onExit: exit,
  } : null, [exit, runtime.consoleVictory, runtime.sourceDefinition]);

  if (runtime.status === "inactive") return <main className="grid h-screen place-items-center bg-[#050a12] font-mono text-slate-100"><div className="border border-amber-700 bg-slate-950 p-6 text-center"><div className="text-sm font-bold uppercase tracking-wider text-amber-100">No Quest Playtest</div><button type="button" onClick={() => router.push("/system/quest/editor")} className="mt-4 border border-cyan-600 px-4 py-2 text-[10px] uppercase text-cyan-100">Return to Quest Editor</button></div></main>;
  if (runtime.status === "error") return <main className="grid h-screen place-items-center bg-[#050a12] font-mono text-slate-100"><div className="border border-red-700 bg-slate-950 p-6"><div className="text-red-200">{runtime.message}</div><button type="button" onClick={exit} className="mt-4 border border-cyan-600 px-4 py-2 text-[10px] uppercase text-cyan-100">Return to Quest Editor</button></div></main>;
  if (!draftPlaytest) return <main className="grid h-screen place-items-center bg-[#050a12] font-mono text-[11px] uppercase tracking-wider text-cyan-100">Loading quest scenario…</main>;
  const playerCharacters = tacticalMap?.scenario.combatants.filter((combatant) => combatant.side === "player") ?? [];
  return <>
    <TacticalMapPageClient draftPlaytest={draftPlaytest} />
    <aside className="pointer-events-auto fixed bottom-3 right-3 z-50 w-72 border border-violet-500/70 bg-slate-950/95 p-3 font-mono text-[9px] text-slate-200 shadow-2xl">
      <div className="font-bold uppercase tracking-wider text-violet-100">Quest Playtest</div>
      <div className="mt-1 text-slate-500">{runtime.mode === "entire-quest" ? "Entire quest" : "Selected scenario"} · {currentScenario?.title}</div>
      {runtime.message && <div className="mt-2 border border-amber-800 p-2 text-amber-100">{runtime.message}</div>}
      <div className="mt-2 border-t border-slate-800 pt-2 font-bold uppercase text-amber-100">Quest item custody</div>
      <div className="mt-1 grid gap-1">{playerCharacters.map((character) => {
        const copies = runtime.itemInstances.filter((instance) => instance.characterId === character.id);
        const counts = copies.reduce<Record<string, number>>((result, copy) => ({ ...result, [copy.itemDefinitionId]: (result[copy.itemDefinitionId] ?? 0) + 1 }), {});
        return <div key={character.id} className="border border-slate-800 p-1"><span className="font-bold text-cyan-100">{character.name}</span><span className="ml-2 text-slate-500">{copies.length === 0 ? "No quest items" : Object.entries(counts).map(([itemId, count]) => `${runtime.definition?.itemDefinitions.find((item) => item.id === itemId)?.name ?? itemId} ×${count}`).join(", ")}</span></div>;
      })}</div>
      {runtime.pendingRewardSelections.map((pending) => <div key={pending.id} className="mt-2 border border-emerald-700 p-2"><div className="font-bold text-emerald-100">Assign {runtime.definition?.itemDefinitions.find((item) => item.id === pending.itemDefinitionId)?.name ?? "reward"} ×{pending.quantity}</div><div className="mt-1 flex flex-wrap gap-1">{playerCharacters.map((character) => <button key={character.id} type="button" onClick={() => dispatch(questPlaytestPendingRewardAssigned({ pendingRewardId: pending.id, characterId: character.id }))} className="border border-emerald-600 px-2 py-1 text-emerald-100">{character.name}</button>)}</div></div>)}
      {runtime.status === "quest-victory" && <div className="mt-2 border border-emerald-400 bg-emerald-950/40 p-2 font-bold uppercase text-emerald-100">Quest Victory</div>}
      <button type="button" onClick={exit} className="mt-3 w-full border border-amber-500 px-3 py-2 font-bold uppercase text-amber-100">Return to Quest Editor</button>
    </aside>
  </>;
};

export default QuestPlaytestClient;
