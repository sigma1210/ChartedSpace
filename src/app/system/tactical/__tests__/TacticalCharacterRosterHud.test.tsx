/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  activateTacticalCharacter,
  selectTacticalDeploymentCharacter,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import {
  setSelectedProfileCharacter,
  type CharacterSummary,
} from "@/plugins/characters";
import { TacticalCharacterRosterHud } from "../TacticalCharacterRosterHud";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({ children, title }: { children: ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
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
  skills: [],
  worldName: null,
  sectorAbbr: null,
  hex: null,
};

describe("TacticalCharacterRosterHud", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("selects crew for deployment and synchronizes their profile during setup", () => {
    const tacticalMap = freshTacticalMap(["crew-1"], undefined, { setup: true });
    render(
      <TacticalCharacterRosterHud
        tacticalMap={tacticalMap}
        characters={[character]}
        transformedAllies={[]}
        activeCombatant={null}
        characterStatus="loaded"
        shipStatus="loaded"
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Select Test Crew for deployment",
    }));

    expect(mockDispatch.mock.calls.map(([action]) => action)).toEqual([
      expect.objectContaining({
        type: selectTacticalDeploymentCharacter.type,
        payload: character.id,
      }),
      expect.objectContaining({
        type: setSelectedProfileCharacter.type,
        payload: character.id,
      }),
    ]);
  });

  it("activates available crew during tactical play", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.actionPointsByCharacterId[character.id] = 4;
    render(
      <TacticalCharacterRosterHud
        tacticalMap={tacticalMap}
        characters={[character]}
        transformedAllies={[]}
        activeCombatant={null}
        characterStatus="loaded"
        shipStatus="loaded"
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Select Test Crew, 4 AP",
    }));

    expect(mockDispatch.mock.calls[0]![0]).toMatchObject({
      type: activateTacticalCharacter.type,
      payload: character.id,
    });
  });

  it("activates transformed allies without selecting a character profile", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const ally = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    ally.id = "rescued:combatant";
    ally.name = "Rescued Ally";
    ally.side = "player";
    tacticalMap.actionPointsByCharacterId[ally.id] = 6;

    render(
      <TacticalCharacterRosterHud
        tacticalMap={tacticalMap}
        characters={[character]}
        transformedAllies={[ally]}
        activeCombatant={null}
        characterStatus="loaded"
        shipStatus="loaded"
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Select ally Rescued Ally, 6 AP",
    }));

    expect(mockDispatch.mock.calls.map(([action]) => action)).toEqual([
      expect.objectContaining({
        type: activateTacticalCharacter.type,
        payload: ally.id,
      }),
      expect.objectContaining({
        type: setSelectedProfileCharacter.type,
        payload: null,
      }),
    ]);
  });

  it("shows the empty roster message only after crew data is loaded", () => {
    const tacticalMap = freshTacticalMap([]);
    render(
      <TacticalCharacterRosterHud
        tacticalMap={tacticalMap}
        characters={[]}
        transformedAllies={[]}
        activeCombatant={null}
        characterStatus="loaded"
        shipStatus="loaded"
      />,
    );

    expect(screen.getByText("No assigned character crew")).toBeTruthy();
  });
});
