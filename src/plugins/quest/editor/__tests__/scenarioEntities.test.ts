import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { questEntitiesFromScenario } from "../scenarioEntities";

describe("questEntitiesFromScenario", () => {
  it("discovers consoles and interactive humanoids without importing base chains", () => {
    const definition = {
      terrainPlacements: [
        {
          id: "bridge-console",
          terrainDefinitionId: "console-1x1",
          origin: { x: 1, y: 1 },
          rotation: 0,
          objectSettings: { terminal: { label: "Bridge access" } },
        },
        {
          id: "engineer",
          terrainDefinitionId: "interactive-human",
          origin: { x: 2, y: 2 },
          rotation: 0,
          objectSettings: { human: { label: "Chief Engineer" } },
        },
        {
          id: "cover",
          terrainDefinitionId: "close-machinery-1x1",
          origin: { x: 3, y: 3 },
          rotation: 0,
        },
      ],
    } as TacticalScenarioDefinitionFile;

    expect(questEntitiesFromScenario(definition)).toEqual([
      { sourcePlacementId: "bridge-console", entityType: "console", title: "Bridge access" },
      { sourcePlacementId: "engineer", entityType: "interactive-human", title: "Chief Engineer" },
    ]);
  });
});

