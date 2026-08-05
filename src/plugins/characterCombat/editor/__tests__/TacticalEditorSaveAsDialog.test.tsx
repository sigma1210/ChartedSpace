/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorSaveAsDialog from "../TacticalEditorSaveAsDialog";

const renderDialog = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorSaveAsDialog
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorSaveAsDialog> = {
    open: true,
    name: "Boarding Action Copy",
    fileBusy: false,
    draftBlocked: false,
    fileMessage: null,
    onNameChange: jest.fn(),
    onSave: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorSaveAsDialog {...props} />) };
};

describe("TacticalEditorSaveAsDialog", () => {
  it("forwards scenario name changes", () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByLabelText("New scenario name"), {
      target: { value: "Rescue Mission Copy" },
    });

    expect(props.onNameChange).toHaveBeenCalledWith("Rescue Mission Copy");
  });

  it("saves a valid draft with Enter or the Save As button", () => {
    const { props } = renderDialog();

    fireEvent.keyDown(screen.getByLabelText("New scenario name"), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Save As" }));

    expect(props.onSave).toHaveBeenCalledTimes(2);
  });

  it.each([
    { name: "   ", draftBlocked: false },
    { name: "Boarding Copy", draftBlocked: true },
  ])("disables saving for a blank name or blocked draft", ({ name, draftBlocked }) => {
    const { props } = renderDialog({ name, draftBlocked });
    const save = screen.getByRole("button", { name: "Save As" }) as HTMLButtonElement;

    fireEvent.keyDown(screen.getByLabelText("New scenario name"), { key: "Enter" });

    expect(save.disabled).toBe(true);
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("displays file success and error messages", () => {
    const success = renderDialog({
      fileMessage: { kind: "success", text: "Scenario saved." },
    });
    expect(screen.getByRole("status").textContent).toContain("Scenario saved.");
    success.unmount();

    renderDialog({ fileMessage: { kind: "error", text: "Scenario already exists." } });
    expect(screen.getByRole("alert").textContent).toContain("Scenario already exists.");
  });

  it("closes with Escape or a backdrop press", () => {
    const first = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Save Scenario As" }), {
      key: "Escape",
    });
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderDialog();
    fireEvent.pointerDown(second.container.firstElementChild!);
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });

  it("prevents saving and closing while a file operation is busy", () => {
    const { props, container } = renderDialog({ fileBusy: true });

    fireEvent.keyDown(screen.getByRole("dialog", { name: "Save Scenario As" }), {
      key: "Escape",
    });
    fireEvent.pointerDown(container.firstElementChild!);
    fireEvent.keyDown(screen.getByLabelText("New scenario name"), { key: "Enter" });

    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Saving…" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
