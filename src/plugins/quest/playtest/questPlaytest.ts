import type { TacticalConsoleOperation, TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import type { QuestDefinitionFile, QuestScenarioInstance, QuestTaskChain } from "../editor/types";
import type { DialogueDefinitionFile } from "../dialogue/types";

export type QuestPlaytestMode = "entire-quest" | "selected-scenario";

export type QuestPlaytestItemInstance = {
  id: string;
  itemDefinitionId: string;
  characterId: string;
};

export type QuestPlaytestRuntime = {
  status: "inactive" | "loading-scenario" | "setup" | "active" | "quest-victory" | "error";
  mode: QuestPlaytestMode;
  definition: QuestDefinitionFile | null;
  currentScenarioInstanceId: string | null;
  loadedScenarioInstanceId: string | null;
  sourceDefinition: import("@/plugins/characterCombat/tacticalScenarioDefinitions").TacticalScenarioDefinitionFile | null;
  consoleVictory: TacticalConsoleVictoryDefinitionFile | null;
  itemInstances: QuestPlaytestItemInstance[];
  completedNodeIds: string[];
  completedChainIds: string[];
  unlockedChainIds: string[];
  completedScenarioVictoryKeys: string[];
  pendingRewardSelections: { id: string; itemDefinitionId: string; quantity: number }[];
  message: string | null;
  dialogueDefinitions: Record<string, DialogueDefinitionFile>;
  conversation: null | {
    scenarioNodeId: string;
    definitionId: string;
    currentNodeId: string;
    characterId: string;
    terminalId: string;
  };
  conversationResumeNodeIdByScenarioNodeId: Record<string, string>;
  closedConversationScenarioNodeIds: string[];
};

export const inactiveQuestPlaytestRuntime = (): QuestPlaytestRuntime => ({
  status: "inactive",
  mode: "entire-quest",
  definition: null,
  currentScenarioInstanceId: null,
  loadedScenarioInstanceId: null,
  sourceDefinition: null,
  consoleVictory: null,
  itemInstances: [],
  completedNodeIds: [],
  completedChainIds: [],
  unlockedChainIds: [],
  completedScenarioVictoryKeys: [],
  pendingRewardSelections: [],
  message: null,
  dialogueDefinitions: {},
  conversation: null,
  conversationResumeNodeIdByScenarioNodeId: {},
  closedConversationScenarioNodeIds: [],
});

export const firstQuestScenarioInstanceId = (definition: QuestDefinitionFile) => {
  const start = definition.questFlow.nodes.find((node) => node.kind === "quest-start");
  const connection = definition.questFlow.connections.find((candidate) => candidate.sourceNodeId === start?.id);
  const target = definition.questFlow.nodes.find((node) => node.id === connection?.targetNodeId);
  return target?.kind === "scenario" ? target.scenarioInstanceId : null;
};

export const questChainOperationId = (nodeId: string, chainId: string) => `quest:${nodeId}:${chainId}`;

export const questChainForOperation = (scenario: QuestScenarioInstance, operationId: string): { nodeId: string; chain: QuestTaskChain } | null => {
  for (const node of scenario.nodes) {
    if (node.kind !== "entity") continue;
    const chain = node.chains.find((candidate) => questChainOperationId(node.id, candidate.id) === operationId);
    if (chain) return { nodeId: node.id, chain };
  }
  return null;
};

export const questScenarioConsoleVictory = (questId: string, scenario: QuestScenarioInstance): TacticalConsoleVictoryDefinitionFile => {
  const entityNodes = scenario.nodes.filter((node) => node.kind === "entity");
  const operations: TacticalConsoleOperation[] = entityNodes.flatMap((node) => node.chains.map((chain) => {
    const incoming = scenario.connections.filter((connection) => connection.targetNodeId === node.id);
    const initiallyAvailable = incoming.some((connection) => scenario.nodes.find((candidate) => candidate.id === connection.sourceNodeId)?.kind === "start") || incoming.length === 0;
    const predecessorIds = initiallyAvailable ? [] : incoming.flatMap((connection) => {
      const source = scenario.nodes.find((candidate) => candidate.id === connection.sourceNodeId);
      if (source?.kind !== "entity") return [];
      return source.chains.filter((candidate) => !connection.sourceChainId || candidate.id === connection.sourceChainId).map((candidate) => questChainOperationId(source.id, candidate.id));
    });
    if (!initiallyAvailable && predecessorIds.length === 0) predecessorIds.push(`quest-unreachable:${node.id}`);
    const outgoing = scenario.connections.find((connection) => connection.sourceNodeId === node.id && connection.sourceChainId === chain.id);
    const target = scenario.nodes.find((candidate) => candidate.id === outgoing?.targetNodeId);
    const unlockIds = target?.kind === "entity" ? target.chains.map((candidate) => questChainOperationId(target.id, candidate.id)) : [];
    return {
      id: questChainOperationId(node.id, chain.id),
      consolePlacementId: node.sourcePlacementId,
      label: chain.name,
      prerequisites: { mode: "any", operationIds: [...new Set(predecessorIds)] },
      checks: chain.tasks.map((task, index) => ({ ...task, apCost: index === 0 ? 6 : 0 })),
      criticalSuccessNextCheckModifier: 2,
      criticalFailureNextCheckModifier: -2,
      result: target?.kind === "victory" ? { type: "victory" } : { type: "unlock", operationIds: unlockIds },
      quest: { questId, scenarioInstanceId: scenario.id, nodeId: node.id, chainId: chain.id, scenarioVictoryNodeId: target?.kind === "victory" ? target.id : null },
    };
  }));
  return { schemaVersion: 1, id: `${questId}:${scenario.id}`, scenarioId: scenario.sourceScenarioId, operations };
};

export const characterHasQuestRequirement = (runtime: QuestPlaytestRuntime, chain: QuestTaskChain, characterId: string) => chain.itemRequirements.every((requirement) => runtime.itemInstances.filter((instance) => instance.characterId === characterId && instance.itemDefinitionId === requirement.itemDefinitionId).length >= requirement.quantity);

export const nextScenarioAfterVictory = (definition: QuestDefinitionFile, scenarioInstanceId: string, victoryNodeId: string) => {
  const sourceFlowNode = definition.questFlow.nodes.find((node) => node.kind === "scenario" && node.scenarioInstanceId === scenarioInstanceId);
  const connection = definition.questFlow.connections.find((candidate) => candidate.sourceNodeId === sourceFlowNode?.id && candidate.sourceScenarioVictoryId === victoryNodeId);
  const target = definition.questFlow.nodes.find((node) => node.id === connection?.targetNodeId);
  if (target?.kind === "scenario") return { kind: "scenario" as const, scenarioInstanceId: target.scenarioInstanceId };
  if (target?.kind === "quest-victory") return { kind: "quest-victory" as const, questVictoryNodeId: target.id };
  return null;
};
