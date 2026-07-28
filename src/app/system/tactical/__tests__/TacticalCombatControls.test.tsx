/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  beginTacticalGrenadeTargeting,
  previewTacticalMelee,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalCombatControls } from "../TacticalCombatControls";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

describe("TacticalCombatControls", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const combatants = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    const target = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 6;
    tacticalMap.ammunitionByCharacterId[activeCombatant.id] = 12;
    return { tacticalMap, activeCombatant, target };
  };

  it("keeps interstitial recovery controls between ordnance and weapon controls", () => {
    const { tacticalMap, activeCombatant, target } = combatants();

    render(
      <TacticalCombatControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        rangedTargets={[target]}
        meleeTargets={[]}
      >
        <div>Recovery controls</div>
      </TacticalCombatControls>,
    );

    const ordnance = screen.getByRole("button", {
      name: /Throw Fragmentation Grenade/,
    });
    const recovery = screen.getByText("Recovery controls");
    const attack = screen.getByText("Attack");

    expect(ordnance.compareDocumentPosition(recovery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recovery.compareDocumentPosition(attack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("dispatches fragmentation grenade targeting", () => {
    const { tacticalMap, activeCombatant } = combatants();
    render(
      <TacticalCombatControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        rangedTargets={[]}
        meleeTargets={[]}
      >
        {null}
      </TacticalCombatControls>,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Throw Fragmentation Grenade/,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: beginTacticalGrenadeTargeting.type }),
    );
  });

  it("dispatches melee targeting for an adjacent enemy", () => {
    const { tacticalMap, activeCombatant, target } = combatants();
    render(
      <TacticalCombatControls
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
        rangedTargets={[]}
        meleeTargets={[target]}
      >
        {null}
      </TacticalCombatControls>,
    );

    fireEvent.click(screen.getByRole("button", {
      name: `Melee ${target.name}`,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: previewTacticalMelee.type,
        payload: target.id,
      }),
    );
  });
});
