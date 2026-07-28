/** @jest-environment jsdom */

import { render } from "@testing-library/react";
import {
  initializeTacticalDraftPlaytest,
  initializeTacticalMapSetup,
  recordTacticalEnemySightings,
  recordTacticalExploration,
} from "@/plugins/characterCombat/slice";
import { defaultTacticalConsoleVictoryDefinition } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import {
  setSelectedProfileCharacter,
  type CharacterSummary,
} from "@/plugins/characters";
import { TacticalMapLifecycle } from "../TacticalMapLifecycle";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

const character: CharacterSummary = {
  id: "crew-1",
  name: "Test Crew",
  upp: "777777",
  strength: 7,
  dexterity: 7,
  endurance: 7,
  intelligence: 7,
  education: 7,
  socialStanding: 7,
  credits: 0,
  skills: [
    { name: "Gun Combat", level: 2 },
    { name: "Melee", level: 1 },
  ],
  worldName: null,
  sectorAbbr: null,
  hex: null,
};

const defaultProps = {
  characterStatus: "loaded" as const,
  shipStatus: "loaded" as const,
  characters: [character],
  exploredCells: new Set<string>(),
  visibleCellKeys: [] as string[],
  visibleEnemySightings: [],
  activeCombatant: null,
  selectedProfileCharacterId: null,
};

describe("TacticalMapLifecycle", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("initializes a normal tactical setup from the loaded crew", () => {
    render(<TacticalMapLifecycle {...defaultProps} />);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: initializeTacticalMapSetup.type,
        payload: [{
          id: character.id,
          name: character.name,
          weaponSkill: 2,
          meleeRating: 1,
          skills: character.skills,
        }],
      }),
    );
  });

  it("initializes the editor draft instead of the normal scenario", () => {
    render(
      <TacticalMapLifecycle
        {...defaultProps}
        draftPlaytest={{
          definition: defaultTacticalScenarioDefinition,
          consoleVictory: defaultTacticalConsoleVictoryDefinition,
        }}
      />,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: initializeTacticalDraftPlaytest.type }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: initializeTacticalMapSetup.type }),
    );
  });

  it("records only newly visible cells and current enemy sightings", () => {
    const visibleEnemySightings = [{
      id: "enemy-1",
      position: { x: 4, y: 5 },
    }];
    render(
      <TacticalMapLifecycle
        {...defaultProps}
        exploredCells={new Set(["1,1"])}
        visibleCellKeys={["1,1", "2,2"]}
        visibleEnemySightings={visibleEnemySightings}
      />,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: recordTacticalExploration.type,
        payload: ["2,2"],
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: recordTacticalEnemySightings.type,
        payload: {
          visibleCellKeys: ["1,1", "2,2"],
          enemies: visibleEnemySightings,
        },
      }),
    );
  });

  it("synchronizes the profile to the active combatant source character", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    activeCombatant.sourceCharacterId = "source-character";

    render(
      <TacticalMapLifecycle
        {...defaultProps}
        activeCombatant={activeCombatant}
      />,
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: setSelectedProfileCharacter.type,
        payload: "source-character",
      }),
    );
  });

  it("requests characters when their state is idle", () => {
    render(
      <TacticalMapLifecycle
        {...defaultProps}
        characterStatus="idle"
        shipStatus="loading"
      />,
    );

    expect(mockDispatch.mock.calls.some(([action]) => typeof action === "function")).toBe(true);
  });
});
