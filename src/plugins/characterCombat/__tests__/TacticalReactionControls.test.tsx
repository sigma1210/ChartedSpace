/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  resolveTacticalAdjacencyReaction,
  resolveTacticalCoveringFireSnap,
  runTacticalEnemyPhase,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalReactionControls } from "../TacticalReactionControls";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

describe("TacticalReactionControls", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const adjacencyMap = () => {
    const map = freshTacticalMap(["crew-1"]);
    const defender = map.scenario.combatants.find((unit) => unit.side === "player")!;
    const mover = map.scenario.combatants.find((unit) => unit.side === "enemy")!;
    map.pendingAdjacencyReaction = {
      moverId: mover.id,
      defenderIds: [defender.id],
    };
    return { map, defender, mover };
  };

  it("dispatches defensive fire and resumes the enemy phase", () => {
    const { map, defender } = adjacencyMap();
    render(
      <TacticalReactionControls
        tacticalMap={map}
        activeCombatant={defender}
        rangedTargets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fire · 3 AP" }));

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch.mock.calls[0]![0]).toMatchObject({
      type: resolveTacticalAdjacencyReaction.type,
      payload: { fire: true },
    });
    expect(mockDispatch.mock.calls[1]![0]).toMatchObject({
      type: runTacticalEnemyPhase.type,
    });
  });

  it("dispatches a declined defensive shot and still resumes the enemy phase", () => {
    const { map, defender } = adjacencyMap();
    render(
      <TacticalReactionControls
        tacticalMap={map}
        activeCombatant={defender}
        rangedTargets={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch.mock.calls[0]![0]).toMatchObject({
      type: resolveTacticalAdjacencyReaction.type,
      payload: { fire: false },
    });
    expect(mockDispatch.mock.calls[1]![0]).toMatchObject({
      type: runTacticalEnemyPhase.type,
    });
  });

  it("dispatches a retained covering-fire snap against the selected target", () => {
    const map = freshTacticalMap(["crew-1"]);
    const shooter = map.scenario.combatants.find((unit) => unit.side === "player")!;
    const target = map.scenario.combatants.find((unit) => unit.side === "enemy")!;
    map.pendingCoveringFireSnapIds = [shooter.id];

    render(
      <TacticalReactionControls
        tacticalMap={map}
        activeCombatant={shooter}
        rangedTargets={[target]}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: `Snap Shot ${target.name} · 3 AP · 1 ammo`,
    }));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0]![0]).toMatchObject({
      type: resolveTacticalCoveringFireSnap.type,
      payload: {
        fire: true,
        targetId: target.id,
      },
    });
  });
});
