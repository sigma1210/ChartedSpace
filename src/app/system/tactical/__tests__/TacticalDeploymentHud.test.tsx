/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  equipTacticalDeploymentItem,
  selectTacticalLightingPreset,
  startTacticalScenario,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import type { ShipLockerItem } from "@/plugins/ship";
import {
  TacticalDeploymentControls,
  TacticalDeploymentHud,
} from "../TacticalDeploymentHud";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({ children, title }: { children: ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
}));

const lockerItem = (
  id: string,
  kind: ShipLockerItem["kind"],
  name: string,
): ShipLockerItem => ({
  id,
  kind,
  name,
  catalogItemId: `catalog-${id}`,
  purchasePrice: 100,
  purchasedAtTurn: 1,
  purchasedAtLocation: "Test",
  purchaserCrewId: "crew-1",
  acquiredAt: "2026-01-01T00:00:00.000Z",
});

describe("TacticalDeploymentHud", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("keeps scenario start disabled until every living crew member is deployed", () => {
    const tacticalMap = freshTacticalMap(["crew-1"], undefined, { setup: true });
    const { rerender } = render(
      <TacticalDeploymentControls tacticalMap={tacticalMap} />,
    );

    expect(
      (screen.getByRole("button", { name: "Start Scenario" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    tacticalMap.deployedCharacterIds = tacticalMap.scenario.combatants
      .filter((unit) => unit.side === "player" && !unit.defeated)
      .map((unit) => unit.id);
    rerender(<TacticalDeploymentControls tacticalMap={tacticalMap} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Scenario" }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: startTacticalScenario.type }),
    );
  });

  it("dispatches the selected starting illumination", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    render(<TacticalDeploymentControls tacticalMap={tacticalMap} />);

    fireEvent.click(screen.getByRole("button", { name: /Exterior illuminated/ }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: selectTacticalLightingPreset.type,
        payload: "exterior-lit",
      }),
    );
  });

  it("dispatches an available locker item for the selected crew member", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    const weapon = lockerItem("weapon-1", "weapon", "Test Carbine");

    render(
      <TacticalDeploymentHud
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        lockerItems={[weapon]}
        layout={{ visible: true, pinned: false, position: { x: 0, y: 0 } }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: weapon.name }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: equipTacticalDeploymentItem.type,
        payload: {
          characterId: activeCombatant.id,
          lockerItemId: weapon.id,
          catalogItemId: weapon.catalogItemId,
        },
      }),
    );
  });
});
