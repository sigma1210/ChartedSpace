"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Network, Play, Plus, Trash2 } from "lucide-react";
import EditorHeader from "@/components/editor/EditorHeader";
import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { TRAVELLER_TASK_DIFFICULTIES } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  activeScenarioChanged, chainAdded, chainSelected, chainUpdated, connectionCancelled, connectionRemoved, connectionSelected,
  graphViewChanged, questDescriptionChanged, questDialogNameChanged, questDocumentActivated, questDocumentSaved,
  questDraftDiscarded, questFileDialogClosed, questFileIndexFailed, questFileIndexReceived, questFileIndexRequested,
  questFileOperationFailed, questFileOperationStarted, questFlowConnectionCancelled, questFlowConnectionRemoved, questFlowConnectionSelected,
  questHeaderMenuClosed, questHeaderMenuToggled, questHudLayoutChanged, questHudLayoutsHydrated, questHudLayoutsReset,
  questHudVisibilityToggled, questNewDialogOpened, questOpenDialogOpened, questOpenSearchChanged,
  questOpenSelectionChanged, questSaveAsDialogOpened, questTitleChanged, questVictoryNodeAdded,
  questPlaytestStarted,
  questVictoryNodeUpdated, scenarioIndexFailed, scenarioIndexReceived, scenarioIndexRequested, scenarioInstanceAdded,
  scenarioInstanceRemoved, scenarioLoadFinished, scenarioLoadStarted, taskAdded, taskRemoved, taskUpdated, victoryNodeAdded, victoryNodeUpdated,
} from "../questSlice";
import { listQuestSourceScenarios, loadQuestSourceScenario } from "./api";
import { createQuestDocument, deleteQuestDocument, listQuestDocuments, loadQuestDocument, updateQuestDocument } from "./questEditorApi";
import { hudTitles, QuestFileMenu, QuestMenu, QuestNameDialog, QuestOpenDialog, QuestViewMenu } from "./QuestEditorMenus";
import { loadStoredQuestEditorHudLayouts, questEditorHudIds, saveQuestEditorHudLayouts, type QuestEditorHudId } from "./hudLayouts";
import QuestFlowGraph from "./QuestFlowGraph";
import QuestChainItemEditor from "./QuestChainItemEditor";
import QuestItemsHudContent from "./QuestItemsHudContent";
import QuestItemEditorHudContent from "./QuestItemEditorHudContent";
import ScenarioInteractionGraph from "./ScenarioInteractionGraph";
import { questEntitiesFromScenario } from "./scenarioEntities";
import { createEmptyQuestDefinition } from "./types";

const selectEditor = (state: RootState) => state.plugins.quest.editor;
const inputClass = "mt-1 w-full border border-slate-700 bg-slate-950 px-2 py-2 text-[10px] normal-case text-slate-100 outline-none focus:border-cyan-500";
const hudBody = "pointer-events-auto max-h-[42vh] overflow-y-auto p-2 font-mono text-[9px] text-slate-300";

const QuestEditorClient = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const editor = useAppSelector(selectEditor);
  const busy = editor.file.operation !== "idle";
  const dirty = useMemo(() => JSON.stringify(editor.document) !== JSON.stringify(editor.baseline), [editor.baseline, editor.document]);
  const activeScenario = editor.document.scenarioInstances.find((item) => item.id === editor.activeScenarioInstanceId) ?? null;
  const selectedNode = activeScenario?.nodes.find((node) => node.id === editor.selection.nodeId) ?? null;
  const selectedEntity = selectedNode?.kind === "entity" ? selectedNode : null;
  const selectedChain = selectedEntity?.chains.find((chain) => chain.id === editor.selection.chainId) ?? null;
  const selectedFlowNode = editor.document.questFlow.nodes.find((node) => node.id === editor.questFlowSelection.nodeId) ?? null;
  const selectedFlowScenario = selectedFlowNode?.kind === "scenario" ? editor.document.scenarioInstances.find((scenario) => scenario.id === selectedFlowNode.scenarioInstanceId) ?? null : null;
  const sourceScenarioIds = useMemo(() => new Set(editor.document.scenarioInstances.map((scenario) => scenario.sourceScenarioId)), [editor.document.scenarioInstances]);

  const refreshQuestIndex = useCallback(async () => {
    dispatch(questFileIndexRequested());
    try { dispatch(questFileIndexReceived(await listQuestDocuments())); }
    catch (error) { dispatch(questFileIndexFailed(error instanceof Error ? error.message : "Could not list quests.")); }
  }, [dispatch]);

  useEffect(() => {
    if (editor.scenarioIndex.status !== "idle") return;
    dispatch(scenarioIndexRequested());
    void listQuestSourceScenarios().then((items) => dispatch(scenarioIndexReceived(items))).catch((error: unknown) => dispatch(scenarioIndexFailed(error instanceof Error ? error.message : "Could not list scenarios.")));
  }, [dispatch, editor.scenarioIndex.status]);
  useEffect(() => { if (editor.file.questIndex.status === "idle") void refreshQuestIndex(); }, [editor.file.questIndex.status, refreshQuestIndex]);
  useEffect(() => { dispatch(questHudLayoutsHydrated(loadStoredQuestEditorHudLayouts())); }, [dispatch]);
  useEffect(() => { if (editor.hudLayoutsReady) saveQuestEditorHudLayouts(editor.hudLayouts); }, [editor.hudLayouts, editor.hudLayoutsReady]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[role="menu"], button[aria-haspopup="menu"]')) return;
      dispatch(questHeaderMenuClosed());
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dispatch(questHeaderMenuClosed()); };
    window.addEventListener("pointerdown", close); window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", escape); };
  }, [dispatch]);

  const loadScenario = async (scenario: { id: string; title: string }) => {
    dispatch(scenarioLoadStarted(scenario.id));
    try { const definition = await loadQuestSourceScenario(scenario.id); dispatch(scenarioInstanceAdded({ sourceScenarioId: scenario.id, title: scenario.title, entities: questEntitiesFromScenario(definition) })); }
    catch (error) { dispatch(scenarioIndexFailed(error instanceof Error ? error.message : "Could not load scenario.")); }
    finally { dispatch(scenarioLoadFinished()); }
  };
  const createNamedQuest = async (name: string, useCurrent: boolean) => {
    dispatch(questFileOperationStarted("creating"));
    try {
      const definition = useCurrent ? { ...editor.document, title: name.trim() } : createEmptyQuestDefinition("new-quest", name.trim());
      const result = await createQuestDocument(name, definition);
      dispatch(questDocumentActivated({ definition: result.definition, summary: result.quest, message: useCurrent ? `Saved ${result.quest.title}.` : `Created ${result.quest.title}.` }));
      void refreshQuestIndex();
    } catch (error) { dispatch(questFileOperationFailed(error instanceof Error ? error.message : "Could not create quest.")); }
  };
  const saveQuest = async () => {
    if (editor.file.currentQuest.isDefault) return;
    dispatch(questFileOperationStarted("saving"));
    try { const result = await updateQuestDocument(editor.file.currentQuest.id, editor.document); dispatch(questDocumentSaved({ definition: result.definition, summary: result.quest, message: `Saved ${result.quest.title}.` })); }
    catch (error) { dispatch(questFileOperationFailed(error instanceof Error ? error.message : "Could not save quest.")); }
  };
  const openQuest = async () => {
    if (editor.file.dialog.kind !== "open" || !editor.file.dialog.selectedQuestId) return;
    const selectedQuestId = editor.file.dialog.selectedQuestId;
    const summary = editor.file.questIndex.items.find((item) => item.id === selectedQuestId);
    if (!summary) return;
    dispatch(questFileOperationStarted("opening"));
    try { const definition = await loadQuestDocument(summary.id); dispatch(questDocumentActivated({ definition, summary, message: `Opened ${summary.title}.` })); }
    catch (error) { dispatch(questFileOperationFailed(error instanceof Error ? error.message : "Could not open quest.")); }
  };
  const deleteQuest = async () => {
    if (editor.file.currentQuest.isDefault || !window.confirm(`Delete ${editor.file.currentQuest.title}? This cannot be undone.`)) return;
    dispatch(questFileOperationStarted("deleting"));
    try { await deleteQuestDocument(editor.file.currentQuest.id); const definition = createEmptyQuestDefinition(); dispatch(questDocumentActivated({ definition, summary: { id: definition.id, title: definition.title, isDefault: true }, message: "Deleted quest." })); void refreshQuestIndex(); }
    catch (error) { dispatch(questFileOperationFailed(error instanceof Error ? error.message : "Could not delete quest.")); }
  };

  const layoutChange = (id: QuestEditorHudId) => (layout: typeof editor.hudLayouts[QuestEditorHudId]) => dispatch(questHudLayoutChanged({ id, layout }));
  const hiddenHuds = questEditorHudIds.filter((id) => !editor.hudLayouts[id].visible).map((id) => ({ id, title: hudTitles[id] }));
  const pendingLink = editor.activeGraphView === "quest-flow" ? editor.questFlowInteraction.pendingConnection !== null : editor.interaction.pendingConnection !== null;
  const selectedLinkId = editor.activeGraphView === "quest-flow" ? editor.questFlowSelection.connectionId : editor.selection.connectionId;
  const cancelLink = () => dispatch(editor.activeGraphView === "quest-flow" ? questFlowConnectionCancelled() : connectionCancelled());
  const deleteSelectedLink = useCallback(() => {
    const connectionId = editor.activeGraphView === "quest-flow" ? editor.questFlowSelection.connectionId : editor.selection.connectionId;
    if (!connectionId) return;
    dispatch(editor.activeGraphView === "quest-flow" ? questFlowConnectionRemoved(connectionId) : connectionRemoved(connectionId));
  }, [dispatch, editor.activeGraphView, editor.questFlowSelection.connectionId, editor.selection.connectionId]);
  const openProperties = () => { if (!editor.hudLayouts.inspector.visible) dispatch(questHudVisibilityToggled("inspector")); };
  const beginQuestPlaytest = (mode: "entire-quest" | "selected-scenario") => {
    dispatch(questPlaytestStarted({ mode, scenarioInstanceId: mode === "selected-scenario" ? activeScenario?.id : undefined }));
    router.push("/system/quest/playtest");
  };

  useEffect(() => {
    const removeWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (!selectedLinkId) return;
      event.preventDefault();
      deleteSelectedLink();
    };
    window.addEventListener("keydown", removeWithKeyboard);
    return () => window.removeEventListener("keydown", removeWithKeyboard);
  }, [deleteSelectedLink, selectedLinkId]);

  return <main className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[#050a12] font-mono text-slate-100">
    <EditorHeader title="Quest Editor" detail={`${editor.file.currentQuest.title} · ${editor.file.currentQuest.isDefault ? "unsaved quest" : "saved quest"} · editable draft`} message={editor.file.message} dialogOpen={editor.file.dialog.kind !== "closed"} dirty={dirty} menuLabel="Quest editor menu bar" menus={<>
      <QuestFileMenu open={editor.file.openHeaderMenu === "file"} busy={busy} saved={!editor.file.currentQuest.isDefault} dirty={dirty} onToggle={() => dispatch(questHeaderMenuToggled("file"))} onClose={() => dispatch(questHeaderMenuClosed())} onNew={() => dispatch(questNewDialogOpened())} onOpen={() => { dispatch(questOpenDialogOpened()); void refreshQuestIndex(); }} onSave={() => void saveQuest()} onSaveAs={() => dispatch(questSaveAsDialogOpened())} onDelete={() => void deleteQuest()} />
      <QuestMenu open={editor.file.openHeaderMenu === "quest"} dirty={dirty} onToggle={() => dispatch(questHeaderMenuToggled("quest"))} onClose={() => dispatch(questHeaderMenuClosed())} onEditProperties={openProperties} onDiscard={() => dispatch(questDraftDiscarded())} />
      <QuestViewMenu open={editor.file.openHeaderMenu === "view"} layouts={editor.hudLayouts} onToggle={() => dispatch(questHeaderMenuToggled("view"))} onClose={() => dispatch(questHeaderMenuClosed())} onToggleHud={(id) => dispatch(questHudVisibilityToggled(id))} onReset={() => dispatch(questHudLayoutsReset())} />
    </>} actions={<span className="border border-violet-700 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-200">{editor.activeGraphView === "quest-flow" ? "Quest Flow" : "Interactions"}</span>} />

    <section className="min-h-0 flex-1">
      <PluginHudLayer hiddenHuds={hiddenHuds} onRestoreHud={(id) => dispatch(questHudVisibilityToggled(id as QuestEditorHudId))} onResetLayout={() => dispatch(questHudLayoutsReset())} className="bg-[radial-gradient(circle_at_center,_rgba(8,145,178,0.08),_transparent_62%)]">
        <div className="absolute inset-0 overflow-auto p-5">{editor.activeGraphView === "quest-flow" ? <QuestFlowGraph /> : <ScenarioInteractionGraph />}</div>

        <FloatingPluginHud title="Tools" layout={editor.hudLayouts.tools} onLayoutChange={layoutChange("tools")} className="w-[520px]">
          <div className={`${hudBody} flex flex-wrap items-center gap-1 overflow-visible`}>
            <button type="button" onClick={() => dispatch(graphViewChanged("quest-flow"))} className={`flex h-8 items-center gap-1 border px-2 uppercase ${editor.activeGraphView === "quest-flow" ? "border-violet-400 bg-violet-950/50 text-violet-100" : "border-slate-700 text-slate-400"}`}><Network size={11} /> Quest Flow</button>
            <button type="button" onClick={() => dispatch(graphViewChanged("scenario-interactions"))} className={`h-8 border px-2 uppercase ${editor.activeGraphView === "scenario-interactions" ? "border-cyan-400 bg-cyan-950/50 text-cyan-100" : "border-slate-700 text-slate-400"}`}>Interactions</button>
            <button type="button" disabled={editor.activeGraphView === "scenario-interactions" && !activeScenario} onClick={() => dispatch(editor.activeGraphView === "quest-flow" ? questVictoryNodeAdded() : victoryNodeAdded())} className="flex h-8 items-center gap-1 border border-amber-600 px-2 uppercase text-amber-100 disabled:opacity-30"><Plus size={10} /> Victory</button>
            {pendingLink && <button type="button" onClick={cancelLink} className="h-8 border border-red-700 px-2 uppercase text-red-200">Cancel Link</button>}
            {selectedLinkId && <button type="button" onClick={deleteSelectedLink} className="flex h-8 items-center gap-1 border border-red-600 px-2 uppercase text-red-100"><Trash2 size={10} /> Delete Link</button>}
            <button type="button" disabled={editor.document.scenarioInstances.length === 0} onClick={() => beginQuestPlaytest("entire-quest")} className="flex h-8 items-center gap-1 border border-emerald-600 px-2 uppercase text-emerald-100 disabled:opacity-30"><Play size={10} /> Playtest Quest</button>
            <button type="button" disabled={!activeScenario} onClick={() => beginQuestPlaytest("selected-scenario")} className="flex h-8 items-center gap-1 border border-amber-600 px-2 uppercase text-amber-100 disabled:opacity-30"><Play size={10} /> Playtest Scenario</button>
          </div>
        </FloatingPluginHud>

        <FloatingPluginHud title="Scenario Library" layout={editor.hudLayouts["scenario-library"]} onLayoutChange={layoutChange("scenario-library")} className="w-[250px]">
          <div className={hudBody}>{editor.scenarioIndex.status === "loading" && <div className="p-2 text-slate-500">Loading scenarios…</div>}{editor.scenarioIndex.error && <div role="alert" className="mb-2 border border-red-800 p-2 text-red-200">{editor.scenarioIndex.error}</div>}<div className="grid gap-1">{editor.scenarioIndex.items.map((scenario) => <div key={scenario.id} className="border border-slate-800 bg-slate-950/70 p-2"><div className="truncate font-bold text-slate-200">{scenario.title}</div><div className="truncate text-[8px] text-slate-600">{scenario.id}</div><button type="button" disabled={editor.scenarioIndex.loadingScenarioId !== null} onClick={() => void loadScenario(scenario)} className="mt-2 w-full border border-cyan-700 py-1 uppercase text-cyan-200 disabled:opacity-40">{editor.scenarioIndex.loadingScenarioId === scenario.id ? "Loading…" : sourceScenarioIds.has(scenario.id) ? "Add another use" : "Add to quest"}</button></div>)}</div></div>
        </FloatingPluginHud>

        <FloatingPluginHud title="Quest Scenarios" layout={editor.hudLayouts["quest-scenarios"]} onLayoutChange={layoutChange("quest-scenarios")} className="w-[250px]">
          <div className={hudBody}><div className="grid gap-1">{editor.document.scenarioInstances.map((scenario, index) => <div key={scenario.id} className={`flex items-center gap-1 border ${scenario.id === editor.activeScenarioInstanceId ? "border-cyan-400 bg-cyan-950/50 text-cyan-100" : "border-slate-800 text-slate-400"}`}><button type="button" onClick={() => { dispatch(activeScenarioChanged(scenario.id)); dispatch(graphViewChanged("scenario-interactions")); }} className="min-w-0 flex-1 truncate px-2 py-2 text-left"><span className="mr-2 text-slate-600">{index + 1}.</span>{scenario.title}</button><button type="button" aria-label={`Remove ${scenario.title} from quest`} title="Remove scenario from quest" onClick={() => { if (window.confirm(`Remove ${scenario.title} from this quest? Its quest-flow node and connected links will also be removed.`)) dispatch(scenarioInstanceRemoved(scenario.id)); }} className="mr-1 grid h-7 w-7 shrink-0 place-items-center text-slate-500 hover:text-red-300"><Trash2 size={11} /></button></div>)}{editor.document.scenarioInstances.length === 0 && <div className="border border-dashed border-slate-800 p-3 text-slate-600">No scenarios in this quest.</div>}</div></div>
        </FloatingPluginHud>

        <FloatingPluginHud title="Quest Items" layout={editor.hudLayouts["quest-items"]} onLayoutChange={layoutChange("quest-items")} className="w-[300px]">
          <QuestItemsHudContent />
        </FloatingPluginHud>

        <FloatingPluginHud title="Quest Item Editor" layout={editor.hudLayouts["quest-item-editor"]} onLayoutChange={layoutChange("quest-item-editor")} className="w-[320px]">
          <QuestItemEditorHudContent />
        </FloatingPluginHud>

        <FloatingPluginHud title="Inspector" layout={editor.hudLayouts.inspector} onLayoutChange={layoutChange("inspector")} className="w-[340px]">
          <div className={hudBody}>
            <label className="block uppercase text-slate-500">Quest name<input value={editor.document.title} onChange={(event) => dispatch(questTitleChanged(event.target.value))} className={inputClass} /></label>
            <label className="mt-2 block uppercase text-slate-500">Quest description<textarea rows={2} value={editor.document.description} onChange={(event) => dispatch(questDescriptionChanged(event.target.value))} className={`${inputClass} resize-none`} /></label>
            <div className="my-3 border-t border-slate-800" />
            {editor.activeGraphView === "quest-flow" ? <>
              {!selectedFlowNode && <div className="text-slate-600">Select a Quest Start, scenario, or Quest Victory node.</div>}
              {selectedFlowNode?.kind === "quest-start" && <div><div className="font-bold text-emerald-100">Quest Start</div><p className="mt-1 text-slate-500">Connect it to the first scenario.</p></div>}
              {selectedFlowScenario && <div><div className="font-bold text-violet-100">{selectedFlowScenario.title}</div><div className="mt-1 text-slate-500">{selectedFlowScenario.sourceScenarioId}</div><button type="button" onClick={() => { dispatch(activeScenarioChanged(selectedFlowScenario.id)); dispatch(graphViewChanged("scenario-interactions")); }} className="mt-3 w-full border border-cyan-600 py-2 uppercase text-cyan-100">Open interactions</button></div>}
              {selectedFlowNode?.kind === "quest-victory" && <><label className="block uppercase text-slate-500">Victory name<input value={selectedFlowNode.title} onChange={(event) => dispatch(questVictoryNodeUpdated({ nodeId: selectedFlowNode.id, title: event.target.value }))} className={inputClass} /></label><label className="mt-2 block uppercase text-slate-500">Ending description<textarea rows={3} value={selectedFlowNode.description} onChange={(event) => dispatch(questVictoryNodeUpdated({ nodeId: selectedFlowNode.id, description: event.target.value }))} className={`${inputClass} resize-none`} /></label></>}
            </> : <>
              {!selectedNode && <div className="text-slate-600">Select a scenario interaction node.</div>}
              {selectedNode && <div><div className="font-bold text-slate-100">{selectedNode.title}</div><div className="text-slate-500">{selectedNode.kind === "entity" ? selectedNode.entityType : selectedNode.kind}</div></div>}
              {selectedEntity && <div className="mt-3"><div className="flex items-center justify-between"><span className="font-bold uppercase">Quest skill chains</span><button type="button" onClick={() => dispatch(chainAdded(selectedEntity.id))} className="border border-cyan-600 px-2 py-1 uppercase text-cyan-100"><Plus size={9} className="inline" /> Add</button></div><div className="mt-2 grid gap-1">{selectedEntity.chains.map((chain) => <button key={chain.id} type="button" onClick={() => dispatch(chainSelected(chain.id))} className={`border px-2 py-2 text-left ${chain.id === editor.selection.chainId ? "border-cyan-400 bg-cyan-950/40" : "border-slate-800"}`}>{chain.name}</button>)}</div></div>}
              {selectedNode?.kind === "victory" && <><label className="mt-3 block uppercase text-slate-500">Victory name<input value={selectedNode.title} onChange={(event) => dispatch(victoryNodeUpdated({ nodeId: selectedNode.id, title: event.target.value }))} className={inputClass} /></label><label className="mt-2 block uppercase text-slate-500">Scenario ending<textarea rows={3} value={selectedNode.description} onChange={(event) => dispatch(victoryNodeUpdated({ nodeId: selectedNode.id, description: event.target.value }))} className={`${inputClass} resize-none`} /></label></>}
              {selectedChain && <div className="mt-3 border-t border-slate-800 pt-3"><label className="block uppercase text-slate-500">Chain name<input value={selectedChain.name} onChange={(event) => dispatch(chainUpdated({ chainId: selectedChain.id, name: event.target.value }))} className={inputClass} /></label><label className="mt-2 block uppercase text-slate-500">Chain description<textarea rows={2} value={selectedChain.description} onChange={(event) => dispatch(chainUpdated({ chainId: selectedChain.id, description: event.target.value }))} className={`${inputClass} resize-none`} /></label><div className="mt-2 flex items-center justify-between"><span className="uppercase">Ordered tasks · 6 AP</span><button type="button" onClick={() => dispatch(taskAdded(selectedChain.id))} className="border border-emerald-700 px-2 py-1 uppercase text-emerald-200">Add task</button></div><div className="mt-2 grid gap-2">{selectedChain.tasks.map((task, index) => <div key={task.id} className="grid grid-cols-[18px_1fr_100px_20px] gap-1 border border-slate-800 p-1"><span>{index + 1}</span><input value={task.skill} aria-label={`Skill ${index + 1}`} onChange={(event) => dispatch(taskUpdated({ chainId: selectedChain.id, taskId: task.id, skill: event.target.value }))} className="min-w-0 bg-slate-950 px-1" /><select value={task.difficulty} aria-label={`Difficulty ${index + 1}`} onChange={(event) => dispatch(taskUpdated({ chainId: selectedChain.id, taskId: task.id, difficulty: event.target.value as typeof task.difficulty }))} className="bg-slate-950">{TRAVELLER_TASK_DIFFICULTIES.map((difficulty) => <option key={difficulty.id} value={difficulty.id}>{difficulty.label}</option>)}</select><button type="button" aria-label={`Remove task ${index + 1}`} disabled={selectedChain.tasks.length === 1} onClick={() => dispatch(taskRemoved({ chainId: selectedChain.id, taskId: task.id }))}><Trash2 size={10} /></button></div>)}</div></div>}
              <QuestChainItemEditor />
            </>}
          </div>
        </FloatingPluginHud>

        <FloatingPluginHud title="Links" layout={editor.hudLayouts.links} onLayoutChange={layoutChange("links")} className="w-[340px]">
          <div className={hudBody}>{(editor.activeGraphView === "quest-flow" ? editor.document.questFlow.connections : activeScenario?.connections ?? []).length === 0 && <div className="text-slate-600">No links in this graph.</div>}{editor.activeGraphView === "quest-flow" ? editor.document.questFlow.connections.map((connection) => <div key={connection.id} className={`mb-1 flex items-center gap-2 border p-2 ${editor.questFlowSelection.connectionId === connection.id ? "border-white bg-violet-950/50" : "border-slate-800"}`}><button type="button" onClick={() => dispatch(questFlowConnectionSelected(connection.id))} className="min-w-0 flex-1 truncate text-left">{connection.sourceNodeId} → {connection.targetNodeId}</button><button type="button" aria-label="Remove quest link" onClick={() => dispatch(questFlowConnectionRemoved(connection.id))}><Trash2 size={11} /></button></div>) : activeScenario?.connections.map((connection) => <div key={connection.id} className={`mb-1 flex items-center gap-2 border p-2 ${editor.selection.connectionId === connection.id ? "border-white bg-cyan-950/50" : "border-slate-800"}`}><button type="button" onClick={() => dispatch(connectionSelected(connection.id))} className="min-w-0 flex-1 truncate text-left">{activeScenario.nodes.find((node) => node.id === connection.sourceNodeId)?.title} → {activeScenario.nodes.find((node) => node.id === connection.targetNodeId)?.title}</button><button type="button" aria-label="Remove interaction link" onClick={() => dispatch(connectionRemoved(connection.id))}><Trash2 size={11} /></button></div>)}</div>
        </FloatingPluginHud>

        <FloatingPluginHud title="Navigation" layout={editor.hudLayouts.navigation} onLayoutChange={layoutChange("navigation")} className="w-[200px]"><div className={`${hudBody} flex gap-1 overflow-visible`}><Link href="/system/tactical/editor" className="border border-cyan-700 px-2 py-2 uppercase text-cyan-100">Scenario Editor</Link><Link href="/system/tactical" className="border border-slate-700 px-2 py-2 uppercase text-slate-300">Tactical</Link></div></FloatingPluginHud>
      </PluginHudLayer>
    </section>

    {editor.file.dialog.kind === "new" && <QuestNameDialog kind="new" name={editor.file.dialog.name} busy={busy} message={editor.file.message} onNameChange={(name) => dispatch(questDialogNameChanged(name))} onSubmit={() => void createNamedQuest(editor.file.dialog.kind === "new" ? editor.file.dialog.name : "", false)} onClose={() => dispatch(questFileDialogClosed())} />}
    {editor.file.dialog.kind === "save-as" && <QuestNameDialog kind="save-as" name={editor.file.dialog.name} busy={busy} message={editor.file.message} onNameChange={(name) => dispatch(questDialogNameChanged(name))} onSubmit={() => void createNamedQuest(editor.file.dialog.kind === "save-as" ? editor.file.dialog.name : "", true)} onClose={() => dispatch(questFileDialogClosed())} />}
    {editor.file.dialog.kind === "open" && <QuestOpenDialog dialog={editor.file.dialog} items={editor.file.questIndex.items} busy={busy} message={editor.file.message} onSearch={(value) => dispatch(questOpenSearchChanged(value))} onSelect={(id) => dispatch(questOpenSelectionChanged(id))} onOpen={() => void openQuest()} onClose={() => dispatch(questFileDialogClosed())} />}
  </main>;
};

export default QuestEditorClient;
