/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  confirmTacticalMove,
  setTacticalMovementMode,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import type { TacticalMovementPreview } from "@/plugins/characterCombat/tacticalMovementPreview";
import { pointKey } from "@/plugins/characterCombat/geometry";
import { TacticalMovementControls } from "../TacticalMovementControls";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

describe("TacticalMovementControls", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const movementState = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 6;
    tacticalMap.movementMode = "walk";
    const movementPreview: TacticalMovementPreview = {
      candidateMoves: new Map(),
      legalMoves: new Map(),
    };
    return { tacticalMap, activeCombatant, movementPreview };
  };

  it("keeps terrain interaction between posture controls and activation completion", () => {
    const { tacticalMap, activeCombatant, movementPreview } = movementState();
    render(
      <TacticalMovementControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        enemies={[]}
        movementPreview={movementPreview}
      >
        <div>Terrain interaction</div>
      </TacticalMovementControls>,
    );

    const posture = screen.getByRole("button", { name: "Go prone, 1 AP" });
    const terrain = screen.getByText("Terrain interaction");
    const finish = screen.getByRole("button", {
      name: /Finish Activation/,
    });

    expect(posture.compareDocumentPosition(terrain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(terrain.compareDocumentPosition(finish) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("dispatches evade movement mode", () => {
    const { tacticalMap, activeCombatant, movementPreview } = movementState();
    render(
      <TacticalMovementControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        enemies={[]}
        movementPreview={movementPreview}
      >
        {null}
      </TacticalMovementControls>,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Evade · move 1 · 6 AP · −2 ranged hit",
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: setTacticalMovementMode.type,
        payload: "evade",
      }),
    );
  });

  it("dispatches confirmation rolls for the planned move", () => {
    const { tacticalMap, activeCombatant, movementPreview } = movementState();
    const destination = {
      x: activeCombatant.position.x + 1,
      y: activeCombatant.position.y,
    };
    const move = {
      combatantId: activeCombatant.id,
      destination,
      path: [destination],
      cost: 1,
    };
    tacticalMap.plannedDestination = destination;
    movementPreview.candidateMoves.set(pointKey(destination), move);
    movementPreview.legalMoves.set(pointKey(destination), move);

    render(
      <TacticalMovementControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        enemies={[]}
        movementPreview={movementPreview}
      >
        {null}
      </TacticalMovementControls>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: confirmTacticalMove.type,
        payload: expect.objectContaining({
          moraleDice: expect.any(Object),
          snapDice: expect.any(Object),
        }),
      }),
    );
  });
});
