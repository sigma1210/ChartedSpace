import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resolveTacticalScenarioTerrain, type TacticalScenarioDefinitionFile } from "../tacticalScenarioDefinitions";

export const DEFAULT_TACTICAL_SCENARIO_ID = "default-tactical-control-room";
export const tacticalScenarioDirectory = path.join(process.cwd(), "src", "plugins", "characterCombat", "scenarioDefinitions");

const scenarioIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const gridPointSchema = z.object({ x: z.number().int(), y: z.number().int() }).strict();
const terminalSettingsSchema = z.object({
  terminalKind: z.enum(["generic", "navigation", "engineering", "security", "communications"]).optional(),
  label: z.string().optional(),
  facing: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  operational: z.boolean().optional(),
  completesScenario: z.boolean().optional(),
}).strict();
const placementSchema = z.object({
  id: z.string().min(1),
  terrainDefinitionId: z.string().min(1),
  origin: gridPointSchema,
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  terrainSettings: z.object({ filled: z.boolean().optional() }).strict().optional(),
  objectSettings: z.record(z.string(), terminalSettingsSchema).optional(),
}).strict();
const scenarioSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(scenarioIdPattern),
  title: z.string().min(1),
  briefing: z.string(),
  objective: z.string(),
  map: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    backgroundImage: z.string().min(1).optional(),
  }).strict(),
  terrainPlacements: z.array(placementSchema),
  fireCells: z.array(gridPointSchema),
  smokeCells: z.array(gridPointSchema),
}).strict();

export class TacticalScenarioFileError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "TacticalScenarioFileError";
  }
}

export interface TacticalScenarioSummary {
  id: string;
  title: string;
  isDefault: boolean;
}

const validateCells = (scenario: TacticalScenarioDefinitionFile) => {
  const seenPlacementIds = new Set<string>();
  scenario.terrainPlacements.forEach((placement) => {
    if (seenPlacementIds.has(placement.id)) throw new TacticalScenarioFileError(`Duplicate terrain placement ID: ${placement.id}.`, 400, "invalid-scenario");
    seenPlacementIds.add(placement.id);
  });
  for (const [label, cells] of [["Fire", scenario.fireCells], ["Smoke", scenario.smokeCells]] as const) {
    const seen = new Set<string>();
    cells.forEach((cell) => {
      const key = `${cell.x}:${cell.y}`;
      if (cell.x < 0 || cell.y < 0 || cell.x >= scenario.map.width || cell.y >= scenario.map.height) {
        throw new TacticalScenarioFileError(`${label} cell ${key} is outside the map.`, 400, "invalid-scenario");
      }
      if (seen.has(key)) throw new TacticalScenarioFileError(`Duplicate ${label.toLowerCase()} cell: ${key}.`, 400, "invalid-scenario");
      seen.add(key);
    });
  }
};

export const parseTacticalScenarioFile = (value: unknown): TacticalScenarioDefinitionFile => {
  const parsed = scenarioSchema.safeParse(value);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "scenario"}: ${issue.message}`).join("; ");
    throw new TacticalScenarioFileError(`Invalid scenario file: ${detail}`, 400, "invalid-scenario");
  }
  const scenario = parsed.data as TacticalScenarioDefinitionFile;
  validateCells(scenario);
  try {
    resolveTacticalScenarioTerrain(scenario);
  } catch (error) {
    throw new TacticalScenarioFileError(error instanceof Error ? error.message : "The scenario terrain is invalid.", 400, "invalid-scenario");
  }
  return scenario;
};

const safeScenarioId = (id: string) => {
  if (!scenarioIdPattern.test(id)) throw new TacticalScenarioFileError("Invalid scenario ID.", 400, "invalid-scenario-id");
  return id;
};

const scenarioPath = (directory: string, id: string) => path.join(directory, `${safeScenarioId(id)}.json`);

export const scenarioIdFromName = (name: string) => name
  .normalize("NFKD")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const loadTacticalScenarioFile = async (id: string, directory = tacticalScenarioDirectory) => {
  let source: string;
  try {
    source = await readFile(scenarioPath(directory, id), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new TacticalScenarioFileError(`Scenario ${id} was not found.`, 404, "scenario-not-found");
    throw error;
  }
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new TacticalScenarioFileError(`Scenario ${id} is not valid JSON.`, 400, "invalid-json");
  }
  const scenario = parseTacticalScenarioFile(value);
  if (scenario.id !== id) throw new TacticalScenarioFileError(`Scenario file ${id}.json contains the ID ${scenario.id}.`, 400, "scenario-id-mismatch");
  return scenario;
};

export const listTacticalScenarioFiles = async (directory = tacticalScenarioDirectory): Promise<TacticalScenarioSummary[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const scenarios = await Promise.all(entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && entry.name.endsWith(".json"))
    .map((entry) => loadTacticalScenarioFile(entry.name.slice(0, -5), directory)));
  return scenarios
    .map((scenario) => ({ id: scenario.id, title: scenario.title, isDefault: scenario.id === DEFAULT_TACTICAL_SCENARIO_ID }))
    .sort((first, second) => Number(second.isDefault) - Number(first.isDefault) || first.title.localeCompare(second.title));
};

export const saveTacticalScenarioAs = async (name: string, definition: unknown, directory = tacticalScenarioDirectory) => {
  const id = scenarioIdFromName(name);
  if (!id) throw new TacticalScenarioFileError("Enter a scenario name containing letters or numbers.", 400, "invalid-scenario-name");
  if (id === DEFAULT_TACTICAL_SCENARIO_ID) throw new TacticalScenarioFileError("The default scenario is immutable.", 409, "default-scenario");
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) throw new TacticalScenarioFileError("A scenario definition is required.", 400, "invalid-scenario");
  const scenario = parseTacticalScenarioFile({ ...definition, id });
  await mkdir(directory, { recursive: true });
  const destination = scenarioPath(directory, id);
  const temporary = path.join(directory, `.${id}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporary, `${JSON.stringify(scenario, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await link(temporary, destination);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new TacticalScenarioFileError(`A scenario named ${id} already exists. Choose another name.`, 409, "scenario-exists");
    throw error;
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
  return scenario;
};
