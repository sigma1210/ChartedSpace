/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorHeader from "../TacticalEditorHeader";

const renderHeader = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorHeader
>> = {}) => render(<TacticalEditorHeader
  currentScenario={{ id: "default", title: "Default Scenario", isDefault: true }}
  fileMessage={null}
  fileDialogOpen={false}
  issues={[]}
  dirty={false}
  {...overrides}
>
  <button type="button">Menu child</button>
</TacticalEditorHeader>);

describe("TacticalEditorHeader", () => {
  it("labels the immutable default scenario and renders menu children", () => {
    renderHeader();

    expect(screen.getByText(/Default Scenario · immutable source · editable draft/)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Scenario editor menu bar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Menu child" })).toBeTruthy();
  });

  it("labels a saved scenario", () => {
    renderHeader({
      currentScenario: { id: "boarding", title: "Boarding Action", isDefault: false },
    });

    expect(screen.getByText(/Boarding Action · saved scenario · editable draft/)).toBeTruthy();
  });

  it("displays success and error file messages when no dialog is open", () => {
    const success = renderHeader({
      fileMessage: { kind: "success", text: "Scenario saved." },
    });
    expect(screen.getByRole("status").textContent).toContain("Scenario saved.");
    success.unmount();

    renderHeader({ fileMessage: { kind: "error", text: "Save failed." } });
    expect(screen.getByRole("alert").textContent).toContain("Save failed.");
  });

  it("suppresses the file message while a file dialog is open", () => {
    renderHeader({
      fileMessage: { kind: "error", text: "Dialog error." },
      fileDialogOpen: true,
    });

    expect(screen.queryByText("Dialog error.")).toBeNull();
  });

  it("forwards editor issues to the issues control", () => {
    renderHeader({ issues: [{ severity: "warning", message: "Placement warning." }] });

    const trigger = screen.getByRole("button", { name: "Open editor issues" });
    expect(trigger.textContent).toContain("1 Issue");
    fireEvent.click(trigger);
    expect(screen.getByRole("status").textContent).toContain("Placement warning.");
  });

  it("shows whether the draft has unsaved changes", () => {
    const unchanged = renderHeader();
    expect(screen.getByText("Unchanged")).toBeTruthy();
    unchanged.unmount();

    renderHeader({ dirty: true });
    expect(screen.getByText("Unsaved draft")).toBeTruthy();
  });
});
