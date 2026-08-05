/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorNewScenarioDialog from "../TacticalEditorNewScenarioDialog";

const renderDialog = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorNewScenarioDialog
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorNewScenarioDialog> = {
    open: true,
    name: "Boarding Action",
    map: { width: 72, height: 48 },
    fileBusy: false,
    fileMessage: null,
    onNameChange: jest.fn(),
    onCreate: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorNewScenarioDialog {...props} />) };
};

describe("TacticalEditorNewScenarioDialog", () => {
  it("forwards scenario name changes", () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByLabelText("New scenario name"), {
      target: { value: "Rescue Mission" },
    });

    expect(props.onNameChange).toHaveBeenCalledWith("Rescue Mission");
  });

  it("creates a valid scenario with Enter or the Create button", () => {
    const { props } = renderDialog();
    const name = screen.getByLabelText("New scenario name");

    fireEvent.keyDown(name, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(props.onCreate).toHaveBeenCalledTimes(2);
  });

  it.each([
    { name: "   ", map: { width: 72, height: 48 } },
    { name: "Boarding", map: { width: 0, height: 48 } },
    { name: "Boarding", map: { width: 72, height: 0 } },
  ])("disables creation for an invalid name or map", ({ name, map }) => {
    const { props } = renderDialog({ name, map });
    const create = screen.getByRole("button", { name: "Create" }) as HTMLButtonElement;

    fireEvent.keyDown(screen.getByLabelText("New scenario name"), { key: "Enter" });

    expect(create.disabled).toBe(true);
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it("displays file success and error messages", () => {
    const success = renderDialog({
      fileMessage: { kind: "success", text: "Scenario created." },
    });
    expect(screen.getByRole("status").textContent).toContain("Scenario created.");
    success.unmount();

    renderDialog({ fileMessage: { kind: "error", text: "Scenario already exists." } });
    expect(screen.getByRole("alert").textContent).toContain("Scenario already exists.");
  });

  it("closes with Escape or a backdrop press", () => {
    const first = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "New Scenario" }), { key: "Escape" });
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderDialog();
    fireEvent.pointerDown(second.container.firstElementChild!);
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });

  it("prevents creation and closing while a file operation is busy", () => {
    const { props, container } = renderDialog({ fileBusy: true });

    fireEvent.keyDown(screen.getByRole("dialog", { name: "New Scenario" }), { key: "Escape" });
    fireEvent.pointerDown(container.firstElementChild!);
    fireEvent.keyDown(screen.getByLabelText("New scenario name"), { key: "Enter" });

    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onCreate).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Creating…" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
