/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import { defaultTacticalInteractiveHumanCombatProfile } from "@/plugins/characterCombat/tacticalInteractiveHuman";
import type { TacticalConsoleOperation } from "@/plugins/characterCombat/tacticalConsoleVictory";
import TacticalEditorInteractionHud from "../TacticalEditorInteractionHud";

const selectedOperation: TacticalConsoleOperation = {
  id: "task-1",
  consolePlacementId: "console-1",
  label: "Open hatch",
  prerequisites: { mode: "all", operationIds: [] },
  checks: [{ id: "check-1", skill: "Security", difficulty: "average", apCost: 6 }],
  result: { type: "unlock", operationIds: [] },
};
const predecessor: TacticalConsoleOperation = {
  id: "task-2",
  consolePlacementId: "console-2",
  label: "Restore power",
  prerequisites: { mode: "all", operationIds: [] },
  checks: [{ id: "check-2", skill: "Electronics", difficulty: "routine", apCost: 4 }],
  result: { type: "unlock", operationIds: [] },
};

const renderHud = (overrides: Partial<ComponentProps<typeof TacticalEditorInteractionHud>> = {}) => {
  const props: ComponentProps<typeof TacticalEditorInteractionHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    placement: {
      id: "console-1",
      terrainDefinitionId: "console-1x1",
      origin: { x: 4, y: 5 },
      rotation: 0,
      objectSettings: { terminal: { label: "Bridge Console", terminalKind: "navigation", operational: true } },
    },
    interactiveHuman: false,
    humanCombatProfile: defaultTacticalInteractiveHumanCombatProfile,
    operations: [selectedOperation],
    allOperations: [selectedOperation, predecessor],
    selectedOperation,
    selectedOperationId: selectedOperation.id,
    victoryTaskRequired: false,
    onUpdateTerminal: jest.fn(),
    onUpdateHumanCombatProfile: jest.fn(),
    onAddOperation: jest.fn(),
    onSelectOperation: jest.fn(),
    onUpdateOperation: jest.fn(),
    onChangeOperationResult: jest.fn(),
    onTogglePrerequisite: jest.fn(),
    onToggleUnlockedOperation: jest.fn(),
    onDeleteOperation: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorInteractionHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorInteractionHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("forwards console, task, and task-link actions", () => {
    const props = renderHud();

    fireEvent.change(screen.getByLabelText("Console name"), { target: { value: "Security" } });
    fireEvent.change(screen.getByLabelText("Console type"), { target: { value: "security" } });
    fireEvent.click(screen.getByLabelText("Operational"));
    fireEvent.click(screen.getByRole("button", { name: "Add operation" }));
    fireEvent.click(screen.getByRole("button", { name: "Open hatch" }));
    fireEvent.change(screen.getByLabelText("When all checks succeed"), { target: { value: "victory" } });
    fireEvent.click(screen.getByLabelText("Prerequisite Restore power"));
    fireEvent.click(screen.getByLabelText("Unlock Restore power"));

    expect(props.onUpdateTerminal).toHaveBeenCalledWith({ label: "Security" });
    expect(props.onUpdateTerminal).toHaveBeenCalledWith({ terminalKind: "security" });
    expect(props.onUpdateTerminal).toHaveBeenCalledWith({ operational: false });
    expect(props.onAddOperation).toHaveBeenCalledTimes(1);
    expect(props.onSelectOperation).toHaveBeenCalledWith("task-1");
    expect(props.onChangeOperationResult).toHaveBeenCalledWith("task-1", "victory");
    expect(props.onTogglePrerequisite).toHaveBeenCalledWith("task-1", "task-2", true);
    expect(props.onToggleUnlockedOperation).toHaveBeenCalledWith("task-1", "task-2", true);
  });

  it("forwards interactive-human profile and transformation actions", () => {
    const humanOperation = { ...selectedOperation, consolePlacementId: "human-1" };
    let updatedOperation: TacticalConsoleOperation | null = null;
    const onUpdateOperation = jest.fn((
      _id: string,
      update: (operation: TacticalConsoleOperation) => TacticalConsoleOperation,
    ) => {
      updatedOperation = update(humanOperation);
    });
    const props = renderHud({
      placement: {
        id: "human-1",
        terrainDefinitionId: "interactive-human",
        origin: { x: 2, y: 3 },
        rotation: 90,
        objectSettings: { terminal: { label: "Dockmaster", facing: 0, operational: true } },
      },
      interactiveHuman: true,
      operations: [humanOperation],
      allOperations: [humanOperation],
      selectedOperation: humanOperation,
      selectedOperationId: humanOperation.id,
      onUpdateOperation,
    });

    fireEvent.click(screen.getByRole("button", { name: "Rotate interactive human 90 degrees" }));
    fireEvent.change(screen.getByLabelText("Weapon skill"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Success becomes"), { target: { value: "enemy" } });

    expect(props.onUpdateTerminal).toHaveBeenCalledWith({ facing: 90 });
    expect(props.onUpdateHumanCombatProfile).toHaveBeenCalledWith({ weaponSkill: 2 });
    expect(onUpdateOperation).toHaveBeenCalledWith("task-1", expect.any(Function));
    expect((updatedOperation as TacticalConsoleOperation | null)?.successTransformation)
      .toBe("enemy");
  });
});
