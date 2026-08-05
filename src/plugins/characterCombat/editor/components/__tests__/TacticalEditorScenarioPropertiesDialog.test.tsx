/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { TacticalEditorScenarioPropertiesDraft } from "../../redux/tacticalEditorSlice";
import TacticalEditorScenarioPropertiesDialog from "../TacticalEditorScenarioPropertiesDialog";

const draft: TacticalEditorScenarioPropertiesDraft = {
  title: "Boarding Action",
  briefing: "Board the target.",
  objective: "Secure the bridge.",
  deploymentEdges: ["south"],
};

const renderDialog = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorScenarioPropertiesDialog
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorScenarioPropertiesDialog> = {
    draft,
    error: null,
    onChange: jest.fn(),
    onApply: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorScenarioPropertiesDialog {...props} />) };
};

describe("TacticalEditorScenarioPropertiesDialog", () => {
  it("forwards changes to each text field", () => {
    const { props } = renderDialog();

    fireEvent.change(screen.getByLabelText("Scenario title"), {
      target: { value: "New title" },
    });
    fireEvent.change(screen.getByLabelText("Scenario briefing"), {
      target: { value: "New briefing" },
    });
    fireEvent.change(screen.getByLabelText("Scenario objective"), {
      target: { value: "New objective" },
    });

    expect(props.onChange).toHaveBeenNthCalledWith(1, { ...draft, title: "New title" });
    expect(props.onChange).toHaveBeenNthCalledWith(2, { ...draft, briefing: "New briefing" });
    expect(props.onChange).toHaveBeenNthCalledWith(3, { ...draft, objective: "New objective" });
  });

  it("adds and removes deployment edges", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Allow north deployment" }));
    fireEvent.click(screen.getByRole("button", { name: "Allow south deployment" }));

    expect(props.onChange).toHaveBeenNthCalledWith(1, {
      ...draft,
      deploymentEdges: ["south", "north"],
    });
    expect(props.onChange).toHaveBeenNthCalledWith(2, {
      ...draft,
      deploymentEdges: [],
    });
  });

  it("displays a property validation error", () => {
    renderDialog({ error: "A deployment zone is required." });

    expect(screen.getByRole("alert").textContent).toContain("A deployment zone is required.");
  });

  it("applies or cancels the staged properties", () => {
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(props.onApply).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape or a backdrop press", () => {
    const first = renderDialog();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Scenario Properties" }), {
      key: "Escape",
    });
    expect(first.props.onClose).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderDialog();
    fireEvent.pointerDown(second.container.firstElementChild!);
    expect(second.props.onClose).toHaveBeenCalledTimes(1);
  });
});
