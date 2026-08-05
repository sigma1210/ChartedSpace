/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorScenarioMenu from "../TacticalEditorScenarioMenu";

const renderMenu = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorScenarioMenu
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorScenarioMenu> = {
    open: true,
    draft: cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
    canBeginPlaytest: true,
    dirty: true,
    onToggle: jest.fn(),
    onClose: jest.fn(),
    onOpenProperties: jest.fn(),
    onBeginPlaytest: jest.fn(),
    onDiscardDraft: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<TacticalEditorScenarioMenu {...props} />) };
};

describe("TacticalEditorScenarioMenu", () => {
  it("forwards the Scenario menu toggle", () => {
    const { props } = renderMenu({ open: false });
    const trigger = screen.getByRole("button", { name: "Scenario menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(trigger);

    expect(props.onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu", { name: "Scenario" })).toBeNull();
  });

  it("stages the current scenario properties", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.title = "Boarding Action";
    draft.briefing = "Board the target.";
    draft.objective = "Secure the bridge.";
    draft.deploymentEdges = ["north", "west"];
    const { props } = renderMenu({ draft });

    fireEvent.click(screen.getByRole("menuitem", { name: "Scenario Properties…" }));

    expect(props.onOpenProperties).toHaveBeenCalledWith({
      title: "Boarding Action",
      briefing: "Board the target.",
      objective: "Secure the bridge.",
      deploymentEdges: ["north", "west"],
    });
  });

  it("uses the south edge when a legacy draft has no deployment edges", () => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.deploymentEdges = undefined;
    const { props } = renderMenu({ draft });

    fireEvent.click(screen.getByRole("menuitem", { name: "Scenario Properties…" }));

    expect(props.onOpenProperties).toHaveBeenCalledWith(expect.objectContaining({
      deploymentEdges: ["south"],
    }));
  });

  it("closes the menu before starting a playtest or discarding the draft", () => {
    const { props } = renderMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Playtest Draft" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Discard Draft Changes…" }));

    expect(props.onBeginPlaytest).toHaveBeenCalledTimes(1);
    expect(props.onDiscardDraft).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("disables playtesting when the draft cannot begin a playtest", () => {
    renderMenu({ canBeginPlaytest: false });

    expect((screen.getByRole("menuitem", { name: "Playtest Draft" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });

  it("disables discarding when the draft is unchanged", () => {
    renderMenu({ dirty: false });

    expect((screen.getByRole("menuitem", { name: "Discard Draft Changes…" }) as HTMLButtonElement).disabled)
      .toBe(true);
  });
});
