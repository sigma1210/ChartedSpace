/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  updateTacticalCharacterInformationHud,
  updateTacticalEventsHud,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalCharacterInformationHud } from "../TacticalCharacterInformationHud";
import { TacticalEventsHud } from "../TacticalEventsHud";

const mockDispatch = jest.fn();
const mockMovedLayout = {
  visible: true,
  pinned: true,
  position: { x: 20, y: 30 },
};

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({
    children,
    title,
    onLayoutChange,
  }: {
    children: ReactNode;
    title: string;
    onLayoutChange: (layout: typeof mockMovedLayout) => void;
  }) => (
    <div aria-label={title}>
      {children}
      <button type="button" onClick={() => onLayoutChange(mockMovedLayout)}>
        Move {title}
      </button>
    </div>
  ),
}));

describe("tactical presentation HUDs", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("renders selected character combat information", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 4;
    tacticalMap.ammunitionByCharacterId[activeCombatant.id] = 3;
    tacticalMap.suppressedCombatantIds = [activeCombatant.id];
    tacticalMap.actedCharacterIds = [activeCombatant.id];

    render(
      <TacticalCharacterInformationHud
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
      />,
    );

    expect(screen.getByText(activeCombatant.name)).toBeTruthy();
    expect(screen.getByText("4/6")).toBeTruthy();
    expect(screen.getByText("Suppressed")).toBeTruthy();
    expect(screen.getByText("Complete")).toBeTruthy();
  });

  it("renders the empty character state and dispatches layout changes", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    render(
      <TacticalCharacterInformationHud
        tacticalMap={tacticalMap}
        activeCombatant={null}
      />,
    );

    expect(screen.getByText("No character selected.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "Move Selected Character",
    }));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: updateTacticalCharacterInformationHud.type,
        payload: mockMovedLayout,
      }),
    );
  });

  it("renders only the six most recent stored events", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.events = Array.from(
      { length: 7 },
      (_, index) => `Event ${index + 1}`,
    );

    render(<TacticalEventsHud tacticalMap={tacticalMap} />);

    expect(screen.getByText("Event 1")).toBeTruthy();
    expect(screen.getByText("Event 6")).toBeTruthy();
    expect(screen.queryByText("Event 7")).toBeNull();
  });

  it("renders the empty event state and dispatches layout changes", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.events = [];
    render(<TacticalEventsHud tacticalMap={tacticalMap} />);

    expect(screen.getByText("No events.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Move Events" }));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: updateTacticalEventsHud.type,
        payload: mockMovedLayout,
      }),
    );
  });
});
