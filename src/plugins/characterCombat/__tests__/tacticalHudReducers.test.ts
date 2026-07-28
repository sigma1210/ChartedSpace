import characterCombatReducer, {
  initializeTacticalMapSetup,
  updateTacticalActionHud,
  updateTacticalCharacterHud,
  updateTacticalCharacterInformationHud,
  updateTacticalDeploymentHud,
  updateTacticalEnemyHud,
  updateTacticalEventsHud,
  updateTacticalScenarioHud,
} from "../slice";
import type { CharacterCombatHudLayout } from "../types";

const layout = (x: number): CharacterCombatHudLayout => ({
  visible: x % 2 === 0,
  pinned: x % 3 === 0,
  position: { x, y: x + 10 },
});

describe("tactical HUD reducers", () => {
  it("updates every tactical HUD layout through the existing slice actions", () => {
    const layouts = {
      characterHudLayout: layout(10),
      enemyHudLayout: layout(20),
      actionHudLayout: layout(30),
      deploymentHudLayout: layout(40),
      characterInformationHudLayout: layout(50),
      eventsHudLayout: layout(60),
      scenarioHudLayout: layout(70),
    };
    let state = characterCombatReducer(undefined, initializeTacticalMapSetup(["crew-1"]));

    state = characterCombatReducer(state, updateTacticalCharacterHud(layouts.characterHudLayout));
    state = characterCombatReducer(state, updateTacticalEnemyHud(layouts.enemyHudLayout));
    state = characterCombatReducer(state, updateTacticalActionHud(layouts.actionHudLayout));
    state = characterCombatReducer(state, updateTacticalDeploymentHud(layouts.deploymentHudLayout));
    state = characterCombatReducer(state, updateTacticalCharacterInformationHud(layouts.characterInformationHudLayout));
    state = characterCombatReducer(state, updateTacticalEventsHud(layouts.eventsHudLayout));
    state = characterCombatReducer(state, updateTacticalScenarioHud(layouts.scenarioHudLayout));

    expect(state.tacticalMap).toMatchObject(layouts);
  });

  it("preserves the existing action types and safely ignores updates before tactical initialization", () => {
    const actionCreators = [
      updateTacticalCharacterHud,
      updateTacticalEnemyHud,
      updateTacticalActionHud,
      updateTacticalDeploymentHud,
      updateTacticalCharacterInformationHud,
      updateTacticalEventsHud,
      updateTacticalScenarioHud,
    ];

    expect(actionCreators.map((actionCreator) => actionCreator.type)).toEqual([
      "characterCombat/updateTacticalCharacterHud",
      "characterCombat/updateTacticalEnemyHud",
      "characterCombat/updateTacticalActionHud",
      "characterCombat/updateTacticalDeploymentHud",
      "characterCombat/updateTacticalCharacterInformationHud",
      "characterCombat/updateTacticalEventsHud",
      "characterCombat/updateTacticalScenarioHud",
    ]);
    actionCreators.forEach((actionCreator) => {
      expect(characterCombatReducer(undefined, actionCreator(layout(5)))).toEqual({});
    });
  });
});
