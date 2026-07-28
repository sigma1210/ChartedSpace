/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { updateTacticalScenarioHud } from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import {
  DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT,
  TacticalScenarioHud,
} from "../TacticalScenarioHud";

const mockDispatch = jest.fn();
const mockMovedLayout = {
  visible: true,
  pinned: true,
  position: { x: 40, y: 50 },
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
        Move scenario
      </button>
    </div>
  ),
}));

jest.mock("../TacticalDeploymentHud", () => ({
  TacticalDeploymentControls: () => <div>Deployment controls</div>,
}));

describe("TacticalScenarioHud", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it("renders scenario identity, objective, status, and turn", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    render(
      <TacticalScenarioHud
        tacticalMap={tacticalMap}
        layout={DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT}
      />,
    );

    expect(screen.getByText(tacticalMap.scenario.title)).toBeTruthy();
    expect(screen.getByText(tacticalMap.scenario.briefing)).toBeTruthy();
    expect(screen.getByText(tacticalMap.scenario.objective)).toBeTruthy();
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText(`Turn ${tacticalMap.turn}`)).toBeTruthy();
  });

  it("includes deployment controls only during setup", () => {
    const tacticalMap = freshTacticalMap(["crew-1"], undefined, { setup: true });
    const { rerender } = render(
      <TacticalScenarioHud
        tacticalMap={tacticalMap}
        layout={DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT}
      />,
    );
    expect(screen.getByText("Deployment controls")).toBeTruthy();

    tacticalMap.scenarioStatus = "active";
    rerender(
      <TacticalScenarioHud
        tacticalMap={tacticalMap}
        layout={DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT}
      />,
    );
    expect(screen.queryByText("Deployment controls")).toBeNull();
  });

  it.each(["victory", "defeat"] as const)("renders the %s outcome status", (status) => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.scenarioStatus = status;
    render(
      <TacticalScenarioHud
        tacticalMap={tacticalMap}
        layout={DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT}
      />,
    );

    expect(screen.getByText(status)).toBeTruthy();
  });

  it("dispatches scenario layout changes", () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    render(
      <TacticalScenarioHud
        tacticalMap={tacticalMap}
        layout={DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Move scenario" }));
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: updateTacticalScenarioHud.type,
        payload: mockMovedLayout,
      }),
    );
  });
});
