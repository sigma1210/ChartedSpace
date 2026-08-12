import { createEmptyQuestDefinition, type QuestScenarioInstance } from "../../editor/types";
import {
  characterHasQuestRequirement,
  firstQuestScenarioInstanceId,
  inactiveQuestPlaytestRuntime,
  nextScenarioAfterVictory,
  questScenarioConsoleVictory,
} from "../questPlaytest";

const scenario = (): QuestScenarioInstance => ({
  id: "scenario-a",
  sourceScenarioId: "source-a",
  title: "Scenario A",
  nodes: [
    { id: "start", kind: "start", title: "Start", position: { x: 0, y: 0 } },
    { id: "console", kind: "entity", entityType: "console", sourcePlacementId: "console-placement", title: "Console", description: "", position: { x: 100, y: 0 }, chains: [{ id: "security-chain", name: "Override", description: "", tasks: [{ id: "security", skill: "Security", difficulty: "average" }], itemRequirements: [{ id: "key-required", itemDefinitionId: "vault-key", quantity: 2, consumeOn: [] }], successRewards: [] }] },
    { id: "victory", kind: "victory", title: "Victory", description: "", position: { x: 200, y: 0 } },
  ],
  connections: [
    { id: "start-link", sourceNodeId: "start", sourceChainId: null, targetNodeId: "console" },
    { id: "victory-link", sourceNodeId: "console", sourceChainId: "security-chain", targetNodeId: "victory" },
  ],
});

describe("quest playtest helpers", () => {
  it("translates quest chains into six-AP Tactical operations", () => {
    const translated = questScenarioConsoleVictory("quest", scenario());
    expect(translated.operations[0]).toMatchObject({
      consolePlacementId: "console-placement",
      checks: [{ id: "security", apCost: 6 }],
      result: { type: "victory" },
      quest: { chainId: "security-chain", scenarioVictoryNodeId: "victory" },
    });
  });

  it("requires the attempting character to hold every required copy", () => {
    const runtime = inactiveQuestPlaytestRuntime();
    runtime.itemInstances = [
      { id: "copy-1", itemDefinitionId: "vault-key", characterId: "crew-1" },
      { id: "copy-2", itemDefinitionId: "vault-key", characterId: "crew-1" },
    ];
    const chain = scenario().nodes.flatMap((node) => node.kind === "entity" ? node.chains : [])[0]!;
    expect(characterHasQuestRequirement(runtime, chain, "crew-1")).toBe(true);
    expect(characterHasQuestRequirement(runtime, chain, "crew-2")).toBe(false);
  });

  it("enters at Quest Start and follows a scenario victory connector", () => {
    const definition = createEmptyQuestDefinition("quest", "Quest");
    const first = scenario();
    const second = { ...scenario(), id: "scenario-b", sourceScenarioId: "source-b", title: "Scenario B" };
    definition.scenarioInstances = [first, second];
    definition.questFlow.nodes.push(
      { id: "flow-a", kind: "scenario", scenarioInstanceId: first.id, position: { x: 0, y: 0 } },
      { id: "flow-b", kind: "scenario", scenarioInstanceId: second.id, position: { x: 0, y: 0 } },
    );
    definition.questFlow.connections.push(
      { id: "quest-start-link", sourceNodeId: "quest-start", sourceScenarioVictoryId: null, targetNodeId: "flow-a" },
      { id: "next-link", sourceNodeId: "flow-a", sourceScenarioVictoryId: "victory", targetNodeId: "flow-b" },
    );
    expect(firstQuestScenarioInstanceId(definition)).toBe("scenario-a");
    expect(nextScenarioAfterVictory(definition, "scenario-a", "victory")).toEqual({ kind: "scenario", scenarioInstanceId: "scenario-b" });
  });
});
