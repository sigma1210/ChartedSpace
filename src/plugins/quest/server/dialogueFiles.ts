import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { DialogueDefinitionFile } from "../dialogue/types";

export const dialogueDefinitionDirectory = path.join(process.cwd(), "src", "plugins", "quest", "dialogueDefinitions");
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const point = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const task = z.object({ id: z.string().min(1), skill: z.string().min(1), difficulty: z.enum(["simple", "easy", "routine", "average", "difficult", "very-difficult", "formidable"]) }).strict();
const node = z.discriminatedUnion("kind", [
  z.object({ id: z.string().min(1), kind: z.literal("npc-text"), text: z.string(), position: point }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("choice"), text: z.string(), position: point }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("skill-chain"), label: z.string(), tasks: z.array(task).min(1), position: point }).strict(),
  z.object({ id: z.string().min(1), kind: z.literal("ending"), endingKind: z.enum(["success", "neutral", "failure"]), title: z.string(), text: z.string(), transformation: z.enum(["unchanged", "ally", "enemy"]), restartable: z.boolean(), resumeNodeId: z.string().min(1).nullable(), position: point }).strict(),
]);
const schema = z.object({
  schemaVersion: z.literal(1), id: z.string().regex(idPattern), title: z.string().min(1), description: z.string(),
  variableKeys: z.array(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/)), startNodeId: z.string().min(1), nodes: z.array(node).min(1),
  connections: z.array(z.object({ id: z.string().min(1), sourceNodeId: z.string().min(1), outcome: z.enum(["next", "success", "failure"]), targetNodeId: z.string().min(1) }).strict()),
}).strict();

export class DialogueFileError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) { super(message); }
}
const dialogueIdFromName = (name: string) => {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  if (!id || !idPattern.test(id)) throw new DialogueFileError("Dialogue name must contain letters or numbers.", 400, "INVALID_NAME");
  return id;
};
const filePath = (id: string) => {
  if (!idPattern.test(id)) throw new DialogueFileError("Invalid dialogue ID.", 400, "INVALID_ID");
  return path.join(dialogueDefinitionDirectory, `${id}.json`);
};
export const validateDialogueDefinition = (value: unknown): DialogueDefinitionFile => {
  const result = schema.safeParse(value);
  if (!result.success) throw new DialogueFileError(`Invalid dialogue definition: ${result.error.issues[0]?.message ?? "unknown error"}`, 400, "INVALID_DEFINITION");
  const definition = result.data as DialogueDefinitionFile;
  const ids = new Set<string>();
  for (const item of definition.nodes) {
    if (ids.has(item.id)) throw new DialogueFileError(`Duplicate dialogue node ID: ${item.id}.`, 400, "INVALID_DEFINITION");
    ids.add(item.id);
  }
  if (!ids.has(definition.startNodeId)) throw new DialogueFileError("Dialogue start node does not exist.", 400, "INVALID_DEFINITION");
  const exits = new Set<string>();
  for (const connection of definition.connections) {
    if (!ids.has(connection.sourceNodeId) || !ids.has(connection.targetNodeId)) throw new DialogueFileError("A dialogue link references a missing node.", 400, "INVALID_DEFINITION");
    const key = `${connection.sourceNodeId}:${connection.outcome}`;
    const source = definition.nodes.find((item) => item.id === connection.sourceNodeId);
    if (exits.has(key) && !(source?.kind === "npc-text" && connection.outcome === "next")) throw new DialogueFileError("Only NPC text may link to multiple player choices; other nodes allow one link per outcome.", 400, "INVALID_DEFINITION");
    exits.add(key);
  }
  for (const item of definition.nodes) if (item.kind === "ending" && item.resumeNodeId && !ids.has(item.resumeNodeId)) throw new DialogueFileError(`Ending ${item.title} resumes at a missing node.`, 400, "INVALID_DEFINITION");
  return definition;
};
export const listDialogueFiles = async () => {
  await mkdir(dialogueDefinitionDirectory, { recursive: true });
  const files = (await readdir(dialogueDefinitionDirectory)).filter((entry) => entry.endsWith(".json"));
  const values = await Promise.all(files.map(async (entry) => { try { return await loadDialogueFile(entry.slice(0, -5)); } catch { return null; } }));
  return values.filter((value): value is DialogueDefinitionFile => Boolean(value)).map(({ id, title }) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
};
export const loadDialogueFile = async (id: string) => {
  try { return validateDialogueDefinition(JSON.parse(await readFile(filePath(id), "utf8"))); }
  catch (error) {
    if (error instanceof DialogueFileError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new DialogueFileError(`Dialogue ${id} was not found.`, 404, "NOT_FOUND");
    throw new DialogueFileError(error instanceof Error ? error.message : "Could not load dialogue.", 500, "READ_FAILED");
  }
};
export const createDialogueFile = async (name: string, value: unknown) => {
  await mkdir(dialogueDefinitionDirectory, { recursive: true });
  const id = dialogueIdFromName(name);
  const definition = validateDialogueDefinition({ ...(value as object), id, title: name.trim() });
  try { await writeFile(filePath(id), `${JSON.stringify(definition, null, 2)}\n`, { encoding: "utf8", flag: "wx" }); return definition; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new DialogueFileError(`Dialogue ${id} already exists.`, 409, "ALREADY_EXISTS"); throw error; }
};
export const updateDialogueFile = async (id: string, value: unknown) => {
  await loadDialogueFile(id);
  const definition = validateDialogueDefinition({ ...(value as object), id });
  await writeFile(filePath(id), `${JSON.stringify(definition, null, 2)}\n`, "utf8");
  return definition;
};
export const deleteDialogueFile = async (id: string) => { const value = await loadDialogueFile(id); await unlink(filePath(id)); return { id: value.id, title: value.title }; };
