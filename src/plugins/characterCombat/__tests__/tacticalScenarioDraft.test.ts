import { createAppStore } from "../../../store";
import { deployTacticalCharacter, initializeTacticalDraftPlaytest, initializeTacticalMapSetup, selectTacticalDeploymentCharacter, startTacticalScenario } from "../slice";
import { cloneTacticalScenarioDefinition, defaultTacticalScenarioDefinition } from "../tacticalScenarioDefinitions";

describe("tactical scenario draft isolation", () => {
  it("runs a draft in a sandbox store without changing the active tactical store", () => {
    const activeStore = createAppStore();
    activeStore.dispatch(initializeTacticalMapSetup(["crew-1", "crew-2"]));
    const activeBefore = activeStore.getState().plugins.characterCombat.tacticalMap;
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.title = "Isolated Draft";

    const sandboxStore = createAppStore(activeStore.getState());
    sandboxStore.dispatch(initializeTacticalDraftPlaytest({ crew: ["crew-1", "crew-2"], definition: draft }));
    sandboxStore.dispatch(selectTacticalDeploymentCharacter("crew-1"));
    sandboxStore.dispatch(deployTacticalCharacter({ x: 0, y: 42 }));
    sandboxStore.dispatch(selectTacticalDeploymentCharacter("crew-2"));
    sandboxStore.dispatch(deployTacticalCharacter({ x: 1, y: 42 }));
    sandboxStore.dispatch(startTacticalScenario());

    expect(sandboxStore.getState().plugins.characterCombat.tacticalMap).toMatchObject({ scenarioStatus: "active", scenario: { title: "Isolated Draft" } });
    expect(activeStore.getState().plugins.characterCombat.tacticalMap).toBe(activeBefore);
    expect(activeStore.getState().plugins.characterCombat.tacticalMap).toMatchObject({ scenarioStatus: "setup", scenario: { title: "Control Room Assault" } });
  });

  it("preserves drawn grass and water when initializing a draft playtest", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.drawnTerrainRegions = [{
      id: "draft-grass",
      kind: "grass",
      segments: [
        { kind: "line", from: { x: 20, y: 2 }, to: { x: 24, y: 2 } },
        { kind: "line", from: { x: 24, y: 2 }, to: { x: 24, y: 6 } },
        { kind: "line", from: { x: 24, y: 6 }, to: { x: 20, y: 6 } },
        { kind: "line", from: { x: 20, y: 6 }, to: { x: 20, y: 2 } },
      ],
    }, {
      id: "draft-water",
      kind: "water",
      segments: [
        { kind: "line", from: { x: 26, y: 2 }, to: { x: 30, y: 2 } },
        { kind: "line", from: { x: 30, y: 2 }, to: { x: 30, y: 6 } },
        { kind: "line", from: { x: 30, y: 6 }, to: { x: 26, y: 6 } },
        { kind: "line", from: { x: 26, y: 6 }, to: { x: 26, y: 2 } },
      ],
    }];

    const sandboxStore = createAppStore();
    sandboxStore.dispatch(initializeTacticalDraftPlaytest({
      crew: ["crew-1", "crew-2"],
      definition: draft,
    }));

    expect(sandboxStore.getState().plugins.characterCombat.tacticalMap?.scenario.drawnTerrainRegions)
      .toEqual(draft.drawnTerrainRegions);
  });
});
