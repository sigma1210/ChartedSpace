/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorOpenScenarioDialog from "../TacticalEditorOpenScenarioDialog";

const scenarios = [
  { id: "default", title: "Default Scenario", isDefault: true },
  { id: "boarding", title: "Boarding Action", isDefault: false },
];

const renderDialog = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorOpenScenarioDialog
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorOpenScenarioDialog> = {
    open: true,
    fileBusy: false,
    scenarioListBusy: false,
    fileMessage: null,
    currentScenarioId: "default",
    availableScenarios: scenarios,
    filteredScenarios: scenarios,
    searchQuery: "",
    selectedScenarioId: "default",
    onClose: jest.fn(),
    onSearchChange: jest.fn(),
    onSelectScenario: jest.fn(),
    onLoadScenario: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorOpenScenarioDialog {...props} />) };
};

describe("TacticalEditorOpenScenarioDialog", () => {
  it("changes and clears the scenario search", () => {
    const { props } = renderDialog({ searchQuery: "board" });

    fireEvent.change(screen.getByLabelText("Search scenarios"), {
      target: { value: "boarding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear scenario search" }));

    expect(props.onSearchChange).toHaveBeenNthCalledWith(1, "boarding");
    expect(props.onSearchChange).toHaveBeenNthCalledWith(2, "");
  });

  it("selects and double-clicks scenarios from the list", () => {
    const { props } = renderDialog();
    const boarding = screen.getByRole("option", { name: "Boarding Action · boarding" });

    fireEvent.click(boarding);
    fireEvent.doubleClick(boarding);

    expect(props.onSelectScenario).toHaveBeenCalledWith("boarding");
    expect(props.onLoadScenario).toHaveBeenCalledWith("boarding");
  });

  it("navigates filtered scenarios with the arrow keys", () => {
    const { props } = renderDialog({ selectedScenarioId: "default" });
    const search = screen.getByLabelText("Search scenarios");

    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "ArrowUp" });

    expect(props.onSelectScenario).toHaveBeenNthCalledWith(1, "boarding");
    expect(props.onSelectScenario).toHaveBeenNthCalledWith(2, "default");
  });

  it("loads the selected filtered scenario with Enter", () => {
    const { props } = renderDialog({ selectedScenarioId: "boarding" });

    fireEvent.keyDown(screen.getByLabelText("Search scenarios"), { key: "Enter" });

    expect(props.onLoadScenario).toHaveBeenCalledWith();
  });

  it("closes with Escape or a backdrop press", () => {
    const first = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Open Scenario" }), { key: "Escape" });
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderDialog();
    fireEvent.pointerDown(second.container.firstElementChild!);
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });

  it("prevents closing and loading controls while a file operation is busy", () => {
    const { props, container } = renderDialog({ fileBusy: true });

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Open Scenario" }), { key: "Escape" });
    fireEvent.pointerDown(container.firstElementChild!);

    expect(props.onClose).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Close Open Scenario" }) as HTMLButtonElement).disabled)
      .toBe(true);
    expect((screen.getByRole("button", { name: "Opening…" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
