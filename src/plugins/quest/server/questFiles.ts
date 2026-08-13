import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { QuestDefinitionFile } from "../editor/types";

export const questDefinitionDirectory = path.join(process.cwd(), "src", "plugins", "quest", "questDefinitions");

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const taskSchema = z.object({
  id: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.enum(["simple", "easy", "routine", "average", "difficult", "very-difficult", "formidable"]),
}).strict();
const itemConsumptionTriggerSchema = z.enum(["unlock", "attempt", "success", "failure", "critical-failure"]);
const itemRequirementSchema = z.object({
  id: z.string().min(1),
  itemDefinitionId: z.string().min(1),
  quantity: z.number().int().min(1),
  consumeOn: z.array(itemConsumptionTriggerSchema),
}).strict();
const itemRewardRecipientSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("performer") }).strict(),
  z.object({ mode: z.literal("player-choice") }).strict(),
  z.object({ mode: z.literal("character"), characterId: z.string().min(1) }).strict(),
]);
const itemRewardSchema = z.object({
  id: z.string().min(1),
  itemDefinitionId: z.string().min(1),
  quantity: z.number().int().min(1),
  repeatable: z.boolean(),
  recipient: itemRewardRecipientSchema,
}).strict();
const chainSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  tasks: z.array(taskSchema).min(1),
  itemRequirements: z.array(itemRequirementSchema).default([]),
  successRewards: z.array(itemRewardSchema).default([]),
}).strict();
const scenarioNodeSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("start"), title: z.string(), position: pointSchema }).strict(),
  z.object({
    id: z.string().min(1),
    kind: z.literal("entity"),
    entityType: z.enum(["console", "interactive-human"]),
    sourcePlacementId: z.string().min(1),
    title: z.string(),
    description: z.string(),
    position: pointSchema,
    chains: z.array(chainSchema),
    dialogue: z.object({
      definitionId: z.string().regex(idPattern),
      variables: z.record(z.string(), z.string()),
      successEndingChainIdByEndingId: z.record(z.string(), z.string()),
    }).strict().nullable().optional(),
  }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("victory"), title: z.string(), description: z.string(), position: pointSchema }).strict(),
]);
const scenarioInstanceSchema = z.object({
  id: z.string().min(1),
  sourceScenarioId: z.string().min(1),
  title: z.string(),
  nodes: z.array(scenarioNodeSchema),
  connections: z.array(z.object({
    id: z.string().min(1),
    sourceNodeId: z.string().min(1),
    sourceChainId: z.string().nullable(),
    targetNodeId: z.string().min(1),
  }).strict()),
}).strict();
const questFlowNodeSchema = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("quest-start"), title: z.string(), position: pointSchema }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("scenario"), scenarioInstanceId: z.string().min(1), position: pointSchema }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("quest-victory"), title: z.string(), description: z.string(), position: pointSchema }).strict(),
]);
const questDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(idPattern),
  title: z.string().min(1),
  description: z.string(),
  itemDefinitions: z.array(z.object({
    id: z.string().regex(idPattern),
    name: z.string().min(1),
    description: z.string(),
    icon: z.string(),
    requiredSkill: z.string().min(1).nullable(),
    unskilledDm: z.number().int().max(0),
  }).strict()).default([]),
  scenarioInstances: z.array(scenarioInstanceSchema),
  questFlow: z.object({
    nodes: z.array(questFlowNodeSchema),
    connections: z.array(z.object({
      id: z.string().min(1),
      sourceNodeId: z.string().min(1),
      sourceScenarioVictoryId: z.string().nullable(),
      targetNodeId: z.string().min(1),
    }).strict()),
  }).strict(),
}).strict();

export class QuestFileError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
  }
}

const questIdFromName = (name: string) => {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  if (!id || !idPattern.test(id)) throw new QuestFileError("Quest name must contain letters or numbers.", 400, "INVALID_NAME");
  return id;
};

const definitionPath = (id: string) => {
  if (!idPattern.test(id)) throw new QuestFileError("Invalid quest ID.", 400, "INVALID_ID");
  return path.join(questDefinitionDirectory, `${id}.json`);
};

export const validateQuestDefinition = (value: unknown): QuestDefinitionFile => {
  const result = questDefinitionSchema.safeParse(value);
  if (!result.success) {
    throw new QuestFileError(`Invalid quest definition: ${result.error.issues[0]?.message ?? "unknown error"}`, 400, "INVALID_DEFINITION");
  }
  const definition = result.data as QuestDefinitionFile;
  if (definition.questFlow.nodes.filter((node) => node.kind === "quest-start").length !== 1) {
    throw new QuestFileError("A quest requires exactly one Quest Start node.", 400, "INVALID_DEFINITION");
  }
  const itemIds = new Set<string>();
  for (const item of definition.itemDefinitions) {
    if (itemIds.has(item.id)) throw new QuestFileError(`Duplicate quest item ID: ${item.id}.`, 400, "INVALID_DEFINITION");
    itemIds.add(item.id);
  }
  for (const scenario of definition.scenarioInstances) {
    for (const node of scenario.nodes) {
      if (node.kind !== "entity") continue;
      for (const chain of node.chains) {
        for (const reference of [...chain.itemRequirements, ...chain.successRewards]) {
          if (!itemIds.has(reference.itemDefinitionId)) {
            throw new QuestFileError(`Skill chain ${chain.name} references missing quest item ${reference.itemDefinitionId}.`, 400, "INVALID_DEFINITION");
          }
        }
      }
    }
  }
  return definition;
};

export const listQuestFiles = async () => {
  await mkdir(questDefinitionDirectory, { recursive: true });
  const files = (await readdir(questDefinitionDirectory)).filter((entry) => entry.endsWith(".json"));
  const definitions = await Promise.all(files.map(async (entry) => {
    try {
      return await loadQuestFile(entry.slice(0, -5));
    } catch {
      return null;
    }
  }));
  return definitions.filter((definition): definition is QuestDefinitionFile => Boolean(definition))
    .map((definition) => ({ id: definition.id, title: definition.title, isDefault: false }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const loadQuestFile = async (id: string) => {
  try {
    return validateQuestDefinition(JSON.parse(await readFile(definitionPath(id), "utf8")) as unknown);
  } catch (error) {
    if (error instanceof QuestFileError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new QuestFileError(`Quest ${id} was not found.`, 404, "NOT_FOUND");
    throw new QuestFileError(error instanceof Error ? error.message : "Could not load quest.", 500, "READ_FAILED");
  }
};

export const createQuestFile = async (name: string, value: unknown) => {
  await mkdir(questDefinitionDirectory, { recursive: true });
  const id = questIdFromName(name);
  const candidate = { ...(value as Record<string, unknown>), id, title: name.trim() };
  const definition = validateQuestDefinition(candidate);
  try {
    await writeFile(definitionPath(id), `${JSON.stringify(definition, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return definition;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new QuestFileError(`Quest ${id} already exists.`, 409, "ALREADY_EXISTS");
    throw new QuestFileError(error instanceof Error ? error.message : "Could not create quest.", 500, "WRITE_FAILED");
  }
};

export const updateQuestFile = async (id: string, value: unknown) => {
  await loadQuestFile(id);
  const candidate = { ...(value as Record<string, unknown>), id };
  const definition = validateQuestDefinition(candidate);
  await writeFile(definitionPath(id), `${JSON.stringify(definition, null, 2)}\n`, "utf8");
  return definition;
};

export const deleteQuestFile = async (id: string) => {
  const definition = await loadQuestFile(id);
  await unlink(definitionPath(id));
  return { id: definition.id, title: definition.title };
};
