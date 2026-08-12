import type { TravellerTaskDifficulty } from "@/plugins/characterCombat/tacticalConsoleVictory";

export type QuestGraphPoint = { x: number; y: number };

export type QuestSkillTask = {
  id: string;
  skill: string;
  difficulty: TravellerTaskDifficulty;
};

export const QUEST_ITEM_CONSUMPTION_TRIGGERS = [
  "unlock",
  "attempt",
  "success",
  "failure",
  "critical-failure",
] as const;

export type QuestItemConsumptionTrigger = typeof QUEST_ITEM_CONSUMPTION_TRIGGERS[number];

export type QuestItemDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredSkill: string | null;
  unskilledDm: number;
};

export type QuestItemRequirement = {
  id: string;
  itemDefinitionId: string;
  quantity: number;
  consumeOn: QuestItemConsumptionTrigger[];
};

export type QuestItemRewardRecipient =
  | { mode: "performer" }
  | { mode: "player-choice" }
  | { mode: "character"; characterId: string };

export type QuestItemReward = {
  id: string;
  itemDefinitionId: string;
  quantity: number;
  repeatable: boolean;
  recipient: QuestItemRewardRecipient;
};

export type QuestTaskChain = {
  id: string;
  name: string;
  description: string;
  tasks: QuestSkillTask[];
  itemRequirements: QuestItemRequirement[];
  successRewards: QuestItemReward[];
};

export type QuestStartNode = {
  id: string;
  kind: "start";
  title: string;
  position: QuestGraphPoint;
};

export type QuestEntityNode = {
  id: string;
  kind: "entity";
  entityType: "console" | "interactive-human";
  sourcePlacementId: string;
  title: string;
  description: string;
  position: QuestGraphPoint;
  chains: QuestTaskChain[];
};

export type QuestVictoryNode = {
  id: string;
  kind: "victory";
  title: string;
  description: string;
  position: QuestGraphPoint;
};

export type QuestGraphNode = QuestStartNode | QuestEntityNode | QuestVictoryNode;

export type QuestGraphConnection = {
  id: string;
  sourceNodeId: string;
  sourceChainId: string | null;
  targetNodeId: string;
};

export type QuestScenarioEntity = {
  sourcePlacementId: string;
  entityType: QuestEntityNode["entityType"];
  title: string;
};

export type QuestScenarioInstance = {
  id: string;
  sourceScenarioId: string;
  title: string;
  nodes: QuestGraphNode[];
  connections: QuestGraphConnection[];
};

export type QuestEditorScenarioSummary = {
  id: string;
  title: string;
  isDefault: boolean;
};

export type QuestFlowStartNode = {
  id: string;
  kind: "quest-start";
  title: string;
  position: QuestGraphPoint;
};

export type QuestFlowScenarioNode = {
  id: string;
  kind: "scenario";
  scenarioInstanceId: string;
  position: QuestGraphPoint;
};

export type QuestFlowVictoryNode = {
  id: string;
  kind: "quest-victory";
  title: string;
  description: string;
  position: QuestGraphPoint;
};

export type QuestFlowNode = QuestFlowStartNode | QuestFlowScenarioNode | QuestFlowVictoryNode;

export type QuestFlowConnection = {
  id: string;
  sourceNodeId: string;
  sourceScenarioVictoryId: string | null;
  targetNodeId: string;
};

export type QuestFlowGraph = {
  nodes: QuestFlowNode[];
  connections: QuestFlowConnection[];
};

export type QuestDefinitionFile = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  itemDefinitions: QuestItemDefinition[];
  scenarioInstances: QuestScenarioInstance[];
  questFlow: QuestFlowGraph;
};

export const cloneQuestDefinition = (definition: QuestDefinitionFile): QuestDefinitionFile => (
  JSON.parse(JSON.stringify(definition)) as QuestDefinitionFile
);

export const createEmptyQuestDefinition = (
  id = "new-quest",
  title = "Untitled Quest",
): QuestDefinitionFile => ({
  schemaVersion: 1,
  id,
  title,
  description: "",
  itemDefinitions: [],
  scenarioInstances: [],
  questFlow: {
    nodes: [{ id: "quest-start", kind: "quest-start", title: "Quest start", position: { x: 56, y: 270 } }],
    connections: [],
  },
});
