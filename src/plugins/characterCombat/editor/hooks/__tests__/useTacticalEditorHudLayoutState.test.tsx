/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createAppStore } from "@/store";
import {
  editorHudLayoutChanged,
  editorHudLayoutsHydrated,
} from "../../redux/tacticalEditorSlice";
import {
  defaultTacticalEditorHudLayouts,
  type TacticalEditorHudId,
} from "../../lib/hudLayouts";
import { useTacticalEditorHudLayoutState } from "../useTacticalEditorHudLayoutState";

const renderHudLayouts = () => {
  const store = createAppStore();
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return {
    ...renderHook(() => useTacticalEditorHudLayoutState(), { wrapper }),
    store,
  };
};

describe("useTacticalEditorHudLayoutState", () => {
  it("returns all named default layouts and hydration readiness", () => {
    const { result } = renderHudLayouts();

    expect(result.current.hudLayoutsReady).toBe(false);
    expect(result.current.toolsLayout).toEqual(defaultTacticalEditorHudLayouts.tools);
    expect(result.current.layersLayout).toEqual(defaultTacticalEditorHudLayouts.layers);
    expect(result.current.circlePropertiesLayout)
      .toEqual(defaultTacticalEditorHudLayouts["circle-properties"]);
    expect(result.current.tracingTemplateLayout)
      .toEqual(defaultTacticalEditorHudLayouts["tracing-template"]);
  });

  it("accepts a direct layout update", () => {
    const { result } = renderHudLayouts();
    const layout = { visible: false, pinned: true, position: { x: 41, y: 52 } };

    act(() => result.current.setToolsLayout(layout));

    expect(result.current.toolsLayout).toEqual(layout);
  });

  it("accepts a functional layout update without changing other HUDs", () => {
    const { result } = renderHudLayouts();
    const originalLayers = result.current.layersLayout;

    act(() => result.current.setAreaPropertiesLayout((current) => ({
      ...current,
      visible: true,
      position: { x: current.position.x + 10, y: current.position.y + 20 },
    })));

    expect(result.current.areaPropertiesLayout).toEqual({
      ...defaultTacticalEditorHudLayouts["area-properties"],
      visible: true,
      position: {
        x: defaultTacticalEditorHudLayouts["area-properties"].position.x + 10,
        y: defaultTacticalEditorHudLayouts["area-properties"].position.y + 20,
      },
    });
    expect(result.current.layersLayout).toEqual(originalLayers);
  });

  it("routes persisted layout callbacks to their independent Redux entries", () => {
    const { result } = renderHudLayouts();
    const navigation = { visible: true, pinned: true, position: { x: 90, y: 12 } };
    const enemy = { visible: false, pinned: false, position: { x: 6, y: 8 } };

    act(() => result.current.persistNavigationLayout(navigation));
    act(() => result.current.persistEnemyEditorLayout(enemy));

    expect(result.current.navigationLayout).toEqual(navigation);
    expect(result.current.enemyEditorLayout).toEqual(enemy);
    expect(result.current.consoleEditorLayout)
      .toEqual(defaultTacticalEditorHudLayouts["console-editor"]);
  });

  it("shows the tracing-template HUD at its default position", () => {
    const { result } = renderHudLayouts();

    act(() => result.current.setTracingTemplateLayout({
      visible: false,
      pinned: true,
      position: { x: 1, y: 2 },
    }));
    act(() => result.current.showTracingTemplateHud());

    expect(result.current.tracingTemplateLayout).toEqual({
      visible: true,
      pinned: true,
      position: defaultTacticalEditorHudLayouts["tracing-template"].position,
    });
  });

  it("shows Layers without changing its pin or position", () => {
    const { result } = renderHudLayouts();
    const hidden = { visible: false, pinned: true, position: { x: 17, y: 29 } };

    act(() => result.current.setLayersLayout(hidden));
    act(() => result.current.showLayersHud());

    expect(result.current.layersLayout).toEqual({ ...hidden, visible: true });
  });

  it.each([
    ["tools", "tools"],
    ["layers", "layers"],
    ["enemy-palette", "enemy-palette"],
    ["area-properties", "area-properties"],
    ["object-properties", "object-properties"],
    ["circle-properties", "circle-properties"],
    ["legacy-circle-properties", "circle-properties"],
    ["console-editor", "console-editor"],
    ["enemy-editor", "enemy-editor"],
    ["tracing-template", "tracing-template"],
    ["navigation", "navigation"],
  ] as const)("restores the %s HUD without changing its pin or position", (restoreId, hudId) => {
    const { result, store } = renderHudLayouts();
    const hidden = { visible: false, pinned: true, position: { x: 31, y: 47 } };
    act(() => store.dispatch(editorHudLayoutChanged({
      id: hudId as TacticalEditorHudId,
      layout: hidden,
    })));

    act(() => result.current.restoreHud(restoreId));

    expect(store.getState().tacticalEditor.hudLayouts[hudId]).toEqual({
      ...hidden,
      visible: true,
    });
  });

  it("ignores an unknown HUD restoration ID", () => {
    const { result, store } = renderHudLayouts();
    const before = store.getState().tacticalEditor.hudLayouts;

    act(() => result.current.restoreHud("unknown-hud"));

    expect(store.getState().tacticalEditor.hudLayouts).toBe(before);
  });

  it("reflects HUD layout hydration readiness", () => {
    const { result, store } = renderHudLayouts();

    act(() => store.dispatch(editorHudLayoutsHydrated({
      tools: { pinned: true, position: { x: 80, y: 40 } },
    })));

    expect(result.current.hudLayoutsReady).toBe(true);
    expect(result.current.toolsLayout).toEqual({
      ...defaultTacticalEditorHudLayouts.tools,
      pinned: true,
      position: { x: 80, y: 40 },
    });
  });
});
