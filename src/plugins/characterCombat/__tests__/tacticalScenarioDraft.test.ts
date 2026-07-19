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
});
