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

  it("toggles the tracing-template HUD without changing its pin or position", () => {
    const { result } = renderHudLayouts();

    act(() => result.current.setTracingTemplateLayout({
      visible: false,
      pinned: true,
      position: { x: 1, y: 2 },
    }));
    act(() => result.current.toggleHudVisibility("tracing-template"));

    expect(result.current.tracingTemplateLayout).toEqual({
      visible: true,
      pinned: true,
      position: { x: 1, y: 2 },
    });
  });

  it.each([
    "tools",
    "layers",
    "enemy-palette",
    "area-properties",
    "wall-properties",
    "object-properties",
    "circle-properties",
    "console-editor",
    "enemy-editor",
    "tracing-template",
    "navigation",
  ] as const)("toggles the %s HUD without changing its pin or position", (hudId) => {
    const { result, store } = renderHudLayouts();
    const hidden = { visible: false, pinned: true, position: { x: 17, y: 29 } };

    act(() => store.dispatch(editorHudLayoutChanged({
      id: hudId as TacticalEditorHudId,
      layout: hidden,
    })));
    act(() => result.current.toggleHudVisibility(hudId));
    expect(store.getState().tacticalEditor.hudLayouts[hudId]).toEqual({
      ...hidden,
      visible: true,
    });
    act(() => result.current.toggleHudVisibility(hudId));
    expect(store.getState().tacticalEditor.hudLayouts[hudId]).toEqual(hidden);
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
