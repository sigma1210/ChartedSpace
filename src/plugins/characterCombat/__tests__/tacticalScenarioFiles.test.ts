import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "../tacticalScenarioDefinitions";
import { cloneTacticalConsoleVictoryDefinition, defaultTacticalConsoleVictoryDefinition } from "../tacticalConsoleVictory";
import { defaultTacticalInteractiveHumanCombatProfile } from "../tacticalInteractiveHuman";
import {
  DEFAULT_TACTICAL_SCENARIO_ID,
  listTacticalScenarioFiles,
  loadTacticalScenarioBundle,
  loadTacticalScenarioFile,
  saveTacticalScenarioBundle,
  saveTacticalScenarioBundleAs,
  saveTacticalScenarioAs,
} from "../server/tacticalScenarioFiles";

describe("tactical scenario files", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "charted-space-scenarios-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("saves a new scenario as formatted JSON and loads it again", async () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.title = "Cargo Deck Assault";
    draft.enemyPlacements![0].facing = "east";
    draft.drawnWalls = [{
      id: "diagonal-bulkhead",
      from: { x: 2, y: 2 },
      to: { x: 7, y: 5 },
      portals: [{ id: "diagonal-door", kind: "sliding-door", position: 0.5 }],
    }, {
      id: "curved-bulkhead",
      from: { x: 12, y: 4 },
      control: { x: 15.25, y: 9.5 },
      to: { x: 20, y: 4 },
    }];
    draft.tracingTemplate = {
      imagePath: "/images/tactical/landing-pad/map.jpg",
      x: 1.5,
      y: -2,
      width: 24,
      height: 16,
      rotation: 7.5,
      opacity: 0.4,
      visible: true,
      lockAspectRatio: true,
    };

    const saved = await saveTacticalScenarioAs("Cargo Deck Assault", draft, directory);
    const loaded = await loadTacticalScenarioFile("cargo-deck-assault", directory);
    const source = await readFile(path.join(directory, "cargo-deck-assault.json"), "utf8");

    expect(saved.id).toBe("cargo-deck-assault");
    expect(loaded).toEqual(saved);
    expect(loaded.enemyPlacements?.[0].facing).toBe("east");
    expect(loaded.drawnWalls).toEqual(draft.drawnWalls);
    expect(loaded.tracingTemplate).toEqual(draft.tracingTemplate);
    expect(source).toContain('\n  "schemaVersion": 1,');
    expect(await listTacticalScenarioFiles(directory)).toEqual([
      { id: "cargo-deck-assault", title: "Cargo Deck Assault", isDefault: false },
    ]);
  });

  it("saves and loads the scenario and console-victory definitions together", async () => {
    const scenarioDirectory = path.join(directory, "scenarios");
    const consoleDirectory = path.join(directory, "consoles");
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    const consoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);

    const saved = await saveTacticalScenarioBundleAs("Chained Console Test", draft, consoleVictory, scenarioDirectory, consoleDirectory);
    const loaded = await loadTacticalScenarioBundle("chained-console-test", scenarioDirectory, consoleDirectory);

    expect(saved.scenario.consoleVictoryDefinitionId).toBe("chained-console-test");
    expect(saved.consoleVictory).toMatchObject({ id: "chained-console-test", scenarioId: "chained-console-test" });
    expect(loaded).toEqual(saved);
  });

  it("updates a previously saved non-default scenario and console definition", async () => {
    const scenarioDirectory = path.join(directory, "scenarios");
    const consoleDirectory = path.join(directory, "consoles");
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    const consoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
    await saveTacticalScenarioBundleAs("Chained Console Test", draft, consoleVictory, scenarioDirectory, consoleDirectory);

    draft.title = "Updated Chained Console Test";
    consoleVictory.operations[0].label = "Updated operation";
    const saved = await saveTacticalScenarioBundle("chained-console-test", draft, consoleVictory, scenarioDirectory, consoleDirectory);
    const loaded = await loadTacticalScenarioBundle("chained-console-test", scenarioDirectory, consoleDirectory);

    expect(saved.scenario).toMatchObject({ id: "chained-console-test", title: "Updated Chained Console Test" });
    expect(saved.consoleVictory.operations[0].label).toBe("Updated operation");
    expect(loaded).toEqual(saved);
  });

  it("refuses to update the immutable default scenario", async () => {
    await expect(saveTacticalScenarioBundle(DEFAULT_TACTICAL_SCENARIO_ID, defaultTacticalScenarioDefinition, defaultTacticalConsoleVictoryDefinition, directory, directory)).rejects.toMatchObject({
      code: "default-scenario",
      status: 409,
    });
  });

  it("preserves interactive-human combat profiles and transformation outcomes", async () => {
    const scenarioDirectory = path.join(directory, "scenarios");
    const consoleDirectory = path.join(directory, "consoles");
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.terrainPlacements.push({ id: "informant", terrainDefinitionId: "interactive-human", origin: { x: 10, y: 10 }, rotation: 0, objectSettings: { terminal: { label: "Mara Venn", facing: 270, combatProfile: { ...defaultTacticalInteractiveHumanCombatProfile, weaponId: "autopistol", skills: [{ name: "Leadership", level: 1 }] } } } });
    const consoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition);
    consoleVictory.operations.push({ id: "recruit-informant", consolePlacementId: "informant", label: "Recruit Mara Venn", prerequisites: { mode: "all", operationIds: [] }, checks: [{ id: "persuade", skill: "Persuade", difficulty: "average", apCost: 2 }], successTransformation: "ally", failureTransformation: "enemy", result: { type: "unlock", operationIds: [] } });

    const saved = await saveTacticalScenarioBundleAs("Human Transformation", draft, consoleVictory, scenarioDirectory, consoleDirectory);
    const loaded = await loadTacticalScenarioBundle("human-transformation", scenarioDirectory, consoleDirectory);

    expect(loaded).toEqual(saved);
    expect(loaded.scenario.terrainPlacements.find((placement) => placement.id === "informant")?.objectSettings?.terminal).toMatchObject({ facing: 270, combatProfile: { weaponId: "autopistol", skills: [{ name: "Leadership", level: 1 }] } });
    expect(loaded.consoleVictory.operations.find((operation) => operation.id === "recruit-informant")).toMatchObject({ successTransformation: "ally", failureTransformation: "enemy" });
  });

  it("never overwrites an existing scenario", async () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    await saveTacticalScenarioAs("Cargo Deck Assault", draft, directory);

    await expect(saveTacticalScenarioAs("Cargo Deck Assault", draft, directory)).rejects.toMatchObject({
      code: "scenario-exists",
      status: 409,
    });
  });

  it("protects the immutable default scenario", async () => {
    await expect(saveTacticalScenarioAs("Default Tactical Control Room", defaultTacticalScenarioDefinition, directory)).rejects.toMatchObject({
      code: "default-scenario",
      status: 409,
    });
  });

  it("rejects unsafe scenario IDs instead of treating them as paths", async () => {
    await expect(loadTacticalScenarioFile("../outside", directory)).rejects.toMatchObject({
      code: "invalid-scenario-id",
      status: 400,
    });
  });

  it("rejects invalid scenario content before writing a file", async () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.fireCells = [{ x: draft.map.width, y: 0 }];

    await expect(saveTacticalScenarioAs("Invalid Fire", draft, directory)).rejects.toMatchObject({
      code: "invalid-scenario",
      status: 400,
    });
    await expect(loadTacticalScenarioFile("invalid-fire", directory)).rejects.toMatchObject({
      code: "scenario-not-found",
      status: 404,
    });
  });

  it("rejects unsafe or invalid tracing-template settings", async () => {
    const unsafePath = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    unsafePath.tracingTemplate = {
      imagePath: "/images/tactical/../private/map.jpg",
      x: 0,
      y: 0,
      width: 20,
      height: 12,
      rotation: 0,
      opacity: 0.5,
      visible: true,
      lockAspectRatio: true,
    };
    await expect(saveTacticalScenarioAs("Unsafe Template", unsafePath, directory)).rejects.toMatchObject({
      code: "invalid-scenario",
      status: 400,
    });

    const invalidTransform = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    invalidTransform.tracingTemplate = {
      imagePath: "/images/tactical/landing-pad/map.jpg",
      x: 0,
      y: 0,
      width: 0,
      height: 12,
      rotation: 0,
      opacity: 1.1,
      visible: true,
      lockAspectRatio: false,
    };
    await expect(saveTacticalScenarioAs("Invalid Template Transform", invalidTransform, directory)).rejects.toMatchObject({
      code: "invalid-scenario",
      status: 400,
    });
  });

  it("rejects portals on curved walls", async () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.drawnWalls = [{
      id: "curved-portal-wall",
      from: { x: 2, y: 2 },
      control: { x: 5.5, y: 7.25 },
      to: { x: 9, y: 2 },
      portals: [{ id: "unsupported-door", kind: "sliding-door", position: 0.5 }],
    }];

    await expect(saveTacticalScenarioAs("Curved Portal Wall", draft, directory)).rejects.toMatchObject({
      code: "invalid-scenario",
      status: 400,
    });
  });

  it("rejects an enemy placed inside a crew deployment zone", async () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.enemyPlacements = [{ ...draft.enemyPlacements![0], position: { x: 0, y: draft.map.height - 1 } }];

    await expect(saveTacticalScenarioAs("Invalid Enemy Deployment", draft, directory)).rejects.toMatchObject({
      code: "invalid-scenario",
      status: 400,
    });
  });
});
