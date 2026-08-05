/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorFileMenu from "../TacticalEditorFileMenu";

const renderMenu = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorFileMenu
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorFileMenu> = {
    open: true,
    fileBusy: false,
    mapValid: true,
    currentScenarioIsDefault: false,
    dirty: true,
    draftBlocked: false,
    onToggle: jest.fn(),
    onClose: jest.fn(),
    onNewScenario: jest.fn(),
    onOpenScenario: jest.fn(),
    onSave: jest.fn(),
    onSaveAs: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorFileMenu {...props} />) };
};

describe("TacticalEditorFileMenu", () => {
  afterEach(() => jest.restoreAllMocks());

  it("forwards the File menu toggle", () => {
    const { props } = renderMenu({ open: false });
    const trigger = screen.getByRole("button", { name: "File menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    expect(props.onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "File" })).toBeNull();
  });

  it("forwards every file command", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const { props } = renderMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "New Scenario…" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Save As…" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Scenario…" }));

    expect(props.onNewScenario).toHaveBeenCalledTimes(1);
    expect(props.onOpenScenario).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSaveAs).toHaveBeenCalledTimes(1);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it("closes but cancels New Scenario when unsaved changes are not confirmed", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    const { props } = renderMenu({ dirty: true });

    fireEvent.click(screen.getByRole("menuitem", { name: "New Scenario…" }));

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onNewScenario).not.toHaveBeenCalled();
  });

  it.each([
    ["New Scenario…", { fileBusy: true }],
    ["New Scenario…", { mapValid: false }],
    ["Save", { fileBusy: true }],
    ["Save", { currentScenarioIsDefault: true }],
    ["Save", { dirty: false }],
    ["Save", { draftBlocked: true }],
    ["Save As…", { fileBusy: true }],
    ["Save As…", { draftBlocked: true }],
    ["Delete Scenario…", { fileBusy: true }],
    ["Delete Scenario…", { currentScenarioIsDefault: true }],
  ] as const)("disables %s for its guarded state", (name, overrides) => {
    renderMenu(overrides);

    expect((screen.getByRole("menuitem", { name }) as HTMLButtonElement).disabled).toBe(true);
  });
});
