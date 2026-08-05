/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorIssuesMenu from "../TacticalEditorIssuesMenu";

describe("TacticalEditorIssuesMenu", () => {
  it("renders nothing when there are no issues", () => {
    const { container } = render(<TacticalEditorIssuesMenu issues={[]} />);

    expect(container.childElementCount).toBe(0);
  });

  it("shows a warning count and opens the warning details", () => {
    render(<TacticalEditorIssuesMenu issues={[
      { severity: "warning", message: "Placement warning." },
    ]} />);

    const trigger = screen.getByRole("button", { name: "Open editor issues" });
    expect(trigger.textContent).toContain("1 Issue");
    expect(trigger.className).toContain("border-amber-500");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Editor issues" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Placement warning.");
  });

  it("uses error styling and exposes errors as alerts", () => {
    render(<TacticalEditorIssuesMenu issues={[
      { severity: "error", message: "Draft cannot be resolved." },
      { severity: "warning", message: "Placement warning." },
    ]} />);

    const trigger = screen.getByRole("button", { name: "Open editor issues" });
    expect(trigger.textContent).toContain("2 Issues");
    expect(trigger.className).toContain("border-red-500");
    fireEvent.click(trigger);

    expect(screen.getByRole("alert").textContent).toContain("Draft cannot be resolved.");
  });

  it("closes the issue details", () => {
    render(<TacticalEditorIssuesMenu issues={[
      { severity: "warning", message: "Placement warning." },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open editor issues" }));
    expect(screen.getByRole("dialog", { name: "Editor issues" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close editor issues" }));

    expect(screen.queryByRole("dialog", { name: "Editor issues" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open editor issues" })
      .getAttribute("aria-expanded")).toBe("false");
  });
});
