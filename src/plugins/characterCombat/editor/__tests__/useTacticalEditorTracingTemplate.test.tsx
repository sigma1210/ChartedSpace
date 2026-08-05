/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import type { TacticalScenarioTracingTemplate } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { editorDraftChanged } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import type { TracingTemplateTransformDrag } from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import { createAppStore, type AppStore } from "@/store";
import { uploadTacticalTemplate } from "../tacticalEditorApi";
import { loadImageDimensions } from "../tacticalEditorSupport";
import { useTacticalEditorTracingTemplate } from "../useTacticalEditorTracingTemplate";

jest.mock("../tacticalEditorApi", () => ({
  uploadTacticalTemplate: jest.fn(),
}));
jest.mock("../tacticalEditorSupport", () => ({
  ...jest.requireActual("../tacticalEditorSupport"),
  loadImageDimensions: jest.fn(),
}));

const uploadTemplateMock = jest.mocked(uploadTacticalTemplate);
const loadImageDimensionsMock = jest.mocked(loadImageDimensions);

const template = (): TacticalScenarioTracingTemplate => ({
  imagePath: "/templates/deck.png",
  x: 2,
  y: 3,
  width: 10,
  height: 5,
  rotation: 0,
  opacity: 0.45,
  visible: true,
  lockAspectRatio: false,
});

const storeWithTemplate = () => {
  const store = createAppStore();
  const draft = store.getState().tacticalEditor.document.draft;
  store.dispatch(editorDraftChanged({ ...draft, tracingTemplate: template() }));
  return store;
};

const renderTracingTemplate = (store: AppStore, initialEditing = false) => {
  const clearDrawingTool = jest.fn();
  const clearEnemyTool = jest.fn();
  const clearWallDraft = jest.fn();
  const clearPlacementHover = jest.fn();
  const clearEnemyHover = jest.fn();
  const hook = renderHook(() => {
    const [dragTracingTemplate, setDragTracingTemplate] = useState<
      TracingTemplateTransformDrag | null
    >(null);
    const [tracingTemplateEditing, setTracingTemplateEditing] = useState(initialEditing);
    const [placementError, setPlacementError] = useState<string | null>("Old warning.");
    const commands = useTacticalEditorTracingTemplate({
      dragTracingTemplate,
      setDragTracingTemplate,
      tracingTemplateEditing,
      setTracingTemplateEditing,
      setPlacementError,
      clearDrawingTool,
      clearEnemyTool,
      clearWallDraft,
      clearPlacementHover,
      clearEnemyHover,
    });
    return {
      ...commands,
      dragTracingTemplate,
      tracingTemplateEditing,
      placementError,
    };
  }, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
  return {
    ...hook,
    clearDrawingTool,
    clearEnemyTool,
    clearWallDraft,
    clearPlacementHover,
    clearEnemyHover,
  };
};

describe("useTacticalEditorTracingTemplate", () => {
  beforeEach(() => {
    uploadTemplateMock.mockReset();
    loadImageDimensionsMock.mockReset();
  });

  it("loads and fits a selected tracing template", async () => {
    const store = createAppStore();
    loadImageDimensionsMock.mockResolvedValue({ width: 144, height: 48 });
    const { result } = renderTracingTemplate(store);

    await act(async () => result.current.selectTracingTemplate("/templates/selected.png"));

    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      imagePath: "/templates/selected.png",
      x: 0,
      y: 12,
      width: 72,
      height: 24,
    });
    expect(store.getState().tacticalEditor.templates.message?.text).toBe(
      "Tracing template fitted to the map.",
    );
  });

  it("uploads, indexes, and fits a tracing template", async () => {
    const store = createAppStore();
    const asset = {
      id: "uploaded-deck",
      label: "Uploaded Deck",
      imagePath: "/templates/uploaded.png",
      source: "uploaded" as const,
    };
    uploadTemplateMock.mockResolvedValue(asset);
    loadImageDimensionsMock.mockResolvedValue({ width: 72, height: 48 });
    const { result } = renderTracingTemplate(store);
    const file = new File(["image"], "deck.png", { type: "image/png" });

    await act(async () => result.current.uploadTracingTemplate(file));

    expect(uploadTemplateMock).toHaveBeenCalledWith(file);
    expect(store.getState().tacticalEditor.templates.assets).toContainEqual(asset);
    expect(store.getState().tacticalEditor.document.draft.tracingTemplate?.imagePath)
      .toBe(asset.imagePath);
  });

  it("resets the current template to its fitted dimensions", async () => {
    const store = storeWithTemplate();
    loadImageDimensionsMock.mockResolvedValue({ width: 144, height: 48 });
    const { result } = renderTracingTemplate(store);

    await act(async () => result.current.resetTracingTemplateFit());

    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      imagePath: "/templates/deck.png",
      x: 0,
      y: 12,
      width: 72,
      height: 24,
      rotation: 0,
    });
  });

  it("updates numeric dimensions while preserving a locked aspect ratio", () => {
    const store = storeWithTemplate();
    const draft = store.getState().tacticalEditor.document.draft;
    store.dispatch(editorDraftChanged({
      ...draft,
      tracingTemplate: { ...draft.tracingTemplate!, lockAspectRatio: true },
    }));
    const { result } = renderTracingTemplate(store);

    act(() => result.current.updateTracingTemplateNumber("width", 20));

    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      width: 20,
      height: 10,
    });
  });

  it("moves a template and can cancel back to its original transform", () => {
    const store = storeWithTemplate();
    const { result } = renderTracingTemplate(store);

    act(() => result.current.beginTracingTemplateDrag("move", { x: 1, y: 1 }));
    expect(result.current.placementError).toBeNull();
    act(() => result.current.transformTracingTemplate({ x: 4, y: 5 }));
    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      x: 5,
      y: 7,
    });

    act(() => result.current.cancelTracingTemplateDrag());
    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      x: 2,
      y: 3,
    });
    expect(result.current.dragTracingTemplate).toBeNull();
  });

  it("resizes and rotates a template using the drag controls", () => {
    const store = storeWithTemplate();
    const { result } = renderTracingTemplate(store);

    act(() => result.current.beginTracingTemplateDrag("se", { x: 12, y: 8 }));
    act(() => result.current.transformTracingTemplate({ x: 17, y: 11 }));
    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      x: 2,
      y: 3,
      width: 15,
      height: 8,
    });
    act(() => result.current.finishTracingTemplateDrag());

    act(() => result.current.beginTracingTemplateDrag("rotate", { x: 10.5, y: 7 }));
    act(() => result.current.transformTracingTemplate({ x: 9.5, y: 8 }));
    expect(store.getState().tacticalEditor.document.draft.tracingTemplate?.rotation)
      .toBeCloseTo(90);
  });

  it("toggles editing and clears conflicting tools and transient drafts", () => {
    const store = storeWithTemplate();
    const {
      result,
      clearDrawingTool,
      clearEnemyTool,
      clearWallDraft,
      clearPlacementHover,
      clearEnemyHover,
    } = renderTracingTemplate(store);

    act(() => result.current.toggleTracingTemplateEditing());

    expect(result.current.tracingTemplateEditing).toBe(true);
    expect(clearDrawingTool).toHaveBeenCalledTimes(1);
    expect(clearEnemyTool).toHaveBeenCalledTimes(1);
    expect(clearWallDraft).toHaveBeenCalledTimes(1);
    expect(clearPlacementHover).toHaveBeenCalledTimes(1);
    expect(clearEnemyHover).toHaveBeenCalledTimes(1);
  });

  it("stops editing when the HUD hides the template", () => {
    const store = storeWithTemplate();
    const { result } = renderTracingTemplate(store, true);

    act(() => result.current.updateTracingTemplateFromHud({ visible: false, opacity: 0.2 }));

    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toMatchObject({
      visible: false,
      opacity: 0.2,
    });
    expect(result.current.tracingTemplateEditing).toBe(false);
  });

  it("removes the template and stops editing", () => {
    const store = storeWithTemplate();
    const { result } = renderTracingTemplate(store, true);

    act(() => result.current.removeTracingTemplate());

    expect(store.getState().tacticalEditor.document.draft.tracingTemplate).toBeUndefined();
    expect(result.current.tracingTemplateEditing).toBe(false);
  });
});
