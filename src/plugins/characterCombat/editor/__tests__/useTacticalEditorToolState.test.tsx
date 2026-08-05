/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createAppStore } from "@/store";
import { useTacticalEditorToolState } from "../useTacticalEditorToolState";

const renderToolState = () => {
  const store = createAppStore();
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return {
    ...renderHook(() => useTacticalEditorToolState(), { wrapper }),
    store,
  };
};

describe("useTacticalEditorToolState", () => {
  it("returns the default primary mode and tool settings", () => {
    const { result } = renderToolState();

    expect(result.current).toMatchObject({
      primaryTool: "select",
      placementKind: null,
      enemyKind: null,
      circleTerrainType: "wall",
      openToolGroup: null,
    });
  });

  it("activates and clears a drawing tool", () => {
    const { result, store } = renderToolState();

    act(() => result.current.setPlacementKind("scenario-wall"));
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "drawing", toolId: "scenario-wall" });
    expect(result.current.placementKind).toBe("scenario-wall");
    expect(result.current.enemyKind).toBeNull();

    act(() => result.current.setPlacementKind(null));
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "primary", tool: "select" });
  });

  it("activates and clears an enemy tool", () => {
    const { result, store } = renderToolState();

    act(() => result.current.setEnemyKind("gang-leader"));
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "enemy", enemyType: "gang-leader" });
    expect(result.current.enemyKind).toBe("gang-leader");
    expect(result.current.placementKind).toBeNull();

    act(() => result.current.setEnemyKind(null));
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "primary", tool: "select" });
  });

  it("does not clear a different active mode", () => {
    const { result, store } = renderToolState();

    act(() => result.current.setEnemyKind("gang-member"));
    act(() => result.current.setPlacementKind(null));

    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "enemy", enemyType: "gang-member" });
  });

  it("activates each primary tool", () => {
    const { result, store } = renderToolState();

    act(() => result.current.setPrimaryTool("node"));
    expect(result.current.primaryTool).toBe("node");
    act(() => result.current.setPrimaryTool("hand"));
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "primary", tool: "hand" });
  });

  it("updates the circle terrain type independently", () => {
    const { result, store } = renderToolState();

    act(() => result.current.setPlacementKind("scenario-circle"));
    act(() => result.current.setCircleTerrainType("liquid-hydrogen"));

    expect(result.current.circleTerrainType).toBe("liquid-hydrogen");
    expect(store.getState().tacticalEditor.tools.mode)
      .toEqual({ kind: "drawing", toolId: "scenario-circle" });
  });

  it("toggles, switches, and closes tool groups", () => {
    const { result } = renderToolState();

    act(() => result.current.toggleToolGroup("boundaries"));
    expect(result.current.openToolGroup).toBe("boundaries");
    act(() => result.current.toggleToolGroup("areas"));
    expect(result.current.openToolGroup).toBe("areas");
    act(() => result.current.toggleToolGroup("areas"));
    expect(result.current.openToolGroup).toBeNull();
    act(() => result.current.toggleToolGroup("nature"));
    act(() => result.current.closeToolGroup());
    expect(result.current.openToolGroup).toBeNull();
  });
});
