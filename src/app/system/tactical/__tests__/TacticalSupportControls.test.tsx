/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  confirmTacticalTreatment,
  previewTacticalExtinguishFire,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { activeTacticalTerrainObjects } from "@/plugins/characterCombat/tacticalTerrain";
import { TacticalSupportControls } from "../TacticalSupportControls";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

describe("TacticalSupportControls", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const supportState = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 6;
    return { tacticalMap, activeCombatant };
  };

  it("dispatches selection of an adjacent fire for extinguishing", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const fire = {
      x: activeCombatant.position.x + 1,
      y: activeCombatant.position.y,
    };
    tacticalMap.scenario.fireCells = [fire];

    render(
      <TacticalSupportControls
        section="recovery"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: `Extinguish Fire ${fire.x}, ${fire.y} · 3 AP`,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: previewTacticalExtinguishFire.type,
        payload: fire,
      }),
    );
  });

  it("dispatches confirmation for a planned treatment", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const patient = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    patient.side = "player";
    patient.position = {
      x: activeCombatant.position.x + 1,
      y: activeCombatant.position.y,
    };
    patient.woundState = "light";
    patient.defeated = false;
    tacticalMap.plannedTreatmentTargetId = patient.id;

    render(
      <TacticalSupportControls
        section="recovery"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Confirm Treatment",
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: confirmTacticalTreatment.type }),
    );
  });

  it("renders the selected structural terrain interaction", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const wall = activeTacticalTerrainObjects(
      tacticalMap.scenario,
      tacticalMap.doorOpenById,
      tacticalMap.destroyedTerrainObjectIds,
    ).find((object) => object.kind === "wall")!;
    tacticalMap.selectedTerrainObjectId = wall.id;

    render(
      <TacticalSupportControls
        section="terrain"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    expect(screen.getByText("Interaction")).toBeTruthy();
    expect(screen.getByText("Wall segment")).toBeTruthy();
    expect(screen.getByText(/Integrity damage/)).toBeTruthy();
  });
});
