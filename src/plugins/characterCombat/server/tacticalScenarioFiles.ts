import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { resolveTacticalScenarioTerrain, tacticalPlacementSupportsConsoleOperations, type TacticalScenarioDefinitionFile } from "../tacticalScenarioDefinitions";
import { validateTacticalConsoleVictoryDefinition, type TacticalConsoleVictoryDefinitionFile } from "../tacticalConsoleVictory";
import { tacticalHumanArmorIds, tacticalHumanWeaponIds } from "../tacticalInteractiveHuman";

export const DEFAULT_TACTICAL_SCENARIO_ID = "default-tactical-control-room";
export const tacticalScenarioDirectory = path.join(process.cwd(), "src", "plugins", "characterCombat", "scenarioDefinitions");
export const tacticalConsoleVictoryDirectory = path.join(process.cwd(), "src", "plugins", "characterCombat", "consoleVictoryDefinitions");

const scenarioIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const gridPointSchema = z.object({ x: z.number().int(), y: z.number().int() }).strict();
const finitePointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();
const terminalSettingsSchema = z.object({
  terminalKind: z.enum(["generic", "navigation", "engineering", "security", "communications"]).optional(),
  label: z.string().optional(),
  facing: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  operational: z.boolean().optional(),
  completesScenario: z.boolean().optional(),
  combatProfile: z.object({
    weaponId: z.enum(tacticalHumanWeaponIds),
    weaponSkill: z.number().int(),
    armorId: z.enum(tacticalHumanArmorIds),
    meleeWeaponName: z.string().min(1),
    meleePenetration: z.number().int(),
    meleeRating: z.number().int(),
    moraleFactor: z.number().int(),
    leadershipRating: z.number().int(),
    skills: z.array(z.object({ name: z.string().min(1), level: z.number().int() }).strict()),
  }).strict().optional(),
}).strict();
const placementSchema = z.object({
  id: z.string().min(1),
  terrainDefinitionId: z.string().min(1),
  origin: gridPointSchema,
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  terrainSettings: z.object({ filled: z.boolean().optional() }).strict().optional(),
  objectSettings: z.record(z.string(), terminalSettingsSchema).optional(),
}).strict();
const enemyPlacementSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["gang-member", "gang-leader"]),
  name: z.string().min(1),
  position: gridPointSchema,
  facing: z.enum(["north", "east", "south", "west"]).default("north"),
  avatarPath: z.string().startsWith("/generated/avatars/pool/").endsWith(".png"),
}).strict();
const tracingTemplateImagePathSchema = z.string()
  .startsWith("/")
  .refine((value) => !value.includes(".."), "Template image paths cannot contain parent-directory segments.")
  .refine((value) => /\.(?:png|jpe?g|webp)$/i.test(value), "Template images must be PNG, JPEG, or WebP files.");
const tracingTemplateSchema = z.object({
  imagePath: tracingTemplateImagePathSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  rotation: z.number().finite(),
  opacity: z.number().finite().min(0).max(1),
  visible: z.boolean(),
  lockAspectRatio: z.boolean(),
}).strict();
const areaOutlineSegmentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("line"),
    from: finitePointSchema,
    to: finitePointSchema,
  }).strict(),
  z.object({
    kind: z.literal("quadratic"),
    from: finitePointSchema,
    control: finitePointSchema,
    to: finitePointSchema,
  }).strict(),
]);
const areaOutlineSchema = z.array(areaOutlineSegmentSchema).min(3);
const scenarioSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(scenarioIdPattern),
  consoleVictoryDefinitionId: z.string().regex(scenarioIdPattern).optional(),
  title: z.string().min(1),
  briefing: z.string(),
  objective: z.string(),
  map: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    backgroundImage: z.string().min(1).optional(),
  }).strict(),
  tracingTemplate: tracingTemplateSchema.optional(),
  terrainPlacements: z.array(placementSchema),
  drawnWalls: z.array(z.object({
    id: z.string().min(1),
    from: finitePointSchema,
    to: finitePointSchema,
    control: finitePointSchema.optional(),
    portals: z.array(z.object({
      id: z.string().min(1),
      kind: z.enum(["sliding-door", "iris-valve"]),
      position: z.number().min(0).max(1),
    }).strict()).optional(),
  }).strict().superRefine((wall, context) => {
    if (wall.control && (wall.portals?.length ?? 0) > 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["portals"], message: "Curved walls cannot contain portals." });
    }
  })).optional(),
  drawnRaisedAreas: z.array(z.object({
    id: z.string().min(1),
    segments: areaOutlineSchema,
  }).strict()).optional(),
  drawnTerrainRegions: z.array(z.discriminatedUnion("kind", [
    z.object({
      id: z.string().min(1),
      kind: z.literal("close-machinery"),
      segments: areaOutlineSchema,
    }).strict(),
    z.object({
      id: z.string().min(1),
      kind: z.literal("liquid-hydrogen"),
      segments: areaOutlineSchema,
      settings: z.object({
        filled: z.boolean().optional(),
      }).strict().optional(),
    }).strict(),
    z.object({
      id: z.string().min(1),
      kind: z.enum(["grass", "sand", "water"]),
      segments: areaOutlineSchema,
    }).strict(),
  ])).optional(),
  drawnTerrainPrimitives: z.array(z.discriminatedUnion("shape", [
    z.object({
      id: z.string().min(1),
      shape: z.literal("circle"),
      center: finitePointSchema,
      radius: z.number().finite().positive(),
      terrainType: z.enum(["wall", "raised-area", "close-machinery", "liquid-hydrogen"]),
      settings: z.object({
        filled: z.boolean().optional(),
      }).strict().optional(),
      portals: z.array(z.object({
        id: z.string().min(1),
        kind: z.enum(["sliding-door", "iris-valve"]),
        position: z.number().min(0).max(1),
      }).strict()).optional(),
    }).strict(),
  ])).optional(),
  naturalTerrainPlacements: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["tree", "bush", "rock"]),
    position: gridPointSchema,
    radius: z.number().finite().positive(),
  }).strict()).optional(),
  elevationTransitions: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["stairs", "ladder", "ramp"]),
    lower: gridPointSchema,
    upper: gridPointSchema,
    path: z.array(gridPointSchema).min(2).optional(),
    ladderMount: z.object({
      position: finitePointSchema,
      tangent: finitePointSchema,
      outwardNormal: finitePointSchema,
    }).strict().optional(),
  }).strict()).optional(),
  deploymentEdges: z.array(z.enum(["north", "east", "south", "west"])).default(["south"]),
  enemyPlacements: z.array(enemyPlacementSchema).default([]),
  fireCells: z.array(gridPointSchema),
  smokeCells: z.array(gridPointSchema),
}).strict();
const taskCheckSchema = z.object({
  id: z.string().min(1),
  skill: z.string().min(1),
  difficulty: z.enum(["simple", "easy", "routine", "average", "difficult", "very-difficult", "formidable"]),
  apCost: z.number().int().min(1).max(6),
}).strict();
const consoleOperationSchema = z.object({
  id: z.string().min(1),
  consolePlacementId: z.string().min(1),
  label: z.string().min(1),
  prerequisites: z.object({ mode: z.enum(["any", "all"]), operationIds: z.array(z.string().min(1)) }).strict(),
  checks: z.array(taskCheckSchema).min(1),
  criticalSuccessNextCheckModifier: z.number().int().optional(),
  criticalFailureNextCheckModifier: z.number().int().optional(),
  result: z.discriminatedUnion("type", [
    z.object({ type: z.literal("unlock"), operationIds: z.array(z.string().min(1)) }).strict(),
    z.object({ type: z.literal("victory") }).strict(),
  ]),
  successTransformation: z.enum(["ally", "enemy"]).optional(),
  failureTransformation: z.enum(["ally", "enemy"]).optional(),
}).strict();
const consoleVictorySchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(scenarioIdPattern),
  scenarioId: z.string().regex(scenarioIdPattern),
  operations: z.array(consoleOperationSchema),
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
  const seenEnemyIds = new Set<string>();
  const occupiedEnemyCells = new Set<string>();
  (scenario.enemyPlacements ?? []).forEach((enemy) => {
    if (seenEnemyIds.has(enemy.id)) throw new TacticalScenarioFileError(`Duplicate enemy placement ID: ${enemy.id}.`, 400, "invalid-scenario");
    seenEnemyIds.add(enemy.id);
    const position = `${enemy.position.x}:${enemy.position.y}`;
    if (enemy.position.x < 0 || enemy.position.y < 0 || enemy.position.x >= scenario.map.width || enemy.position.y >= scenario.map.height) throw new TacticalScenarioFileError(`Enemy ${enemy.id} is outside the map at ${position}.`, 400, "invalid-scenario");
    if (occupiedEnemyCells.has(position)) throw new TacticalScenarioFileError(`Enemy ${enemy.id} overlaps another enemy at ${position}.`, 400, "invalid-scenario");
    occupiedEnemyCells.add(position);
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
    const terrain = resolveTacticalScenarioTerrain(scenario);
    if (terrain.deploymentCells.length < 2) throw new TacticalScenarioFileError("Define a crew deployment edge or place a Deployment Zone 9x9.", 400, "invalid-scenario");
    const deploymentCells = new Set(terrain.deploymentCells.map((cell) => `${cell.x}:${cell.y}`));
    (scenario.enemyPlacements ?? []).forEach((enemy) => {
      const position = `${enemy.position.x}:${enemy.position.y}`;
      if (deploymentCells.has(position)) throw new TacticalScenarioFileError(`Enemy ${enemy.id} cannot be placed in the crew deployment zone at ${position}.`, 400, "invalid-scenario");
      if (terrain.objects.some((object) => `${object.position.x}:${object.position.y}` === position)
        || terrain.closeMachineryCells.some((cell) => `${cell.x}:${cell.y}` === position)
        || terrain.treeTrunkCells.some((cell) => `${cell.x}:${cell.y}` === position)) {
        throw new TacticalScenarioFileError(`Enemy ${enemy.id} cannot occupy blocked terrain at ${position}.`, 400, "invalid-scenario");
      }
    });
  } catch (error) {
    if (error instanceof TacticalScenarioFileError) throw error;
    throw new TacticalScenarioFileError(error instanceof Error ? error.message : "The scenario terrain is invalid.", 400, "invalid-scenario");
  }
  return scenario;
};

export const parseTacticalConsoleVictoryFile = (value: unknown, scenario: TacticalScenarioDefinitionFile): TacticalConsoleVictoryDefinitionFile => {
  const parsed = consoleVictorySchema.safeParse(value);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "definition"}: ${issue.message}`).join("; ");
    throw new TacticalScenarioFileError(`Invalid console-victory file: ${detail}`, 400, "invalid-console-victory");
  }
  const definition = parsed.data as TacticalConsoleVictoryDefinitionFile;
  try {
    validateTacticalConsoleVictoryDefinition(definition, scenario.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations).map((placement) => placement.id), scenario.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
  } catch (error) {
    throw new TacticalScenarioFileError(error instanceof Error ? error.message : "The console-victory definition is invalid.", 400, "invalid-console-victory");
  }
  return definition;
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

export const loadTacticalConsoleVictoryFile = async (id: string, scenario: TacticalScenarioDefinitionFile, directory = tacticalConsoleVictoryDirectory) => {
  let source: string;
  try {
    source = await readFile(scenarioPath(directory, id), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new TacticalScenarioFileError(`Console-victory definition ${id} was not found.`, 404, "console-victory-not-found");
    throw error;
  }
  let value: unknown;
  try { value = JSON.parse(source); } catch { throw new TacticalScenarioFileError(`Console-victory definition ${id} is not valid JSON.`, 400, "invalid-json"); }
  const definition = parseTacticalConsoleVictoryFile(value, scenario);
  if (definition.id !== id || definition.scenarioId !== scenario.id) throw new TacticalScenarioFileError(`Console-victory definition ${id} does not match scenario ${scenario.id}.`, 400, "console-victory-id-mismatch");
  return definition;
};

export const loadTacticalScenarioBundle = async (id: string, scenarioDirectory = tacticalScenarioDirectory, consoleDirectory = tacticalConsoleVictoryDirectory) => {
  const scenario = await loadTacticalScenarioFile(id, scenarioDirectory);
  let consoleVictory: TacticalConsoleVictoryDefinitionFile;
  try {
    consoleVictory = await loadTacticalConsoleVictoryFile(scenario.consoleVictoryDefinitionId ?? scenario.id, scenario, consoleDirectory);
  } catch (error) {
    if (!(error instanceof TacticalScenarioFileError) || error.code !== "console-victory-not-found") throw error;
    const consoles = scenario.terrainPlacements.filter(tacticalPlacementSupportsConsoleOperations);
    if (consoles.length === 0) throw error;
    consoleVictory = {
      schemaVersion: 1,
      id: scenario.id,
      scenarioId: scenario.id,
      operations: consoles.map((placement, index) => ({
        id: `${placement.id}-operation-1`,
        consolePlacementId: placement.id,
        label: `Operate ${placement.objectSettings?.terminal?.label ?? "Console"}`,
        prerequisites: { mode: "all", operationIds: [] },
        checks: [{ id: `${placement.id}-operation-1-check-1`, skill: "Security", difficulty: "average", apCost: 6 }],
        criticalSuccessNextCheckModifier: 2,
        criticalFailureNextCheckModifier: -2,
        result: index === 0 ? { type: "victory" } : { type: "unlock", operationIds: [] },
      })),
    };
    validateTacticalConsoleVictoryDefinition(consoleVictory, consoles.map((placement) => placement.id), scenario.terrainPlacements.filter((placement) => placement.terrainDefinitionId === "interactive-human").map((placement) => placement.id));
  }
  return { scenario, consoleVictory };
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
  const scenario = parseTacticalScenarioFile({ ...definition, id, consoleVictoryDefinitionId: id });
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

export const saveTacticalScenarioBundleAs = async (name: string, scenarioValue: unknown, consoleValue: unknown, scenarioDirectory = tacticalScenarioDirectory, consoleDirectory = tacticalConsoleVictoryDirectory) => {
  const id = scenarioIdFromName(name);
  if (!id) throw new TacticalScenarioFileError("Enter a scenario name containing letters or numbers.", 400, "invalid-scenario-name");
  if (id === DEFAULT_TACTICAL_SCENARIO_ID) throw new TacticalScenarioFileError("The default scenario is immutable.", 409, "default-scenario");
  if (!scenarioValue || typeof scenarioValue !== "object" || Array.isArray(scenarioValue)) throw new TacticalScenarioFileError("A scenario definition is required.", 400, "invalid-scenario");
  if (!consoleValue || typeof consoleValue !== "object" || Array.isArray(consoleValue)) throw new TacticalScenarioFileError("A console-victory definition is required.", 400, "invalid-console-victory");
  const scenario = parseTacticalScenarioFile({ ...scenarioValue, id, consoleVictoryDefinitionId: id });
  const consoleVictory = parseTacticalConsoleVictoryFile({ ...consoleValue, id, scenarioId: id }, scenario);
  await Promise.all([mkdir(scenarioDirectory, { recursive: true }), mkdir(consoleDirectory, { recursive: true })]);
  const scenarioDestination = scenarioPath(scenarioDirectory, id);
  const consoleDestination = scenarioPath(consoleDirectory, id);
  const scenarioTemporary = path.join(scenarioDirectory, `.${id}.${process.pid}.${randomUUID()}.tmp`);
  const consoleTemporary = path.join(consoleDirectory, `.${id}.${process.pid}.${randomUUID()}.tmp`);
  await Promise.all([
    writeFile(scenarioTemporary, `${JSON.stringify(scenario, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(consoleTemporary, `${JSON.stringify(consoleVictory, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
  ]);
  let scenarioLinked = false;
  try {
    await link(scenarioTemporary, scenarioDestination);
    scenarioLinked = true;
    await link(consoleTemporary, consoleDestination);
  } catch (error) {
    if (scenarioLinked) await unlink(scenarioDestination).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new TacticalScenarioFileError(`A scenario named ${id} already exists. Choose another name.`, 409, "scenario-exists");
    throw error;
  } finally {
    await Promise.all([unlink(scenarioTemporary).catch(() => undefined), unlink(consoleTemporary).catch(() => undefined)]);
  }
  return { scenario, consoleVictory };
};

export const saveTacticalScenarioBundle = async (scenarioId: string, scenarioValue: unknown, consoleValue: unknown, scenarioDirectory = tacticalScenarioDirectory, consoleDirectory = tacticalConsoleVictoryDirectory) => {
  const id = safeScenarioId(scenarioId);
  if (id === DEFAULT_TACTICAL_SCENARIO_ID) throw new TacticalScenarioFileError("The default scenario is immutable. Use Save As.", 409, "default-scenario");
  await loadTacticalScenarioBundle(id, scenarioDirectory, consoleDirectory);
  if (!scenarioValue || typeof scenarioValue !== "object" || Array.isArray(scenarioValue)) throw new TacticalScenarioFileError("A scenario definition is required.", 400, "invalid-scenario");
  if (!consoleValue || typeof consoleValue !== "object" || Array.isArray(consoleValue)) throw new TacticalScenarioFileError("A console-victory definition is required.", 400, "invalid-console-victory");
  const scenario = parseTacticalScenarioFile({ ...scenarioValue, id, consoleVictoryDefinitionId: id });
  const consoleVictory = parseTacticalConsoleVictoryFile({ ...consoleValue, id, scenarioId: id }, scenario);
  const scenarioDestination = scenarioPath(scenarioDirectory, id);
  const consoleDestination = scenarioPath(consoleDirectory, id);
  const scenarioTemporary = path.join(scenarioDirectory, `.${id}.${process.pid}.${randomUUID()}.tmp`);
  const consoleTemporary = path.join(consoleDirectory, `.${id}.${process.pid}.${randomUUID()}.tmp`);
  const [previousScenario, previousConsole] = await Promise.all([
    readFile(scenarioDestination, "utf8"),
    readFile(consoleDestination, "utf8"),
  ]);
  await Promise.all([
    writeFile(scenarioTemporary, `${JSON.stringify(scenario, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
    writeFile(consoleTemporary, `${JSON.stringify(consoleVictory, null, 2)}\n`, { encoding: "utf8", flag: "wx" }),
  ]);
  let scenarioReplaced = false;
  try {
    await rename(scenarioTemporary, scenarioDestination);
    scenarioReplaced = true;
    await rename(consoleTemporary, consoleDestination);
  } catch (error) {
    if (scenarioReplaced) await writeFile(scenarioDestination, previousScenario, "utf8");
    await writeFile(consoleDestination, previousConsole, "utf8");
    throw error;
  } finally {
    await Promise.all([unlink(scenarioTemporary).catch(() => undefined), unlink(consoleTemporary).catch(() => undefined)]);
  }
  return { scenario, consoleVictory };
};

export const deleteTacticalScenarioBundle = async (
  scenarioId: string,
  scenarioDirectory = tacticalScenarioDirectory,
  consoleDirectory = tacticalConsoleVictoryDirectory,
) => {
  const id = safeScenarioId(scenarioId);
  if (id === DEFAULT_TACTICAL_SCENARIO_ID) {
    throw new TacticalScenarioFileError(
      "The default scenario is immutable and cannot be deleted.",
      409,
      "default-scenario",
    );
  }
  const scenario = await loadTacticalScenarioFile(id, scenarioDirectory);
  const scenarioDestination = scenarioPath(scenarioDirectory, id);
  const consoleId = scenario.consoleVictoryDefinitionId ?? id;
  const consoleDestination = consoleId === id
    ? scenarioPath(consoleDirectory, consoleId)
    : null;
  const token = `${process.pid}.${randomUUID()}`;
  const scenarioTombstone = path.join(scenarioDirectory, `.${id}.${token}.deleted`);
  const consoleTombstone = consoleDestination
    ? path.join(consoleDirectory, `.${consoleId}.${token}.deleted`)
    : null;

  await rename(scenarioDestination, scenarioTombstone);
  let consoleMoved = false;
  try {
    if (consoleDestination && consoleTombstone) {
      try {
        await rename(consoleDestination, consoleTombstone);
        consoleMoved = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  } catch (error) {
    await rename(scenarioTombstone, scenarioDestination);
    throw error;
  }

  await Promise.all([
    unlink(scenarioTombstone),
    ...(consoleMoved && consoleTombstone ? [unlink(consoleTombstone)] : []),
  ]);
  return { id: scenario.id, title: scenario.title };
};
