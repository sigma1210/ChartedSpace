/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  resetTacticalScenario,
  runTacticalEnemyPhase,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import type { TacticalMovementPreview } from "@/plugins/characterCombat/tacticalMovementPreview";
import { TacticalActionHud } from "../TacticalActionHud";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({ children, title }: { children: ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
}));

jest.mock("../TacticalCombatControls", () => ({
  TacticalCombatControls: ({ children }: { children: ReactNode }) => (
    <div data-testid="combat-controls">{children}</div>
  ),
}));

jest.mock("../TacticalMovementControls", () => ({
  TacticalMovementControls: ({ children }: { children: ReactNode }) => (
    <div data-testid="movement-controls">{children}</div>
  ),
}));

jest.mock("../TacticalSupportControls", () => ({
  TacticalSupportControls: ({ section }: { section: string }) => (
    <div data-testid={`support-${section}`} />
  ),
}));

jest.mock("../TacticalReactionControls", () => {
  const actual = jest.requireActual("../TacticalReactionControls");
  return {
    ...actual,
    TacticalReactionControls: () => <div data-testid="reaction-controls" />,
  };
});

const movementPreview: TacticalMovementPreview = {
  candidateMoves: new Map(),
  legalMoves: new Map(),
};

describe("TacticalActionHud lifecycle", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const renderHud = ({
    status = "active",
    active = true,
  }: {
    status?: "setup" | "active" | "victory" | "defeat";
    active?: boolean;
  } = {}) => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.scenarioStatus = status;
    const activeCombatant = active
      ? tacticalMap.scenario.combatants.find((unit) => unit.side === "player")!
      : null;

    render(
      <TacticalActionHud
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        enemies={tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy")}
        movementPreview={movementPreview}
      />,
    );

    return { tacticalMap, activeCombatant };
  };

  it("does not render during scenario setup", () => {
    renderHud({ status: "setup" });

    expect(screen.queryByLabelText("Current Action")).toBeNull();
  });

  it.each([
    ["victory", "Victory — Security Terminal Secured"],
    ["defeat", "Defeat — Crew Incapacitated"],
  ] as const)("renders the %s outcome instead of action controls", (status, message) => {
    renderHud({ status });

    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByTestId("combat-controls")).toBeNull();
    expect(screen.queryByTestId("reaction-controls")).toBeNull();
  });

  it("gives a pending reaction priority over active-character actions", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    const mover = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    tacticalMap.pendingAdjacencyReaction = {
      moverId: mover.id,
      defenderIds: [activeCombatant.id],
    };

    render(
      <TacticalActionHud
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        enemies={[mover]}
        movementPreview={movementPreview}
      />,
    );

    expect(screen.getByTestId("reaction-controls")).toBeTruthy();
    expect(screen.queryByTestId("combat-controls")).toBeNull();
  });

  it("renders combat, support, and movement controls for the active character", () => {
    renderHud();

    expect(screen.getByTestId("combat-controls")).toBeTruthy();
    expect(screen.getByTestId("support-recovery")).toBeTruthy();
    expect(screen.getByTestId("movement-controls")).toBeTruthy();
    expect(screen.getByTestId("support-terrain")).toBeTruthy();
  });

  it("offers and dispatches the enemy phase after all crew activations", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.scenario.combatants
      .filter((unit) => unit.side === "player")
      .forEach((unit) => {
        tacticalMap.actionPointsByCharacterId[unit.id] = 0;
      });

    render(
      <TacticalActionHud
        tacticalMap={tacticalMap}
        activeCombatant={null}
        enemies={tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy")}
        movementPreview={movementPreview}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "End Turn" }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: runTacticalEnemyPhase.type }),
    );
  });

  it("prompts for a character while crew activations remain", () => {
    renderHud({ active: false });

    expect(screen.getByText("Select a green character.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "End Turn" })).toBeNull();
  });

  it("dispatches the normal scenario reset", () => {
    renderHud();

    fireEvent.click(screen.getByRole("button", { name: "Reset Scenario" }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: resetTacticalScenario.type }),
    );
  });
});
