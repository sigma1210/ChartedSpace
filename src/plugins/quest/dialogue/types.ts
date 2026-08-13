import type { QuestGraphPoint, QuestSkillTask } from "../editor/types";

export type DialogueTemplateVariables = Record<string, string>;
export type DialogueEndingKind = "success" | "neutral" | "failure";
export type DialogueNpcTransformation = "unchanged" | "ally" | "enemy";

export type DialogueTextNode = { id: string; kind: "npc-text"; text: string; position: QuestGraphPoint };
export type DialogueChoiceNode = { id: string; kind: "choice"; text: string; position: QuestGraphPoint };
export type DialogueSkillNode = { id: string; kind: "skill-chain"; label: string; tasks: QuestSkillTask[]; position: QuestGraphPoint };
export type DialogueEndingNode = { id: string; kind: "ending"; endingKind: DialogueEndingKind; title: string; text: string; transformation: DialogueNpcTransformation; restartable: boolean; resumeNodeId: string | null; position: QuestGraphPoint };
export type DialogueNode = DialogueTextNode | DialogueChoiceNode | DialogueSkillNode | DialogueEndingNode;
export type DialogueConnectionOutcome = "next" | "success" | "failure";
export type DialogueConnection = { id: string; sourceNodeId: string; outcome: DialogueConnectionOutcome; targetNodeId: string };

export type DialogueDefinitionFile = {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  variableKeys: string[];
  startNodeId: string;
  nodes: DialogueNode[];
  connections: DialogueConnection[];
};

export type DialogueSummary = { id: string; title: string };

export const createEmptyDialogueDefinition = (id = "new-dialogue", title = "Untitled Dialogue"): DialogueDefinitionFile => {
  const startNodeId = "dialogue-start";
  return { schemaVersion: 1, id, title, description: "", variableKeys: [], startNodeId, nodes: [{ id: startNodeId, kind: "npc-text", text: "{{npcName}} regards {{characterName}}.", position: { x: 80, y: 260 } }], connections: [] };
};

export const cloneDialogueDefinition = (definition: DialogueDefinitionFile) => JSON.parse(JSON.stringify(definition)) as DialogueDefinitionFile;

export const renderDialogueTemplate = (template: string, context: DialogueTemplateVariables) => template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key: string) => context[key] ?? `{{${key}}}`);
