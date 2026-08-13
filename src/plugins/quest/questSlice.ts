import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { TravellerTaskDifficulty } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type {
  QuestEditorScenarioSummary,
  QuestEntityNode,
  QuestGraphNode,
  QuestFlowNode,
  QuestScenarioEntity,
  QuestScenarioInstance,
  QuestDefinitionFile,
  QuestItemConsumptionTrigger,
  QuestItemRewardRecipient,
} from "./editor/types";
import { cloneQuestDefinition, createEmptyQuestDefinition } from "./editor/types";
import type { DialogueConnectionOutcome, DialogueDefinitionFile, DialogueNode, DialogueSummary } from "./dialogue/types";
import { cloneDialogueDefinition, createEmptyDialogueDefinition } from "./dialogue/types";
import {
  defaultQuestEditorHudLayouts,
  freshDefaultQuestEditorHudLayouts,
  type QuestEditorHudId,
  type QuestEditorHudLayouts,
} from "./editor/hudLayouts";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  firstQuestScenarioInstanceId,
  inactiveQuestPlaytestRuntime,
  nextScenarioAfterVictory,
  questScenarioConsoleVictory,
  type QuestPlaytestMode,
  type QuestPlaytestRuntime,
} from "./playtest/questPlaytest";

export type QuestFileSummary = { id: string; title: string; isDefault: boolean };
export type QuestFileMessage = { kind: "error" | "success"; text: string } | null;
export type QuestFileDialog =
  | { kind: "closed" }
  | { kind: "open"; searchQuery: string; selectedQuestId: string }
  | { kind: "new"; name: string }
  | { kind: "save-as"; name: string };

export type QuestEditorState = {
  document: QuestDefinitionFile;
  baseline: QuestDefinitionFile;
  activeGraphView: "quest-flow" | "scenario-interactions";
  activeScenarioInstanceId: string | null;
  scenarioIndex: {
    items: QuestEditorScenarioSummary[];
    status: "idle" | "loading" | "ready" | "failed";
    error: string | null;
    loadingScenarioId: string | null;
  };
  selection: { nodeId: string | null; chainId: string | null; connectionId: string | null };
  interaction: {
    pendingConnection: { sourceNodeId: string; sourceChainId: string | null } | null;
    draggingNode: { nodeId: string; offset: { x: number; y: number } } | null;
  };
  questFlowSelection: { nodeId: string | null; connectionId: string | null };
  selectedQuestItemId: string | null;
  questFlowInteraction: {
    pendingConnection: { sourceNodeId: string; sourceScenarioVictoryId: string | null } | null;
    draggingNode: { nodeId: string; offset: { x: number; y: number } } | null;
  };
  file: {
    currentQuest: QuestFileSummary;
    questIndex: { items: QuestFileSummary[]; status: "idle" | "loading" | "ready" | "failed" };
    operation: "idle" | "opening" | "creating" | "saving" | "deleting";
    message: QuestFileMessage;
    openHeaderMenu: "file" | "quest" | "view" | null;
    dialog: QuestFileDialog;
  };
  hudLayouts: QuestEditorHudLayouts;
  hudLayoutsReady: boolean;
  playtest: QuestPlaytestRuntime;
  dialogueLibrary: {
    items: DialogueSummary[];
    definitions: Record<string, DialogueDefinitionFile>;
    status: "idle" | "loading" | "ready" | "failed";
    error: string | null;
  };
  dialogueEditor: {
    document: DialogueDefinitionFile;
    baseline: DialogueDefinitionFile;
    current: DialogueSummary | null;
    selection: { nodeId: string | null; connectionId: string | null };
    pendingConnection: { sourceNodeId: string; outcome: DialogueConnectionOutcome } | null;
    draggingNode: { nodeId: string; offset: { x: number; y: number } } | null;
    operation: "idle" | "opening" | "creating" | "saving" | "deleting";
    message: QuestFileMessage;
  };
};

export type QuestState = { editor: QuestEditorState };

const initialQuestDocument = createEmptyQuestDefinition();

export const initialQuestState: QuestState = {
  editor: {
    document: cloneQuestDefinition(initialQuestDocument),
    baseline: cloneQuestDefinition(initialQuestDocument),
    activeGraphView: "quest-flow",
    activeScenarioInstanceId: null,
    scenarioIndex: { items: [], status: "idle", error: null, loadingScenarioId: null },
    selection: { nodeId: null, chainId: null, connectionId: null },
    interaction: { pendingConnection: null, draggingNode: null },
    questFlowSelection: { nodeId: null, connectionId: null },
    selectedQuestItemId: null,
    questFlowInteraction: { pendingConnection: null, draggingNode: null },
    file: {
      currentQuest: { id: "new-quest", title: "Untitled Quest", isDefault: true },
      questIndex: { items: [], status: "idle" },
      operation: "idle",
      message: null,
      openHeaderMenu: null,
      dialog: { kind: "closed" },
    },
    hudLayouts: defaultQuestEditorHudLayouts,
    hudLayoutsReady: false,
    playtest: inactiveQuestPlaytestRuntime(),
    dialogueLibrary: { items: [], definitions: {}, status: "idle", error: null },
    dialogueEditor: {
      document: createEmptyDialogueDefinition(), baseline: createEmptyDialogueDefinition(), current: null,
      selection: { nodeId: "dialogue-start", connectionId: null }, pendingConnection: null, draggingNode: null,
      operation: "idle", message: null,
    },
  },
};

const activeScenario = (state: QuestState) => state.editor.document.scenarioInstances
  .find((scenario) => scenario.id === state.editor.activeScenarioInstanceId);

const selectedEntity = (state: QuestState) => {
  const scenario = activeScenario(state);
  const node = scenario?.nodes.find((candidate) => candidate.id === state.editor.selection.nodeId);
  return node?.kind === "entity" ? node : undefined;
};

const selectedChain = (state: QuestState) => selectedEntity(state)?.chains
  .find((candidate) => candidate.id === state.editor.selection.chainId);

const questSlice = createSlice({
  name: "quest",
  initialState: initialQuestState,
  reducers: {
    dialogueLibraryRequested(state) {
      state.editor.dialogueLibrary.status = "loading";
      state.editor.dialogueLibrary.error = null;
    },
    dialogueLibraryReceived(state, action: PayloadAction<DialogueSummary[]>) {
      state.editor.dialogueLibrary.items = action.payload;
      state.editor.dialogueLibrary.status = "ready";
      state.editor.dialogueLibrary.error = null;
    },
    dialogueLibraryFailed(state, action: PayloadAction<string>) {
      state.editor.dialogueLibrary.status = "failed";
      state.editor.dialogueLibrary.error = action.payload;
    },
    dialogueDefinitionCached(state, action: PayloadAction<DialogueDefinitionFile>) {
      state.editor.dialogueLibrary.definitions[action.payload.id] = cloneDialogueDefinition(action.payload);
    },
    dialogueEditorNew(state) {
      const definition = createEmptyDialogueDefinition();
      state.editor.dialogueEditor = {
        document: definition, baseline: cloneDialogueDefinition(definition), current: null,
        selection: { nodeId: definition.startNodeId, connectionId: null }, pendingConnection: null, draggingNode: null,
        operation: "idle", message: { kind: "success", text: "Created a new dialogue draft." },
      };
    },
    dialogueEditorOperationStarted(state, action: PayloadAction<QuestEditorState["dialogueEditor"]["operation"]>) {
      state.editor.dialogueEditor.operation = action.payload;
      state.editor.dialogueEditor.message = null;
    },
    dialogueEditorOperationFailed(state, action: PayloadAction<string>) {
      state.editor.dialogueEditor.operation = "idle";
      state.editor.dialogueEditor.message = { kind: "error", text: action.payload };
    },
    dialogueEditorDocumentActivated(state, action: PayloadAction<{ definition: DialogueDefinitionFile; message: string }>) {
      const definition = cloneDialogueDefinition(action.payload.definition);
      state.editor.dialogueEditor.document = definition;
      state.editor.dialogueEditor.baseline = cloneDialogueDefinition(definition);
      state.editor.dialogueEditor.current = { id: definition.id, title: definition.title };
      state.editor.dialogueEditor.selection = { nodeId: definition.startNodeId, connectionId: null };
      state.editor.dialogueEditor.pendingConnection = null;
      state.editor.dialogueEditor.draggingNode = null;
      state.editor.dialogueEditor.operation = "idle";
      state.editor.dialogueEditor.message = { kind: "success", text: action.payload.message };
      state.editor.dialogueLibrary.definitions[definition.id] = cloneDialogueDefinition(definition);
    },
    dialogueEditorDocumentSaved(state, action: PayloadAction<{ definition: DialogueDefinitionFile; message: string }>) {
      const definition = cloneDialogueDefinition(action.payload.definition);
      state.editor.dialogueEditor.document = definition;
      state.editor.dialogueEditor.baseline = cloneDialogueDefinition(definition);
      state.editor.dialogueEditor.current = { id: definition.id, title: definition.title };
      state.editor.dialogueEditor.operation = "idle";
      state.editor.dialogueEditor.message = { kind: "success", text: action.payload.message };
      state.editor.dialogueLibrary.definitions[definition.id] = cloneDialogueDefinition(definition);
    },
    dialogueEditorTitleChanged(state, action: PayloadAction<string>) { state.editor.dialogueEditor.document.title = action.payload; },
    dialogueEditorDescriptionChanged(state, action: PayloadAction<string>) { state.editor.dialogueEditor.document.description = action.payload; },
    dialogueEditorVariablesChanged(state, action: PayloadAction<string[]>) {
      state.editor.dialogueEditor.document.variableKeys = [...new Set(action.payload.map((key) => key.trim()).filter(Boolean))];
    },
    dialogueEditorNodeAdded: {
      prepare(kind: DialogueNode["kind"]) { return { payload: { kind, id: nanoid() } }; },
      reducer(state, action: PayloadAction<{ kind: DialogueNode["kind"]; id: string }>) {
        const count = state.editor.dialogueEditor.document.nodes.length;
        const position = { x: 330 + (count % 3) * 260, y: 80 + Math.floor(count / 3) * 170 };
        const node: DialogueNode = action.payload.kind === "npc-text" ? { id: action.payload.id, kind: "npc-text", text: "{{npcName}} says…", position }
          : action.payload.kind === "choice" ? { id: action.payload.id, kind: "choice", text: "{{characterName}} replies…", position }
          : action.payload.kind === "skill-chain" ? { id: action.payload.id, kind: "skill-chain", label: "Skill check", tasks: [{ id: nanoid(), skill: "Persuade", difficulty: "average" }], position }
          : { id: action.payload.id, kind: "ending", endingKind: "neutral", title: "Conversation ends", text: "", transformation: "unchanged", restartable: false, resumeNodeId: null, position };
        state.editor.dialogueEditor.document.nodes.push(node);
        state.editor.dialogueEditor.selection = { nodeId: node.id, connectionId: null };
      },
    },
    dialogueEditorNodeSelected(state, action: PayloadAction<string | null>) {
      state.editor.dialogueEditor.selection = { nodeId: action.payload, connectionId: null };
    },
    dialogueEditorNodeMoved(state, action: PayloadAction<{ nodeId: string; position: { x: number; y: number } }>) {
      const node = state.editor.dialogueEditor.document.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node) node.position = action.payload.position;
    },
    dialogueEditorNodeDragStarted(state, action: PayloadAction<{ nodeId: string; offset: { x: number; y: number } }>) {
      state.editor.dialogueEditor.draggingNode = action.payload;
      state.editor.dialogueEditor.selection = { nodeId: action.payload.nodeId, connectionId: null };
    },
    dialogueEditorNodeDragEnded(state) { state.editor.dialogueEditor.draggingNode = null; },
    dialogueEditorNodeRemoved(state, action: PayloadAction<string>) {
      if (action.payload === state.editor.dialogueEditor.document.startNodeId) return;
      state.editor.dialogueEditor.document.nodes = state.editor.dialogueEditor.document.nodes.filter((node) => node.id !== action.payload);
      state.editor.dialogueEditor.document.connections = state.editor.dialogueEditor.document.connections.filter((link) => link.sourceNodeId !== action.payload && link.targetNodeId !== action.payload);
      for (const node of state.editor.dialogueEditor.document.nodes) if (node.kind === "ending" && node.resumeNodeId === action.payload) node.resumeNodeId = null;
      state.editor.dialogueEditor.selection = { nodeId: null, connectionId: null };
    },
    dialogueEditorNodeUpdated(state, action: PayloadAction<{ nodeId: string; text?: string; label?: string; title?: string; endingKind?: "success" | "neutral" | "failure"; transformation?: "unchanged" | "ally" | "enemy"; restartable?: boolean; resumeNodeId?: string | null }>) {
      const node = state.editor.dialogueEditor.document.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (!node) return;
      if (action.payload.text !== undefined && (node.kind === "npc-text" || node.kind === "choice" || node.kind === "ending")) node.text = action.payload.text;
      if (action.payload.label !== undefined && node.kind === "skill-chain") node.label = action.payload.label;
      if (node.kind === "ending") {
        if (action.payload.title !== undefined) node.title = action.payload.title;
        if (action.payload.endingKind !== undefined) node.endingKind = action.payload.endingKind;
        if (action.payload.transformation !== undefined) node.transformation = action.payload.transformation;
        if (action.payload.restartable !== undefined) node.restartable = action.payload.restartable;
        if (action.payload.resumeNodeId !== undefined) node.resumeNodeId = action.payload.resumeNodeId;
      }
    },
    dialogueEditorTaskAdded: {
      prepare(nodeId: string) { return { payload: { nodeId, taskId: nanoid() } }; },
      reducer(state, action: PayloadAction<{ nodeId: string; taskId: string }>) { const node = state.editor.dialogueEditor.document.nodes.find((candidate) => candidate.id === action.payload.nodeId); if (node?.kind === "skill-chain") node.tasks.push({ id: action.payload.taskId, skill: "Skill", difficulty: "average" }); },
    },
    dialogueEditorTaskUpdated(state, action: PayloadAction<{ nodeId: string; taskId: string; skill?: string; difficulty?: TravellerTaskDifficulty }>) {
      const node = state.editor.dialogueEditor.document.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      const task = node?.kind === "skill-chain" ? node.tasks.find((candidate) => candidate.id === action.payload.taskId) : null;
      if (!task) return;
      if (action.payload.skill !== undefined) task.skill = action.payload.skill;
      if (action.payload.difficulty !== undefined) task.difficulty = action.payload.difficulty;
    },
    dialogueEditorTaskRemoved(state, action: PayloadAction<{ nodeId: string; taskId: string }>) { const node = state.editor.dialogueEditor.document.nodes.find((candidate) => candidate.id === action.payload.nodeId); if (node?.kind === "skill-chain" && node.tasks.length > 1) node.tasks = node.tasks.filter((task) => task.id !== action.payload.taskId); },
    dialogueEditorConnectionStarted(state, action: PayloadAction<{ sourceNodeId: string; outcome: DialogueConnectionOutcome }>) { state.editor.dialogueEditor.pendingConnection = action.payload; },
    dialogueEditorConnectionCancelled(state) { state.editor.dialogueEditor.pendingConnection = null; },
    dialogueEditorConnectionTargetSelected: {
      prepare(targetNodeId: string) { return { payload: { targetNodeId, id: nanoid() } }; },
      reducer(state, action: PayloadAction<{ targetNodeId: string; id: string }>) {
        const pending = state.editor.dialogueEditor.pendingConnection;
        if (!pending || pending.sourceNodeId === action.payload.targetNodeId) return;
        const source = state.editor.dialogueEditor.document.nodes.find((node) => node.id === pending.sourceNodeId);
        if (!(source?.kind === "npc-text" && pending.outcome === "next")) state.editor.dialogueEditor.document.connections = state.editor.dialogueEditor.document.connections.filter((link) => link.sourceNodeId !== pending.sourceNodeId || link.outcome !== pending.outcome);
        state.editor.dialogueEditor.document.connections.push({ id: action.payload.id, ...pending, targetNodeId: action.payload.targetNodeId });
        state.editor.dialogueEditor.pendingConnection = null;
      },
    },
    dialogueEditorConnectionSelected(state, action: PayloadAction<string | null>) { state.editor.dialogueEditor.selection = { nodeId: null, connectionId: action.payload }; },
    dialogueEditorConnectionRemoved(state, action: PayloadAction<string>) { state.editor.dialogueEditor.document.connections = state.editor.dialogueEditor.document.connections.filter((link) => link.id !== action.payload); if (state.editor.dialogueEditor.selection.connectionId === action.payload) state.editor.dialogueEditor.selection.connectionId = null; },
    entityDialogueAssigned(state, action: PayloadAction<{ nodeId: string; definitionId: string | null }>) {
      const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node?.kind !== "entity" || node.entityType !== "interactive-human") return;
      node.dialogue = action.payload.definitionId ? { definitionId: action.payload.definitionId, variables: {}, successEndingChainIdByEndingId: {} } : null;
    },
    entityDialogueVariableChanged(state, action: PayloadAction<{ nodeId: string; key: string; value: string }>) { const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId); if (node?.kind === "entity" && node.dialogue) node.dialogue.variables[action.payload.key] = action.payload.value; },
    entityDialogueEndingMapped(state, action: PayloadAction<{ nodeId: string; endingId: string; chainId: string | null }>) { const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId); if (node?.kind !== "entity" || !node.dialogue) return; if (action.payload.chainId) node.dialogue.successEndingChainIdByEndingId[action.payload.endingId] = action.payload.chainId; else delete node.dialogue.successEndingChainIdByEndingId[action.payload.endingId]; },
    questTitleChanged(state, action: PayloadAction<string>) {
      state.editor.document.title = action.payload;
    },
    questDescriptionChanged(state, action: PayloadAction<string>) {
      state.editor.document.description = action.payload;
    },
    questPlaytestStarted(state, action: PayloadAction<{ mode: QuestPlaytestMode; scenarioInstanceId?: string }>) {
      const definition = cloneQuestDefinition(state.editor.document);
      const scenarioInstanceId = action.payload.mode === "entire-quest"
        ? firstQuestScenarioInstanceId(definition)
        : action.payload.scenarioInstanceId ?? null;
      state.editor.playtest = {
        ...inactiveQuestPlaytestRuntime(),
        status: scenarioInstanceId ? "loading-scenario" : "error",
        mode: action.payload.mode,
        definition,
        currentScenarioInstanceId: scenarioInstanceId,
        message: scenarioInstanceId ? null : "The selected playtest entry has no scenario.",
      };
    },
    questPlaytestScenarioLoadRequested(state) {
      if (state.editor.playtest.status !== "inactive") {
        state.editor.playtest.status = "loading-scenario";
        state.editor.playtest.message = null;
      }
    },
    questPlaytestScenarioLoaded(state, action: PayloadAction<{ scenarioInstanceId: string; definition: TacticalScenarioDefinitionFile }>) {
      const runtime = state.editor.playtest;
      const scenario = runtime.definition?.scenarioInstances.find((candidate) => candidate.id === action.payload.scenarioInstanceId);
      if (!scenario || runtime.currentScenarioInstanceId !== action.payload.scenarioInstanceId) return;
      runtime.loadedScenarioInstanceId = scenario.id;
      runtime.sourceDefinition = action.payload.definition;
      runtime.consoleVictory = questScenarioConsoleVictory(runtime.definition!.id, scenario);
      runtime.status = "setup";
      runtime.message = null;
    },
    questPlaytestScenarioLoadFailed(state, action: PayloadAction<string>) {
      state.editor.playtest.status = "error";
      state.editor.playtest.message = action.payload;
    },
    questPlaytestDialogueLoaded(state, action: PayloadAction<DialogueDefinitionFile>) {
      state.editor.playtest.dialogueDefinitions[action.payload.id] = cloneDialogueDefinition(action.payload);
    },
    questPlaytestDialogueLoadFailed(state, action: PayloadAction<string>) {
      state.editor.playtest.message = action.payload;
    },
    questPlaytestConversationStarted(state, action: PayloadAction<{ scenarioNodeId: string; characterId: string; terminalId: string }>) {
      const runtime = state.editor.playtest;
      const scenario = runtime.definition?.scenarioInstances.find((candidate) => candidate.id === runtime.currentScenarioInstanceId);
      const entity = scenario?.nodes.find((candidate) => candidate.id === action.payload.scenarioNodeId);
      if (entity?.kind !== "entity" || !entity.dialogue || runtime.conversation || runtime.closedConversationScenarioNodeIds.includes(entity.id)) return;
      const definition = runtime.dialogueDefinitions[entity.dialogue.definitionId];
      if (!definition) return;
      runtime.conversation = {
        scenarioNodeId: entity.id, definitionId: definition.id,
        currentNodeId: runtime.conversationResumeNodeIdByScenarioNodeId[entity.id] ?? definition.startNodeId,
        characterId: action.payload.characterId, terminalId: action.payload.terminalId,
      };
      runtime.message = null;
    },
    questPlaytestConversationAdvanced(state, action: PayloadAction<string>) {
      const runtime = state.editor.playtest;
      const definition = runtime.conversation ? runtime.dialogueDefinitions[runtime.conversation.definitionId] : null;
      if (runtime.conversation && definition?.nodes.some((node) => node.id === action.payload)) runtime.conversation.currentNodeId = action.payload;
    },
    questPlaytestConversationSkillResolved(state, action: PayloadAction<{ targetNodeId: string; message: string }>) {
      const runtime = state.editor.playtest;
      const definition = runtime.conversation ? runtime.dialogueDefinitions[runtime.conversation.definitionId] : null;
      if (runtime.conversation && definition?.nodes.some((node) => node.id === action.payload.targetNodeId)) {
        runtime.conversation.currentNodeId = action.payload.targetNodeId;
        runtime.message = action.payload.message;
      }
    },
    questPlaytestConversationEnded(state, action: PayloadAction<{ endingId: string }>) {
      const runtime = state.editor.playtest;
      const conversation = runtime.conversation;
      const definition = conversation ? runtime.dialogueDefinitions[conversation.definitionId] : null;
      const ending = definition?.nodes.find((node) => node.id === action.payload.endingId);
      const scenario = runtime.definition?.scenarioInstances.find((candidate) => candidate.id === runtime.currentScenarioInstanceId);
      const entity = scenario?.nodes.find((candidate) => candidate.id === conversation?.scenarioNodeId);
      if (!conversation || ending?.kind !== "ending" || entity?.kind !== "entity") return;
      if (ending.restartable) runtime.conversationResumeNodeIdByScenarioNodeId[entity.id] = ending.resumeNodeId ?? definition!.startNodeId;
      else if (!runtime.closedConversationScenarioNodeIds.includes(entity.id)) runtime.closedConversationScenarioNodeIds.push(entity.id);
      if (ending.endingKind === "success" && entity.dialogue) {
        const chainId = entity.dialogue.successEndingChainIdByEndingId[ending.id];
        const chain = entity.chains.find((candidate) => candidate.id === chainId);
        if (chain) {
          const firstCompletion = !runtime.completedChainIds.includes(chain.id);
          if (firstCompletion) runtime.completedChainIds.push(chain.id);
          if (!runtime.completedNodeIds.includes(entity.id)) runtime.completedNodeIds.push(entity.id);
          for (const reward of chain.successRewards.filter((candidate) => firstCompletion || candidate.repeatable)) {
            if (reward.recipient.mode === "player-choice") runtime.pendingRewardSelections.push({ id: nanoid(), itemDefinitionId: reward.itemDefinitionId, quantity: reward.quantity });
            else {
              const characterId = reward.recipient.mode === "character" ? reward.recipient.characterId : conversation.characterId;
              for (let count = 0; count < reward.quantity; count += 1) runtime.itemInstances.push({ id: nanoid(), itemDefinitionId: reward.itemDefinitionId, characterId });
            }
          }
        }
      }
      runtime.conversation = null;
    },
    questPlaytestItemAssigned: {
      prepare(payload: { itemDefinitionId: string; characterId: string }) {
        return { payload: { ...payload, instanceId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ itemDefinitionId: string; characterId: string; instanceId: string }>) {
        const runtime = state.editor.playtest;
        if (!runtime.definition?.itemDefinitions.some((item) => item.id === action.payload.itemDefinitionId) || !action.payload.characterId) return;
        runtime.itemInstances.push({ id: action.payload.instanceId, itemDefinitionId: action.payload.itemDefinitionId, characterId: action.payload.characterId });
      },
    },
    questPlaytestItemRemoved(state, action: PayloadAction<{ itemDefinitionId: string; characterId: string }>) {
      const index = state.editor.playtest.itemInstances.findIndex((instance) => instance.itemDefinitionId === action.payload.itemDefinitionId && instance.characterId === action.payload.characterId);
      if (index >= 0) state.editor.playtest.itemInstances.splice(index, 1);
    },
    questPlaytestChainAttempted(state, action: PayloadAction<{ chainId: string; characterId: string }>) {
      const runtime = state.editor.playtest;
      const scenario = runtime.definition?.scenarioInstances.find((candidate) => candidate.id === runtime.currentScenarioInstanceId);
      const chain = scenario?.nodes.flatMap((node) => node.kind === "entity" ? node.chains : []).find((candidate) => candidate.id === action.payload.chainId);
      if (!chain) return;
      const firstUnlock = !runtime.unlockedChainIds.includes(chain.id);
      if (firstUnlock) runtime.unlockedChainIds.push(chain.id);
      for (const requirement of chain.itemRequirements) {
        const consumptionCount = Number(firstUnlock && requirement.consumeOn.includes("unlock")) + Number(requirement.consumeOn.includes("attempt"));
        for (let count = 0; count < requirement.quantity * consumptionCount; count += 1) {
          const index = runtime.itemInstances.findIndex((instance) => instance.characterId === action.payload.characterId && instance.itemDefinitionId === requirement.itemDefinitionId);
          if (index >= 0) runtime.itemInstances.splice(index, 1);
        }
      }
    },
    questPlaytestChainResolved(state, action: PayloadAction<{ chainId: string; nodeId: string; characterId: string; outcome: "critical-success" | "success" | "failure" | "critical-failure" }>) {
      const runtime = state.editor.playtest;
      const scenario = runtime.definition?.scenarioInstances.find((candidate) => candidate.id === runtime.currentScenarioInstanceId);
      const node = scenario?.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      const chain = node?.kind === "entity" ? node.chains.find((candidate) => candidate.id === action.payload.chainId) : null;
      if (!chain) return;
      const consumptionTrigger = action.payload.outcome === "critical-failure" ? "critical-failure" : action.payload.outcome === "failure" ? "failure" : "success";
      for (const requirement of chain.itemRequirements.filter((candidate) => candidate.consumeOn.includes(consumptionTrigger))) {
        for (let count = 0; count < requirement.quantity; count += 1) {
          const index = runtime.itemInstances.findIndex((instance) => instance.characterId === action.payload.characterId && instance.itemDefinitionId === requirement.itemDefinitionId);
          if (index >= 0) runtime.itemInstances.splice(index, 1);
        }
      }
      if (action.payload.outcome !== "success" && action.payload.outcome !== "critical-success") return;
      const firstCompletion = !runtime.completedChainIds.includes(chain.id);
      if (firstCompletion) runtime.completedChainIds.push(chain.id);
      if (!runtime.completedNodeIds.includes(action.payload.nodeId)) runtime.completedNodeIds.push(action.payload.nodeId);
      for (const reward of chain.successRewards.filter((candidate) => firstCompletion || candidate.repeatable)) {
        if (reward.recipient.mode === "player-choice") {
          runtime.pendingRewardSelections.push({ id: nanoid(), itemDefinitionId: reward.itemDefinitionId, quantity: reward.quantity });
          continue;
        }
        const characterId = reward.recipient.mode === "character" ? reward.recipient.characterId : action.payload.characterId;
        for (let count = 0; count < reward.quantity; count += 1) runtime.itemInstances.push({ id: nanoid(), itemDefinitionId: reward.itemDefinitionId, characterId });
      }
    },
    questPlaytestPendingRewardAssigned(state, action: PayloadAction<{ pendingRewardId: string; characterId: string }>) {
      const runtime = state.editor.playtest;
      const pending = runtime.pendingRewardSelections.find((candidate) => candidate.id === action.payload.pendingRewardId);
      if (!pending || !action.payload.characterId) return;
      for (let count = 0; count < pending.quantity; count += 1) runtime.itemInstances.push({ id: nanoid(), itemDefinitionId: pending.itemDefinitionId, characterId: action.payload.characterId });
      runtime.pendingRewardSelections = runtime.pendingRewardSelections.filter((candidate) => candidate.id !== pending.id);
    },
    questPlaytestScenarioVictoryReached(state, action: PayloadAction<{ scenarioInstanceId: string; victoryNodeId: string }>) {
      const runtime = state.editor.playtest;
      if (!runtime.definition || runtime.currentScenarioInstanceId !== action.payload.scenarioInstanceId) return;
      const victoryKey = `${action.payload.scenarioInstanceId}:${action.payload.victoryNodeId}`;
      if (runtime.completedScenarioVictoryKeys.includes(victoryKey)) return;
      runtime.completedScenarioVictoryKeys.push(victoryKey);
      const next = nextScenarioAfterVictory(runtime.definition, action.payload.scenarioInstanceId, action.payload.victoryNodeId);
      if (next?.kind === "scenario") {
        runtime.currentScenarioInstanceId = next.scenarioInstanceId;
        runtime.loadedScenarioInstanceId = null;
        runtime.sourceDefinition = null;
        runtime.consoleVictory = null;
        runtime.status = "loading-scenario";
        runtime.message = "Advancing to the next quest scenario.";
      } else if (next?.kind === "quest-victory") {
        runtime.status = "quest-victory";
        runtime.message = "Quest victory reached. The playtest remains active until you return to the editor.";
      } else {
        runtime.message = "Scenario victory has no connected Quest Flow destination.";
      }
    },
    questPlaytestEnded(state) {
      state.editor.playtest = inactiveQuestPlaytestRuntime();
    },
    questItemDefinitionAdded: {
      prepare() {
        return { payload: { id: `quest-item-${nanoid().toLowerCase().replace(/[^a-z0-9]/g, "")}` } };
      },
      reducer(state, action: PayloadAction<{ id: string }>) {
        state.editor.document.itemDefinitions.push({
          id: action.payload.id,
          name: `Quest Item ${state.editor.document.itemDefinitions.length + 1}`,
          description: "",
          icon: "key",
          requiredSkill: null,
          unskilledDm: -2,
        });
        state.editor.selectedQuestItemId = action.payload.id;
      },
    },
    questItemDefinitionSelected(state, action: PayloadAction<string | null>) {
      if (action.payload && !state.editor.document.itemDefinitions.some((item) => item.id === action.payload)) return;
      state.editor.selectedQuestItemId = action.payload;
    },
    questItemDefinitionUpdated(state, action: PayloadAction<{
      id: string;
      name?: string;
      description?: string;
      icon?: string;
      requiredSkill?: string | null;
      unskilledDm?: number;
    }>) {
      const item = state.editor.document.itemDefinitions.find((candidate) => candidate.id === action.payload.id);
      if (!item) return;
      if (action.payload.name !== undefined) item.name = action.payload.name;
      if (action.payload.description !== undefined) item.description = action.payload.description;
      if (action.payload.icon !== undefined) item.icon = action.payload.icon;
      if (action.payload.requiredSkill !== undefined) item.requiredSkill = action.payload.requiredSkill;
      if (action.payload.unskilledDm !== undefined) item.unskilledDm = Math.min(0, Math.trunc(action.payload.unskilledDm));
    },
    questItemDefinitionRemoved(state, action: PayloadAction<string>) {
      state.editor.document.itemDefinitions = state.editor.document.itemDefinitions.filter((item) => item.id !== action.payload);
      for (const scenario of state.editor.document.scenarioInstances) {
        for (const node of scenario.nodes) {
          if (node.kind !== "entity") continue;
          for (const chain of node.chains) {
            chain.itemRequirements = chain.itemRequirements.filter((requirement) => requirement.itemDefinitionId !== action.payload);
            chain.successRewards = chain.successRewards.filter((reward) => reward.itemDefinitionId !== action.payload);
          }
        }
      }
      if (state.editor.selectedQuestItemId === action.payload) {
        state.editor.selectedQuestItemId = state.editor.document.itemDefinitions[0]?.id ?? null;
      }
    },
    graphViewChanged(state, action: PayloadAction<QuestEditorState["activeGraphView"]>) {
      state.editor.activeGraphView = action.payload;
      state.editor.interaction = { pendingConnection: null, draggingNode: null };
      state.editor.questFlowInteraction = { pendingConnection: null, draggingNode: null };
    },
    scenarioIndexRequested(state) {
      state.editor.scenarioIndex.status = "loading";
      state.editor.scenarioIndex.error = null;
    },
    scenarioIndexReceived(state, action: PayloadAction<QuestEditorScenarioSummary[]>) {
      state.editor.scenarioIndex.items = action.payload;
      state.editor.scenarioIndex.status = "ready";
      state.editor.scenarioIndex.error = null;
    },
    scenarioIndexFailed(state, action: PayloadAction<string>) {
      state.editor.scenarioIndex.status = "failed";
      state.editor.scenarioIndex.error = action.payload;
    },
    scenarioLoadStarted(state, action: PayloadAction<string>) {
      state.editor.scenarioIndex.loadingScenarioId = action.payload;
      state.editor.scenarioIndex.error = null;
    },
    scenarioLoadFinished(state) {
      state.editor.scenarioIndex.loadingScenarioId = null;
    },
    questFileIndexRequested(state) {
      state.editor.file.questIndex.status = "loading";
      state.editor.file.message = null;
    },
    questFileIndexReceived(state, action: PayloadAction<QuestFileSummary[]>) {
      state.editor.file.questIndex = { items: action.payload, status: "ready" };
    },
    questFileIndexFailed(state, action: PayloadAction<string>) {
      state.editor.file.questIndex.status = "failed";
      state.editor.file.message = { kind: "error", text: action.payload };
    },
    questHeaderMenuToggled(state, action: PayloadAction<"file" | "quest" | "view">) {
      state.editor.file.openHeaderMenu = state.editor.file.openHeaderMenu === action.payload ? null : action.payload;
    },
    questHeaderMenuClosed(state) {
      state.editor.file.openHeaderMenu = null;
    },
    questNewDialogOpened(state) {
      state.editor.file.openHeaderMenu = null;
      state.editor.file.dialog = { kind: "new", name: "" };
    },
    questOpenDialogOpened(state) {
      state.editor.file.openHeaderMenu = null;
      state.editor.file.dialog = { kind: "open", searchQuery: "", selectedQuestId: state.editor.file.questIndex.items[0]?.id ?? "" };
    },
    questSaveAsDialogOpened(state) {
      state.editor.file.openHeaderMenu = null;
      state.editor.file.dialog = { kind: "save-as", name: state.editor.document.title };
    },
    questFileDialogClosed(state) {
      if (state.editor.file.operation !== "idle") return;
      state.editor.file.dialog = { kind: "closed" };
    },
    questDialogNameChanged(state, action: PayloadAction<string>) {
      if (state.editor.file.dialog.kind === "new" || state.editor.file.dialog.kind === "save-as") {
        state.editor.file.dialog.name = action.payload;
      }
    },
    questOpenSearchChanged(state, action: PayloadAction<string>) {
      if (state.editor.file.dialog.kind === "open") state.editor.file.dialog.searchQuery = action.payload;
    },
    questOpenSelectionChanged(state, action: PayloadAction<string>) {
      if (state.editor.file.dialog.kind === "open") state.editor.file.dialog.selectedQuestId = action.payload;
    },
    questFileOperationStarted(state, action: PayloadAction<QuestEditorState["file"]["operation"]>) {
      state.editor.file.operation = action.payload;
      state.editor.file.message = null;
    },
    questFileOperationFailed(state, action: PayloadAction<string>) {
      state.editor.file.operation = "idle";
      state.editor.file.message = { kind: "error", text: action.payload };
    },
    questDocumentActivated(state, action: PayloadAction<{ definition: QuestDefinitionFile; summary: QuestFileSummary; message: string }>) {
      state.editor.document = cloneQuestDefinition(action.payload.definition);
      state.editor.baseline = cloneQuestDefinition(action.payload.definition);
      state.editor.file.currentQuest = action.payload.summary;
      state.editor.file.operation = "idle";
      state.editor.file.message = { kind: "success", text: action.payload.message };
      state.editor.file.dialog = { kind: "closed" };
      state.editor.file.openHeaderMenu = null;
      state.editor.activeGraphView = "quest-flow";
      state.editor.activeScenarioInstanceId = action.payload.definition.scenarioInstances[0]?.id ?? null;
      state.editor.selection = { nodeId: null, chainId: null, connectionId: null };
      state.editor.interaction = { pendingConnection: null, draggingNode: null };
      state.editor.questFlowSelection = { nodeId: null, connectionId: null };
      state.editor.selectedQuestItemId = action.payload.definition.itemDefinitions[0]?.id ?? null;
      state.editor.questFlowInteraction = { pendingConnection: null, draggingNode: null };
    },
    questDocumentSaved(state, action: PayloadAction<{ definition: QuestDefinitionFile; summary: QuestFileSummary; message: string }>) {
      state.editor.document = cloneQuestDefinition(action.payload.definition);
      state.editor.baseline = cloneQuestDefinition(action.payload.definition);
      state.editor.file.currentQuest = action.payload.summary;
      state.editor.file.operation = "idle";
      state.editor.file.message = { kind: "success", text: action.payload.message };
      state.editor.file.dialog = { kind: "closed" };
    },
    questDraftDiscarded(state) {
      state.editor.document = cloneQuestDefinition(state.editor.baseline);
      state.editor.activeScenarioInstanceId = state.editor.document.scenarioInstances[0]?.id ?? null;
      state.editor.selection = { nodeId: null, chainId: null, connectionId: null };
      state.editor.questFlowSelection = { nodeId: null, connectionId: null };
      state.editor.selectedQuestItemId = state.editor.document.itemDefinitions[0]?.id ?? null;
      state.editor.interaction = { pendingConnection: null, draggingNode: null };
      state.editor.questFlowInteraction = { pendingConnection: null, draggingNode: null };
      state.editor.file.message = { kind: "success", text: "Discarded quest draft changes." };
    },
    questHudLayoutsHydrated(state, action: PayloadAction<Partial<QuestEditorHudLayouts>>) {
      (Object.keys(action.payload) as QuestEditorHudId[]).forEach((id) => {
        const layout = action.payload[id];
        if (layout) state.editor.hudLayouts[id] = layout;
      });
      state.editor.hudLayoutsReady = true;
    },
    questHudLayoutChanged(state, action: PayloadAction<{ id: QuestEditorHudId; layout: QuestEditorHudLayouts[QuestEditorHudId] }>) {
      state.editor.hudLayouts[action.payload.id] = action.payload.layout;
    },
    questHudVisibilityToggled(state, action: PayloadAction<QuestEditorHudId>) {
      state.editor.hudLayouts[action.payload].visible = !state.editor.hudLayouts[action.payload].visible;
    },
    questHudLayoutsReset(state) {
      state.editor.hudLayouts = freshDefaultQuestEditorHudLayouts();
    },
    scenarioInstanceAdded: {
      prepare(payload: {
        sourceScenarioId: string;
        title: string;
        entities: QuestScenarioEntity[];
      }) {
        const scenarioInstanceId = nanoid();
        const startId = nanoid();
        const victoryId = nanoid();
        const questFlowNodeId = nanoid();
        const nodes: QuestGraphNode[] = [
          { id: startId, kind: "start", title: "Scenario start", position: { x: 48, y: 240 } },
          ...payload.entities.map((entity, index): QuestEntityNode => ({
            id: nanoid(),
            kind: "entity",
            entityType: entity.entityType,
            sourcePlacementId: entity.sourcePlacementId,
            title: entity.title,
            description: "",
            position: { x: 340 + (index % 2) * 270, y: 80 + Math.floor(index / 2) * 190 },
            chains: [],
          })),
          { id: victoryId, kind: "victory", title: "Victory", description: "", position: { x: 880, y: 240 } },
        ];
        return {
          payload: {
            scenario: {
              id: scenarioInstanceId,
              sourceScenarioId: payload.sourceScenarioId,
              title: payload.title,
              nodes,
              connections: [],
            } satisfies QuestScenarioInstance,
            questFlowNode: {
              id: questFlowNodeId,
              kind: "scenario",
              scenarioInstanceId,
              position: { x: 360 + (payload.entities.length % 2) * 40, y: 120 },
            } satisfies QuestFlowNode,
          },
        };
      },
      reducer(state, action: PayloadAction<{ scenario: QuestScenarioInstance; questFlowNode: QuestFlowNode }>) {
        const scenarioFlowCount = state.editor.document.questFlow.nodes
          .filter((node) => node.kind === "scenario").length;
        state.editor.document.scenarioInstances.push(action.payload.scenario);
        state.editor.document.questFlow.nodes.push({
          ...action.payload.questFlowNode,
          position: {
            x: 340 + (scenarioFlowCount % 2) * 330,
            y: 90 + Math.floor(scenarioFlowCount / 2) * 220,
          },
        });
        state.editor.activeScenarioInstanceId = action.payload.scenario.id;
        state.editor.selection = { nodeId: null, chainId: null, connectionId: null };
        state.editor.interaction = { pendingConnection: null, draggingNode: null };
      },
    },
    activeScenarioChanged(state, action: PayloadAction<string>) {
      if (!state.editor.document.scenarioInstances.some((scenario) => scenario.id === action.payload)) return;
      state.editor.activeScenarioInstanceId = action.payload;
      state.editor.selection = { nodeId: null, chainId: null, connectionId: null };
      state.editor.interaction = { pendingConnection: null, draggingNode: null };
    },
    scenarioInstanceRemoved(state, action: PayloadAction<string>) {
      const scenarioIndex = state.editor.document.scenarioInstances.findIndex((scenario) => scenario.id === action.payload);
      if (scenarioIndex < 0) return;
      const removedFlowNodeIds = new Set(state.editor.document.questFlow.nodes
        .filter((node) => node.kind === "scenario" && node.scenarioInstanceId === action.payload)
        .map((node) => node.id));
      state.editor.document.scenarioInstances.splice(scenarioIndex, 1);
      state.editor.document.questFlow.nodes = state.editor.document.questFlow.nodes
        .filter((node) => !removedFlowNodeIds.has(node.id));
      state.editor.document.questFlow.connections = state.editor.document.questFlow.connections
        .filter((connection) => !removedFlowNodeIds.has(connection.sourceNodeId) && !removedFlowNodeIds.has(connection.targetNodeId));
      if (state.editor.activeScenarioInstanceId === action.payload) {
        const nextScenario = state.editor.document.scenarioInstances[Math.min(scenarioIndex, state.editor.document.scenarioInstances.length - 1)] ?? null;
        state.editor.activeScenarioInstanceId = nextScenario?.id ?? null;
        state.editor.selection = { nodeId: null, chainId: null, connectionId: null };
        state.editor.interaction = { pendingConnection: null, draggingNode: null };
      }
      if (state.editor.questFlowSelection.nodeId && removedFlowNodeIds.has(state.editor.questFlowSelection.nodeId)) {
        state.editor.questFlowSelection = { nodeId: null, connectionId: null };
      } else if (state.editor.questFlowSelection.connectionId && !state.editor.document.questFlow.connections.some((connection) => connection.id === state.editor.questFlowSelection.connectionId)) {
        state.editor.questFlowSelection.connectionId = null;
      }
      const pendingQuestLink = state.editor.questFlowInteraction.pendingConnection;
      if (pendingQuestLink && removedFlowNodeIds.has(pendingQuestLink.sourceNodeId)) {
        state.editor.questFlowInteraction.pendingConnection = null;
      }
    },
    nodeSelected(state, action: PayloadAction<string | null>) {
      state.editor.selection.nodeId = action.payload;
      state.editor.selection.chainId = null;
      state.editor.selection.connectionId = null;
    },
    chainSelected(state, action: PayloadAction<string | null>) {
      state.editor.selection.chainId = action.payload;
    },
    nodeDragStarted(state, action: PayloadAction<{ nodeId: string; offset: { x: number; y: number } }>) {
      state.editor.interaction.draggingNode = action.payload;
      state.editor.selection = { nodeId: action.payload.nodeId, chainId: null, connectionId: null };
    },
    nodeMoved(state, action: PayloadAction<{ nodeId: string; position: { x: number; y: number } }>) {
      const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node) node.position = action.payload.position;
    },
    nodeDragEnded(state) {
      state.editor.interaction.draggingNode = null;
    },
    connectionStarted(state, action: PayloadAction<{ sourceNodeId: string; sourceChainId: string | null }>) {
      state.editor.interaction.pendingConnection = action.payload;
    },
    connectionCancelled(state) {
      state.editor.interaction.pendingConnection = null;
    },
    connectionTargetSelected: {
      prepare(targetNodeId: string) {
        return { payload: { targetNodeId, connectionId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ targetNodeId: string; connectionId: string }>) {
        const scenario = activeScenario(state);
        const pending = state.editor.interaction.pendingConnection;
        if (!scenario || !pending || pending.sourceNodeId === action.payload.targetNodeId) return;
        const duplicate = scenario.connections.some((connection) => connection.sourceNodeId === pending.sourceNodeId
          && connection.sourceChainId === pending.sourceChainId
          && connection.targetNodeId === action.payload.targetNodeId);
        if (!duplicate) {
          scenario.connections.push({
            id: action.payload.connectionId,
            sourceNodeId: pending.sourceNodeId,
            sourceChainId: pending.sourceChainId,
            targetNodeId: action.payload.targetNodeId,
          });
        }
        state.editor.interaction.pendingConnection = null;
      },
    },
    connectionRemoved(state, action: PayloadAction<string>) {
      const scenario = activeScenario(state);
      if (scenario) scenario.connections = scenario.connections.filter((connection) => connection.id !== action.payload);
      if (state.editor.selection.connectionId === action.payload) state.editor.selection.connectionId = null;
    },
    connectionSelected(state, action: PayloadAction<string | null>) {
      const scenario = activeScenario(state);
      if (action.payload && !scenario?.connections.some((connection) => connection.id === action.payload)) return;
      state.editor.selection = { nodeId: null, chainId: null, connectionId: action.payload };
    },
    chainAdded: {
      prepare(nodeId: string) {
        return { payload: { nodeId, chainId: nanoid(), taskId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ nodeId: string; chainId: string; taskId: string }>) {
        const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId);
        if (node?.kind !== "entity") return;
        node.chains.push({
          id: action.payload.chainId,
          name: `Skill chain ${node.chains.length + 1}`,
          description: "",
          tasks: [{ id: action.payload.taskId, skill: node.entityType === "interactive-human" ? "Persuade" : "Electronics", difficulty: "average" }],
          itemRequirements: [],
          successRewards: [],
        });
        state.editor.selection = { nodeId: node.id, chainId: action.payload.chainId, connectionId: null };
      },
    },
    chainUpdated(state, action: PayloadAction<{ chainId: string; name?: string; description?: string }>) {
      const chain = selectedEntity(state)?.chains.find((candidate) => candidate.id === action.payload.chainId);
      if (!chain) return;
      if (action.payload.name !== undefined) chain.name = action.payload.name;
      if (action.payload.description !== undefined) chain.description = action.payload.description;
    },
    taskAdded: {
      prepare(chainId: string) {
        return { payload: { chainId, taskId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ chainId: string; taskId: string }>) {
        const chain = selectedEntity(state)?.chains.find((candidate) => candidate.id === action.payload.chainId);
        if (chain) chain.tasks.push({ id: action.payload.taskId, skill: "Skill", difficulty: "average" });
      },
    },
    taskUpdated(state, action: PayloadAction<{
      chainId: string;
      taskId: string;
      skill?: string;
      difficulty?: TravellerTaskDifficulty;
    }>) {
      const chain = selectedEntity(state)?.chains.find((candidate) => candidate.id === action.payload.chainId);
      const task = chain?.tasks.find((candidate) => candidate.id === action.payload.taskId);
      if (!task) return;
      if (action.payload.skill !== undefined) task.skill = action.payload.skill;
      if (action.payload.difficulty !== undefined) task.difficulty = action.payload.difficulty;
    },
    taskRemoved(state, action: PayloadAction<{ chainId: string; taskId: string }>) {
      const chain = selectedEntity(state)?.chains.find((candidate) => candidate.id === action.payload.chainId);
      if (chain && chain.tasks.length > 1) {
        chain.tasks = chain.tasks.filter((task) => task.id !== action.payload.taskId);
      }
    },
    chainItemRequirementAdded: {
      prepare(itemDefinitionId: string) {
        return { payload: { id: nanoid(), itemDefinitionId } };
      },
      reducer(state, action: PayloadAction<{ id: string; itemDefinitionId: string }>) {
        const chain = selectedChain(state);
        if (!chain || !state.editor.document.itemDefinitions.some((item) => item.id === action.payload.itemDefinitionId)) return;
        chain.itemRequirements.push({ id: action.payload.id, itemDefinitionId: action.payload.itemDefinitionId, quantity: 1, consumeOn: [] });
      },
    },
    chainItemRequirementUpdated(state, action: PayloadAction<{
      requirementId: string;
      itemDefinitionId?: string;
      quantity?: number;
      consumeOn?: QuestItemConsumptionTrigger[];
    }>) {
      const requirement = selectedChain(state)?.itemRequirements.find((item) => item.id === action.payload.requirementId);
      if (!requirement) return;
      if (action.payload.itemDefinitionId !== undefined && state.editor.document.itemDefinitions.some((item) => item.id === action.payload.itemDefinitionId)) requirement.itemDefinitionId = action.payload.itemDefinitionId;
      if (action.payload.quantity !== undefined) requirement.quantity = Math.max(1, Math.trunc(action.payload.quantity));
      if (action.payload.consumeOn !== undefined) requirement.consumeOn = [...new Set(action.payload.consumeOn)];
    },
    chainItemRequirementRemoved(state, action: PayloadAction<string>) {
      const chain = selectedChain(state);
      if (chain) chain.itemRequirements = chain.itemRequirements.filter((item) => item.id !== action.payload);
    },
    chainItemRewardAdded: {
      prepare(itemDefinitionId: string) {
        return { payload: { id: nanoid(), itemDefinitionId } };
      },
      reducer(state, action: PayloadAction<{ id: string; itemDefinitionId: string }>) {
        const chain = selectedChain(state);
        if (!chain || !state.editor.document.itemDefinitions.some((item) => item.id === action.payload.itemDefinitionId)) return;
        chain.successRewards.push({ id: action.payload.id, itemDefinitionId: action.payload.itemDefinitionId, quantity: 1, repeatable: false, recipient: { mode: "performer" } });
      },
    },
    chainItemRewardUpdated(state, action: PayloadAction<{
      rewardId: string;
      itemDefinitionId?: string;
      quantity?: number;
      repeatable?: boolean;
      recipient?: QuestItemRewardRecipient;
    }>) {
      const reward = selectedChain(state)?.successRewards.find((item) => item.id === action.payload.rewardId);
      if (!reward) return;
      if (action.payload.itemDefinitionId !== undefined && state.editor.document.itemDefinitions.some((item) => item.id === action.payload.itemDefinitionId)) reward.itemDefinitionId = action.payload.itemDefinitionId;
      if (action.payload.quantity !== undefined) reward.quantity = Math.max(1, Math.trunc(action.payload.quantity));
      if (action.payload.repeatable !== undefined) reward.repeatable = action.payload.repeatable;
      if (action.payload.recipient !== undefined) reward.recipient = action.payload.recipient;
    },
    chainItemRewardRemoved(state, action: PayloadAction<string>) {
      const chain = selectedChain(state);
      if (chain) chain.successRewards = chain.successRewards.filter((item) => item.id !== action.payload);
    },
    victoryNodeAdded: {
      prepare() {
        return { payload: { nodeId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ nodeId: string }>) {
        const scenario = activeScenario(state);
        if (!scenario) return;
        const count = scenario.nodes.filter((node) => node.kind === "victory").length;
        scenario.nodes.push({
          id: action.payload.nodeId,
          kind: "victory",
          title: `Victory ${count + 1}`,
          description: "",
          position: { x: 880, y: 240 + count * 160 },
        });
      },
    },
    victoryNodeUpdated(state, action: PayloadAction<{ nodeId: string; title?: string; description?: string }>) {
      const node = activeScenario(state)?.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node?.kind !== "victory") return;
      if (action.payload.title !== undefined) node.title = action.payload.title;
      if (action.payload.description !== undefined) node.description = action.payload.description;
    },
    questFlowNodeSelected(state, action: PayloadAction<string | null>) {
      state.editor.questFlowSelection.nodeId = action.payload;
      state.editor.questFlowSelection.connectionId = null;
    },
    questFlowNodeDragStarted(state, action: PayloadAction<{ nodeId: string; offset: { x: number; y: number } }>) {
      state.editor.questFlowInteraction.draggingNode = action.payload;
      state.editor.questFlowSelection.nodeId = action.payload.nodeId;
      state.editor.questFlowSelection.connectionId = null;
    },
    questFlowNodeMoved(state, action: PayloadAction<{ nodeId: string; position: { x: number; y: number } }>) {
      const node = state.editor.document.questFlow.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node) node.position = action.payload.position;
    },
    questFlowNodeDragEnded(state) {
      state.editor.questFlowInteraction.draggingNode = null;
    },
    questFlowConnectionStarted(state, action: PayloadAction<{ sourceNodeId: string; sourceScenarioVictoryId: string | null }>) {
      state.editor.questFlowInteraction.pendingConnection = action.payload;
    },
    questFlowConnectionCancelled(state) {
      state.editor.questFlowInteraction.pendingConnection = null;
    },
    questFlowConnectionTargetSelected: {
      prepare(targetNodeId: string) {
        return { payload: { targetNodeId, connectionId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ targetNodeId: string; connectionId: string }>) {
        const graph = state.editor.document.questFlow;
        const pending = state.editor.questFlowInteraction.pendingConnection;
        const source = graph.nodes.find((node) => node.id === pending?.sourceNodeId);
        const target = graph.nodes.find((node) => node.id === action.payload.targetNodeId);
        if (!pending || !source || !target || source.id === target.id || target.kind === "quest-start") return;
        if (source.kind === "quest-start" && target.kind !== "scenario") return;
        if (source.kind === "scenario" && !pending.sourceScenarioVictoryId) return;
        if (source.kind === "quest-victory") return;
        graph.connections = graph.connections.filter((connection) => !(
          connection.sourceNodeId === pending.sourceNodeId
          && connection.sourceScenarioVictoryId === pending.sourceScenarioVictoryId
        ));
        graph.connections.push({
          id: action.payload.connectionId,
          sourceNodeId: pending.sourceNodeId,
          sourceScenarioVictoryId: pending.sourceScenarioVictoryId,
          targetNodeId: action.payload.targetNodeId,
        });
        state.editor.questFlowInteraction.pendingConnection = null;
      },
    },
    questFlowConnectionRemoved(state, action: PayloadAction<string>) {
      state.editor.document.questFlow.connections = state.editor.document.questFlow.connections
        .filter((connection) => connection.id !== action.payload);
      if (state.editor.questFlowSelection.connectionId === action.payload) state.editor.questFlowSelection.connectionId = null;
    },
    questFlowConnectionSelected(state, action: PayloadAction<string | null>) {
      if (action.payload && !state.editor.document.questFlow.connections.some((connection) => connection.id === action.payload)) return;
      state.editor.questFlowSelection = { nodeId: null, connectionId: action.payload };
    },
    questVictoryNodeAdded: {
      prepare() {
        return { payload: { nodeId: nanoid() } };
      },
      reducer(state, action: PayloadAction<{ nodeId: string }>) {
        const graph = state.editor.document.questFlow;
        const count = graph.nodes.filter((node) => node.kind === "quest-victory").length;
        graph.nodes.push({
          id: action.payload.nodeId,
          kind: "quest-victory",
          title: `Quest victory ${count + 1}`,
          description: "",
          position: { x: 920, y: 160 + count * 170 },
        });
        state.editor.questFlowSelection.nodeId = action.payload.nodeId;
        state.editor.questFlowSelection.connectionId = null;
      },
    },
    questVictoryNodeUpdated(state, action: PayloadAction<{ nodeId: string; title?: string; description?: string }>) {
      const node = state.editor.document.questFlow.nodes.find((candidate) => candidate.id === action.payload.nodeId);
      if (node?.kind !== "quest-victory") return;
      if (action.payload.title !== undefined) node.title = action.payload.title;
      if (action.payload.description !== undefined) node.description = action.payload.description;
    },
  },
});

export const {
  activeScenarioChanged,
  dialogueDefinitionCached,
  dialogueEditorConnectionCancelled,
  dialogueEditorConnectionRemoved,
  dialogueEditorConnectionSelected,
  dialogueEditorConnectionStarted,
  dialogueEditorConnectionTargetSelected,
  dialogueEditorDescriptionChanged,
  dialogueEditorDocumentActivated,
  dialogueEditorDocumentSaved,
  dialogueEditorNew,
  dialogueEditorNodeAdded,
  dialogueEditorNodeDragEnded,
  dialogueEditorNodeDragStarted,
  dialogueEditorNodeMoved,
  dialogueEditorNodeRemoved,
  dialogueEditorNodeSelected,
  dialogueEditorNodeUpdated,
  dialogueEditorOperationFailed,
  dialogueEditorOperationStarted,
  dialogueEditorTaskAdded,
  dialogueEditorTaskRemoved,
  dialogueEditorTaskUpdated,
  dialogueEditorTitleChanged,
  dialogueEditorVariablesChanged,
  dialogueLibraryFailed,
  dialogueLibraryReceived,
  dialogueLibraryRequested,
  entityDialogueAssigned,
  entityDialogueEndingMapped,
  entityDialogueVariableChanged,
  chainAdded,
  chainItemRequirementAdded,
  chainItemRequirementRemoved,
  chainItemRequirementUpdated,
  chainItemRewardAdded,
  chainItemRewardRemoved,
  chainItemRewardUpdated,
  chainSelected,
  chainUpdated,
  connectionCancelled,
  connectionRemoved,
  connectionSelected,
  connectionStarted,
  connectionTargetSelected,
  graphViewChanged,
  nodeDragEnded,
  nodeDragStarted,
  nodeMoved,
  nodeSelected,
  questDescriptionChanged,
  questPlaytestEnded,
  questPlaytestConversationAdvanced,
  questPlaytestConversationEnded,
  questPlaytestConversationStarted,
  questPlaytestConversationSkillResolved,
  questPlaytestDialogueLoaded,
  questPlaytestDialogueLoadFailed,
  questPlaytestChainAttempted,
  questPlaytestChainResolved,
  questPlaytestItemAssigned,
  questPlaytestItemRemoved,
  questPlaytestPendingRewardAssigned,
  questPlaytestScenarioLoadFailed,
  questPlaytestScenarioLoaded,
  questPlaytestScenarioLoadRequested,
  questPlaytestScenarioVictoryReached,
  questPlaytestStarted,
  questItemDefinitionAdded,
  questItemDefinitionRemoved,
  questItemDefinitionSelected,
  questItemDefinitionUpdated,
  questDocumentActivated,
  questDocumentSaved,
  questDraftDiscarded,
  questDialogNameChanged,
  questFileDialogClosed,
  questFileIndexFailed,
  questFileIndexReceived,
  questFileIndexRequested,
  questFileOperationFailed,
  questFileOperationStarted,
  questHeaderMenuClosed,
  questHeaderMenuToggled,
  questHudLayoutChanged,
  questHudLayoutsHydrated,
  questHudLayoutsReset,
  questHudVisibilityToggled,
  questNewDialogOpened,
  questOpenDialogOpened,
  questOpenSearchChanged,
  questOpenSelectionChanged,
  questSaveAsDialogOpened,
  questTitleChanged,
  questFlowConnectionCancelled,
  questFlowConnectionRemoved,
  questFlowConnectionSelected,
  questFlowConnectionStarted,
  questFlowConnectionTargetSelected,
  questFlowNodeDragEnded,
  questFlowNodeDragStarted,
  questFlowNodeMoved,
  questFlowNodeSelected,
  questVictoryNodeAdded,
  questVictoryNodeUpdated,
  scenarioIndexFailed,
  scenarioIndexReceived,
  scenarioIndexRequested,
  scenarioLoadFinished,
  scenarioLoadStarted,
  scenarioInstanceAdded,
  scenarioInstanceRemoved,
  taskAdded,
  taskRemoved,
  taskUpdated,
  victoryNodeAdded,
  victoryNodeUpdated,
} = questSlice.actions;

export default questSlice.reducer;
