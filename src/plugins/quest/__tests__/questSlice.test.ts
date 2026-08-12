import reducer, {
  chainAdded,
  chainItemRequirementAdded,
  chainItemRequirementUpdated,
  chainItemRewardAdded,
  chainItemRewardUpdated,
  chainSelected,
  chainUpdated,
  connectionStarted,
  connectionRemoved,
  connectionSelected,
  connectionTargetSelected,
  nodeMoved,
  nodeSelected,
  questFlowConnectionStarted,
  questFlowConnectionRemoved,
  questFlowConnectionSelected,
  questFlowConnectionTargetSelected,
  questVictoryNodeAdded,
  questDocumentActivated,
  questHudVisibilityToggled,
  questItemDefinitionAdded,
  questItemDefinitionRemoved,
  questItemDefinitionUpdated,
  questPlaytestChainAttempted,
  questPlaytestChainResolved,
  questPlaytestItemAssigned,
  questPlaytestScenarioVictoryReached,
  questPlaytestStarted,
  questTitleChanged,
  scenarioInstanceAdded,
  scenarioInstanceRemoved,
} from "../questSlice";
import { createEmptyQuestDefinition } from "../editor/types";

describe("questSlice", () => {
  it("creates an independent scenario occurrence with start, entity, and victory nodes", () => {
    const state = reducer(undefined, scenarioInstanceAdded({
      sourceScenarioId: "flight-deck",
      title: "Flight Deck",
      entities: [{ sourcePlacementId: "console-a", entityType: "console", title: "Launch console" }],
    }));

    expect(state.editor.document.scenarioInstances).toHaveLength(1);
    expect(state.editor.document.scenarioInstances[0]?.nodes.map((node) => node.kind))
      .toEqual(["start", "entity", "victory"]);
    expect(state.editor.document.scenarioInstances[0]?.nodes[1]).toMatchObject({
      sourcePlacementId: "console-a",
      chains: [],
    });
  });

  it("keeps graph edits and skill chains in Redux state", () => {
    let state = reducer(undefined, scenarioInstanceAdded({
      sourceScenarioId: "flight-deck",
      title: "Flight Deck",
      entities: [{ sourcePlacementId: "console-a", entityType: "console", title: "Launch console" }],
    }));
    const scenario = state.editor.document.scenarioInstances[0]!;
    const start = scenario.nodes.find((node) => node.kind === "start")!;
    const entity = scenario.nodes.find((node) => node.kind === "entity")!;

    state = reducer(state, chainAdded(entity.id));
    const chainId = state.editor.document.scenarioInstances[0]!.nodes
      .find((node) => node.id === entity.id && node.kind === "entity")!.chains[0]!.id;
    state = reducer(state, nodeSelected(entity.id));
    state = reducer(state, chainSelected(chainId));
    state = reducer(state, chainUpdated({ chainId, name: "Override security", description: "Quest-specific route" }));
    state = reducer(state, nodeMoved({ nodeId: entity.id, position: { x: 444, y: 222 } }));
    state = reducer(state, connectionStarted({ sourceNodeId: start.id, sourceChainId: null }));
    state = reducer(state, connectionTargetSelected(entity.id));

    const updated = state.editor.document.scenarioInstances[0]!;
    expect(updated.nodes.find((node) => node.id === entity.id)).toMatchObject({
      position: { x: 444, y: 222 },
      chains: [{ name: "Override security", description: "Quest-specific route", tasks: [{ difficulty: "average" }] }],
    });
    expect(updated.connections).toEqual([expect.objectContaining({
      sourceNodeId: start.id,
      sourceChainId: null,
      targetNodeId: entity.id,
    })]);
  });

  it("links Quest Start and scenario victories through the independent Quest Flow graph", () => {
    let state = reducer(undefined, scenarioInstanceAdded({
      sourceScenarioId: "flight-deck",
      title: "Flight Deck",
      entities: [],
    }));
    state = reducer(state, scenarioInstanceAdded({
      sourceScenarioId: "moon-walk",
      title: "Moon Walk",
      entities: [],
    }));
    state = reducer(state, questVictoryNodeAdded());

    const graph = state.editor.document.questFlow;
    const start = graph.nodes.find((node) => node.kind === "quest-start")!;
    const scenarioNodes = graph.nodes.filter((node) => node.kind === "scenario");
    const questVictory = graph.nodes.find((node) => node.kind === "quest-victory")!;
    const firstScenario = state.editor.document.scenarioInstances
      .find((scenario) => scenario.id === scenarioNodes[0]!.scenarioInstanceId)!;
    const secondScenario = state.editor.document.scenarioInstances
      .find((scenario) => scenario.id === scenarioNodes[1]!.scenarioInstanceId)!;
    const firstVictory = firstScenario.nodes.find((node) => node.kind === "victory")!;
    const secondVictory = secondScenario.nodes.find((node) => node.kind === "victory")!;

    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: start.id, sourceScenarioVictoryId: null }));
    state = reducer(state, questFlowConnectionTargetSelected(scenarioNodes[0]!.id));
    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: scenarioNodes[0]!.id, sourceScenarioVictoryId: firstVictory.id }));
    state = reducer(state, questFlowConnectionTargetSelected(scenarioNodes[1]!.id));
    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: scenarioNodes[1]!.id, sourceScenarioVictoryId: secondVictory.id }));
    state = reducer(state, questFlowConnectionTargetSelected(questVictory.id));

    expect(state.editor.document.questFlow.connections).toEqual([
      expect.objectContaining({ sourceNodeId: start.id, sourceScenarioVictoryId: null, targetNodeId: scenarioNodes[0]!.id }),
      expect.objectContaining({ sourceNodeId: scenarioNodes[0]!.id, sourceScenarioVictoryId: firstVictory.id, targetNodeId: scenarioNodes[1]!.id }),
      expect.objectContaining({ sourceNodeId: scenarioNodes[1]!.id, sourceScenarioVictoryId: secondVictory.id, targetNodeId: questVictory.id }),
    ]);
  });

  it("tracks an activated file baseline independently from its editable Redux document", () => {
    const definition = createEmptyQuestDefinition("rescue-mission", "Rescue Mission");
    let state = reducer(undefined, questDocumentActivated({
      definition,
      summary: { id: definition.id, title: definition.title, isDefault: false },
      message: "Opened Rescue Mission.",
    }));
    state = reducer(state, questTitleChanged("Changed draft"));

    expect(state.editor.document.title).toBe("Changed draft");
    expect(state.editor.baseline.title).toBe("Rescue Mission");
    expect(state.editor.document.questFlow.nodes.filter((node) => node.kind === "quest-start")).toHaveLength(1);
  });

  it("keeps HUD visibility in Redux state", () => {
    const state = reducer(undefined, questHudVisibilityToggled("inspector"));
    expect(state.editor.hudLayouts.inspector.visible).toBe(false);
  });

  it("selects and deletes interaction links through Redux", () => {
    let state = reducer(undefined, scenarioInstanceAdded({ sourceScenarioId: "deck", title: "Deck", entities: [] }));
    const scenario = state.editor.document.scenarioInstances[0]!;
    const start = scenario.nodes.find((node) => node.kind === "start")!;
    const victory = scenario.nodes.find((node) => node.kind === "victory")!;
    state = reducer(state, connectionStarted({ sourceNodeId: start.id, sourceChainId: null }));
    state = reducer(state, connectionTargetSelected(victory.id));
    const connectionId = state.editor.document.scenarioInstances[0]!.connections[0]!.id;
    state = reducer(state, connectionSelected(connectionId));
    expect(state.editor.selection).toEqual({ nodeId: null, chainId: null, connectionId });
    state = reducer(state, connectionRemoved(connectionId));
    expect(state.editor.document.scenarioInstances[0]!.connections).toHaveLength(0);
    expect(state.editor.selection.connectionId).toBeNull();
  });

  it("selects and deletes quest-flow links through Redux", () => {
    let state = reducer(undefined, scenarioInstanceAdded({ sourceScenarioId: "deck", title: "Deck", entities: [] }));
    const start = state.editor.document.questFlow.nodes.find((node) => node.kind === "quest-start")!;
    const scenarioNode = state.editor.document.questFlow.nodes.find((node) => node.kind === "scenario")!;
    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: start.id, sourceScenarioVictoryId: null }));
    state = reducer(state, questFlowConnectionTargetSelected(scenarioNode.id));
    const connectionId = state.editor.document.questFlow.connections[0]!.id;
    state = reducer(state, questFlowConnectionSelected(connectionId));
    expect(state.editor.questFlowSelection).toEqual({ nodeId: null, connectionId });
    state = reducer(state, questFlowConnectionRemoved(connectionId));
    expect(state.editor.document.questFlow.connections).toHaveLength(0);
    expect(state.editor.questFlowSelection.connectionId).toBeNull();
  });

  it("defines quest items and configures chain requirements and success rewards", () => {
    let state = reducer(undefined, questItemDefinitionAdded());
    const itemId = state.editor.document.itemDefinitions[0]!.id;
    expect(state.editor.selectedQuestItemId).toBe(itemId);
    state = reducer(state, questItemDefinitionUpdated({ id: itemId, name: "Vault Key", requiredSkill: "Security", unskilledDm: -3 }));
    state = reducer(state, scenarioInstanceAdded({ sourceScenarioId: "vault", title: "Vault", entities: [{ sourcePlacementId: "door", entityType: "console", title: "Vault Door" }] }));
    const scenario = state.editor.document.scenarioInstances[0]!;
    const entity = scenario.nodes.find((node) => node.kind === "entity")!;
    state = reducer(state, chainAdded(entity.id));
    const chain = state.editor.document.scenarioInstances[0]!.nodes.find((node) => node.kind === "entity")!;
    if (chain.kind !== "entity") throw new Error("Expected entity node");
    const chainId = chain.chains[0]!.id;
    state = reducer(state, chainItemRequirementAdded(itemId));
    const requirementId = state.editor.document.scenarioInstances[0]!.nodes.flatMap((node) => node.kind === "entity" ? node.chains : []).find((item) => item.id === chainId)!.itemRequirements[0]!.id;
    state = reducer(state, chainItemRequirementUpdated({ requirementId, quantity: 2, consumeOn: ["success", "critical-failure"] }));
    state = reducer(state, chainItemRewardAdded(itemId));
    const rewardId = state.editor.document.scenarioInstances[0]!.nodes.flatMap((node) => node.kind === "entity" ? node.chains : []).find((item) => item.id === chainId)!.successRewards[0]!.id;
    state = reducer(state, chainItemRewardUpdated({ rewardId, quantity: 3, repeatable: true, recipient: { mode: "player-choice" } }));

    const updatedChain = state.editor.document.scenarioInstances[0]!.nodes.flatMap((node) => node.kind === "entity" ? node.chains : []).find((item) => item.id === chainId)!;
    expect(state.editor.document.itemDefinitions[0]).toMatchObject({ name: "Vault Key", requiredSkill: "Security", unskilledDm: -3 });
    expect(updatedChain.itemRequirements[0]).toMatchObject({ quantity: 2, consumeOn: ["success", "critical-failure"] });
    expect(updatedChain.successRewards[0]).toMatchObject({ quantity: 3, repeatable: true, recipient: { mode: "player-choice" } });

    state = reducer(state, questItemDefinitionRemoved(itemId));
    const chainAfterRemoval = state.editor.document.scenarioInstances[0]!.nodes.flatMap((node) => node.kind === "entity" ? node.chains : []).find((item) => item.id === chainId)!;
    expect(state.editor.document.itemDefinitions).toHaveLength(0);
    expect(state.editor.selectedQuestItemId).toBeNull();
    expect(chainAfterRemoval.itemRequirements).toHaveLength(0);
    expect(chainAfterRemoval.successRewards).toHaveLength(0);
  });

  it("removes a scenario occurrence and every quest-flow link touching it", () => {
    let state = reducer(undefined, scenarioInstanceAdded({ sourceScenarioId: "alpha", title: "Alpha", entities: [] }));
    state = reducer(state, scenarioInstanceAdded({ sourceScenarioId: "beta", title: "Beta", entities: [] }));
    const [alpha, beta] = state.editor.document.scenarioInstances;
    const start = state.editor.document.questFlow.nodes.find((node) => node.kind === "quest-start")!;
    const alphaFlow = state.editor.document.questFlow.nodes.find((node) => node.kind === "scenario" && node.scenarioInstanceId === alpha!.id)!;
    const betaFlow = state.editor.document.questFlow.nodes.find((node) => node.kind === "scenario" && node.scenarioInstanceId === beta!.id)!;
    const alphaVictory = alpha!.nodes.find((node) => node.kind === "victory")!;
    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: start.id, sourceScenarioVictoryId: null }));
    state = reducer(state, questFlowConnectionTargetSelected(alphaFlow.id));
    state = reducer(state, questFlowConnectionStarted({ sourceNodeId: alphaFlow.id, sourceScenarioVictoryId: alphaVictory.id }));
    state = reducer(state, questFlowConnectionTargetSelected(betaFlow.id));

    state = reducer(state, scenarioInstanceRemoved(alpha!.id));

    expect(state.editor.document.scenarioInstances.map((scenario) => scenario.id)).toEqual([beta!.id]);
    expect(state.editor.document.questFlow.nodes.some((node) => node.id === alphaFlow.id)).toBe(false);
    expect(state.editor.document.questFlow.connections).toHaveLength(0);
  });

  it("tracks playtest item custody, chain rewards, and Quest Victory in Redux", () => {
    const definition = createEmptyQuestDefinition("runtime-quest", "Runtime Quest");
    definition.itemDefinitions.push({ id: "key", name: "Key", description: "", icon: "key", requiredSkill: null, unskilledDm: -2 });
    definition.scenarioInstances.push({
      id: "scene", sourceScenarioId: "source", title: "Scene", connections: [], nodes: [
        { id: "node", kind: "entity", entityType: "console", sourcePlacementId: "console", title: "Console", description: "", position: { x: 0, y: 0 }, chains: [{ id: "chain", name: "Use key", description: "", tasks: [{ id: "task", skill: "Security", difficulty: "average" }], itemRequirements: [{ id: "requirement", itemDefinitionId: "key", quantity: 1, consumeOn: ["attempt"] }], successRewards: [{ id: "reward", itemDefinitionId: "key", quantity: 2, repeatable: false, recipient: { mode: "performer" } }] }] },
        { id: "scene-victory", kind: "victory", title: "Done", description: "", position: { x: 0, y: 0 } },
      ],
    });
    definition.questFlow.nodes.push(
      { id: "scene-flow", kind: "scenario", scenarioInstanceId: "scene", position: { x: 0, y: 0 } },
      { id: "quest-win", kind: "quest-victory", title: "Win", description: "", position: { x: 0, y: 0 } },
    );
    definition.questFlow.connections.push(
      { id: "start-scene", sourceNodeId: "quest-start", sourceScenarioVictoryId: null, targetNodeId: "scene-flow" },
      { id: "scene-win", sourceNodeId: "scene-flow", sourceScenarioVictoryId: "scene-victory", targetNodeId: "quest-win" },
    );
    let state = reducer(undefined, questDocumentActivated({ definition, summary: { id: definition.id, title: definition.title, isDefault: false }, message: "Opened" }));
    state = reducer(state, questPlaytestStarted({ mode: "entire-quest" }));
    state = reducer(state, questPlaytestItemAssigned({ itemDefinitionId: "key", characterId: "crew" }));
    state = reducer(state, questPlaytestChainAttempted({ chainId: "chain", characterId: "crew" }));
    expect(state.editor.playtest.itemInstances).toHaveLength(0);
    state = reducer(state, questPlaytestChainResolved({ chainId: "chain", nodeId: "node", characterId: "crew", outcome: "success" }));
    expect(state.editor.playtest.itemInstances).toHaveLength(2);
    expect(state.editor.playtest.completedChainIds).toEqual(["chain"]);
    state = reducer(state, questPlaytestScenarioVictoryReached({ scenarioInstanceId: "scene", victoryNodeId: "scene-victory" }));
    expect(state.editor.playtest.status).toBe("quest-victory");
  });
});
