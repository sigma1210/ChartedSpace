/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import type { TacticalScenarioTracingTemplate } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorTracingTemplateHud from "../TacticalEditorTracingTemplateHud";

const template: TacticalScenarioTracingTemplate = {
  imagePath: "/templates/deck.png",
  x: 2,
  y: 3,
  width: 10,
  height: 5,
  rotation: 0,
  opacity: 0.45,
  visible: true,
  lockAspectRatio: false,
};

const renderHud = (overrides: Partial<React.ComponentProps<
  typeof TacticalEditorTracingTemplateHud
>> = {}) => {
  const props: React.ComponentProps<typeof TacticalEditorTracingTemplateHud> = {
    layout: { visible: true, pinned: false, position: { x: 10, y: 10 } },
    onLayoutChange: jest.fn(),
    template,
    availableTemplates: [{
      id: "uploaded-deck",
      label: "Uploaded Deck",
      imagePath: "/templates/uploaded.png",
      source: "uploaded",
    }],
    busy: false,
    message: null,
    editing: false,
    onSelectTemplate: jest.fn(),
    onUploadTemplate: jest.fn(),
    onToggleEditing: jest.fn(),
    onResetFit: jest.fn(),
    onUpdateTemplate: jest.fn(),
    onUpdateTemplateNumber: jest.fn(),
    onRemoveTemplate: jest.fn(),
    ...overrides,
  };

  render(<PluginHudLayer><TacticalEditorTracingTemplateHud {...props} /></PluginHudLayer>);
  return props;
};

describe("TacticalEditorTracingTemplateHud", () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it("forwards template selection and upload", () => {
    const props = renderHud();

    fireEvent.change(screen.getByLabelText("Template image"), {
      target: { value: "/templates/uploaded.png" },
    });
    expect(props.onSelectTemplate).toHaveBeenCalledWith("/templates/uploaded.png");

    const file = new File(["image"], "deck.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload tracing template"), {
      target: { files: [file] },
    });
    expect(props.onUploadTemplate).toHaveBeenCalledWith(file);
  });

  it("forwards template adjustment controls", () => {
    const props = renderHud();

    fireEvent.click(screen.getByRole("button", { name: "Adjust on map" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to fit" }));
    fireEvent.change(screen.getByLabelText("Template width"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByLabelText("Lock template aspect ratio"));
    fireEvent.change(screen.getByLabelText("Template opacity"), {
      target: { value: "0.7" },
    });
    fireEvent.click(screen.getByLabelText("Show tracing template on map"));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(props.onToggleEditing).toHaveBeenCalledTimes(1);
    expect(props.onResetFit).toHaveBeenCalledTimes(1);
    expect(props.onUpdateTemplateNumber).toHaveBeenCalledWith("width", 20);
    expect(props.onUpdateTemplate).toHaveBeenCalledWith({ lockAspectRatio: true });
    expect(props.onUpdateTemplate).toHaveBeenCalledWith({ opacity: 0.7 });
    expect(props.onUpdateTemplate).toHaveBeenCalledWith({ visible: false });
    expect(props.onRemoveTemplate).toHaveBeenCalledTimes(1);
  });
});
