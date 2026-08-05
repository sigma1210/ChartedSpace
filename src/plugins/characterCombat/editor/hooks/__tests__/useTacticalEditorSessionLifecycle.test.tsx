/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { createAppStore, type AppStore } from "@/store";
import {
  editorHudLayoutChanged,
  editorSelectionChanged,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import { TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY } from "@/plugins/characterCombat/editor/lib/hudLayouts";
import { useTacticalEditorSessionLifecycle } from "../useTacticalEditorSessionLifecycle";

const renderSessionLifecycle = (store: AppStore) => renderHook(
  () => useTacticalEditorSessionLifecycle(),
  { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider> },
);

const storeToolsLayout = (pinned: boolean, x: number, y: number) => {
  window.localStorage.setItem(TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY, JSON.stringify({
    tools: { pinned, position: { x, y } },
  }));
};

describe("useTacticalEditorSessionLifecycle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("resets the editor session and hydrates stored HUD placement after mount", async () => {
    const store = createAppStore();
    store.dispatch(editorSelectionChanged({ kind: "wall", id: "wall-1" }));
    store.dispatch(editorHudLayoutChanged({
      id: "tools",
      layout: { visible: false, pinned: false, position: { x: 300, y: 12 } },
    }));
    storeToolsLayout(true, 118, 74);

    renderSessionLifecycle(store);

    await waitFor(() => expect(store.getState().tacticalEditor.hudLayoutsReady).toBe(true));
    expect(store.getState().tacticalEditor.selection.object).toBeNull();
    expect(store.getState().tacticalEditor.hudLayouts.tools).toEqual({
      visible: false,
      pinned: true,
      position: { x: 118, y: 74 },
    });
  });

  it("rehydrates HUD placement when tactical editor storage changes", async () => {
    const store = createAppStore();
    renderSessionLifecycle(store);
    await waitFor(() => expect(store.getState().tacticalEditor.hudLayoutsReady).toBe(true));

    storeToolsLayout(true, 240, 96);
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY,
    })));

    expect(store.getState().tacticalEditor.hudLayouts.tools).toMatchObject({
      pinned: true,
      position: { x: 240, y: 96 },
    });
  });

  it("unsubscribes from HUD storage changes on unmount", async () => {
    const store = createAppStore();
    const { unmount } = renderSessionLifecycle(store);
    await waitFor(() => expect(store.getState().tacticalEditor.hudLayoutsReady).toBe(true));
    const layoutBeforeUnmount = store.getState().tacticalEditor.hudLayouts.tools;

    unmount();
    storeToolsLayout(true, 420, 180);
    act(() => window.dispatchEvent(new StorageEvent("storage", {
      key: TACTICAL_EDITOR_HUD_LAYOUT_STORAGE_KEY,
    })));

    expect(store.getState().tacticalEditor.hudLayouts.tools).toEqual(layoutBeforeUnmount);
  });
});
