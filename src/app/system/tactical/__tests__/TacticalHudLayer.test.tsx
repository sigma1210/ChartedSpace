/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  updateTacticalActionHud,
  updateTacticalCharacterHud,
  updateTacticalCharacterInformationHud,
  updateTacticalDeploymentHud,
  updateTacticalEnemyHud,
  updateTacticalEventsHud,
  updateTacticalScenarioHud,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalHudLayer } from "../TacticalHudLayer";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/PluginHudLayer", () => ({
  PluginHudLayer: ({
    children,
    hiddenHuds,
    onRestoreHud,
  }: {
    children: ReactNode;
    hiddenHuds: Array<{ id: string; title: string }>;
    onRestoreHud: (id: string) => void;
  }) => (
    <div>
      {children}
      {hiddenHuds.map((hud) => (
        <button key={hud.id} type="button" onClick={() => onRestoreHud(hud.id)}>
          Restore {hud.title}
        </button>
      ))}
    </div>
  ),
}));

describe("TacticalHudLayer", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const hiddenActiveMap = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    tacticalMap.characterHudLayout.visible = false;
    tacticalMap.enemyHudLayout.visible = false;
    tacticalMap.actionHudLayout.visible = false;
    tacticalMap.characterInformationHudLayout.visible = false;
    tacticalMap.eventsHudLayout.visible = false;
    const scenarioHudLayout = {
      visible: false,
      pinned: true,
      position: { x: 70, y: 80 },
    };
    const deploymentHudLayout = {
      visible: false,
      pinned: true,
      position: { x: 90, y: 100 },
    };
    return { tacticalMap, scenarioHudLayout, deploymentHudLayout };
  };

  it.each([
    ["Characters", updateTacticalCharacterHud.type],
    ["Enemies", updateTacticalEnemyHud.type],
    ["Current Action", updateTacticalActionHud.type],
    ["Selected Character", updateTacticalCharacterInformationHud.type],
    ["Events", updateTacticalEventsHud.type],
    ["Scenario", updateTacticalScenarioHud.type],
  ])("restores the %s HUD with its saved layout", (title, actionType) => {
    const { tacticalMap, scenarioHudLayout, deploymentHudLayout } = hiddenActiveMap();
    render(
      <TacticalHudLayer
        tacticalMap={tacticalMap}
        scenarioHudLayout={scenarioHudLayout}
        deploymentHudLayout={deploymentHudLayout}
      >
        <div>HUD content</div>
      </TacticalHudLayer>,
    );

    fireEvent.click(screen.getByRole("button", { name: `Restore ${title}` }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: actionType,
        payload: expect.objectContaining({ visible: true }),
      }),
    );
  });

  it("registers Deployment instead of Current Action during setup", () => {
    const { tacticalMap, scenarioHudLayout, deploymentHudLayout } = hiddenActiveMap();
    tacticalMap.scenarioStatus = "setup";

    render(
      <TacticalHudLayer
        tacticalMap={tacticalMap}
        scenarioHudLayout={scenarioHudLayout}
        deploymentHudLayout={deploymentHudLayout}
      >
        <div>HUD content</div>
      </TacticalHudLayer>,
    );

    expect(screen.queryByRole("button", { name: "Restore Current Action" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Restore Crew Deployment" }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: updateTacticalDeploymentHud.type,
      payload: { ...deploymentHudLayout, visible: true },
    });
  });

  it("renders its composed tactical HUD children", () => {
    const { tacticalMap, scenarioHudLayout, deploymentHudLayout } = hiddenActiveMap();
    render(
      <TacticalHudLayer
        tacticalMap={tacticalMap}
        scenarioHudLayout={scenarioHudLayout}
        deploymentHudLayout={deploymentHudLayout}
      >
        <div>HUD content</div>
      </TacticalHudLayer>,
    );

    expect(screen.getByText("HUD content")).toBeTruthy();
  });
});
