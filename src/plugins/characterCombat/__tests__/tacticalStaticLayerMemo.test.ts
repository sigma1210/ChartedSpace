import { buildDefaultTacticalScenario } from "@/plugins/characterCombat/defaultTacticalScenario";
import {
  tacticalDeploymentAreaScenarioEqual,
  tacticalLightingScenarioEqual,
} from "../tacticalStaticLayerMemo";

describe("tactical static layer memoization", () => {
  it("keeps deployment and lighting layers stable when only crew move", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const movedScenario = {
      ...scenario,
      combatants: scenario.combatants.map((combatant, index) =>
        index === 0
          ? { ...combatant, position: { x: 1, y: 1 } }
          : combatant),
    };

    expect(
      tacticalDeploymentAreaScenarioEqual(scenario, movedScenario),
    ).toBe(true);
    expect(tacticalLightingScenarioEqual(scenario, movedScenario)).toBe(true);
  });

  it("invalidates deployment rendering when elevation data changes", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const elevatedScenario = {
      ...scenario,
      elevationLevelByCell: {
        ...scenario.elevationLevelByCell,
        "1:1": 1,
      },
    };

    expect(
      tacticalDeploymentAreaScenarioEqual(scenario, elevatedScenario),
    ).toBe(false);
  });

  it("invalidates lighting when doors or lights change", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const doorScenario = {
      ...scenario,
      doors: scenario.doors.map((door, index) =>
        index === 0 ? { ...door, open: !door.open } : door),
    };
    const lightScenario = {
      ...scenario,
      lightSources: scenario.lightSources?.map((source, index) =>
        index === 0 ? { ...source, on: source.on === false } : source),
    };

    expect(tacticalLightingScenarioEqual(scenario, doorScenario)).toBe(false);
    expect(tacticalLightingScenarioEqual(scenario, lightScenario)).toBe(false);
  });
});
