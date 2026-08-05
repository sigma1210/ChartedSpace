/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import {
  cloneTacticalConsoleVictoryDefinition,
  defaultTacticalConsoleVictoryDefinition,
} from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  cloneTacticalScenarioDefinition,
  defaultTacticalScenarioDefinition,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { createAppStore } from "@/store";
import { useTacticalEditorPlaytest } from "../useTacticalEditorPlaytest";

const renderPlaytest = ({
  blocked = false,
  draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition),
  consoleVictory = cloneTacticalConsoleVictoryDefinition(defaultTacticalConsoleVictoryDefinition),
} = {}) => {
  const editorStore = createAppStore();
  return {
    editorStore,
    draft,
    consoleVictory,
    ...renderHook(
      () => useTacticalEditorPlaytest(draft, consoleVictory, blocked),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <Provider store={editorStore}>{children}</Provider>
        ),
      },
    ),
  };
};

describe("useTacticalEditorPlaytest", () => {
  it("does not start a blocked playtest", () => {
    const { result } = renderPlaytest({ blocked: true });

    act(() => result.current.beginPlaytest());

    expect(result.current.canBeginPlaytest).toBe(false);
    expect(result.current.playtest).toBeNull();
  });

  it.each([
    { width: 0, height: 48 },
    { width: 72, height: 0 },
  ])("does not start with map dimensions $width by $height", ({ width, height }) => {
    const draft = cloneTacticalScenarioDefinition(defaultTacticalScenarioDefinition);
    draft.map = { width, height };
    const { result } = renderPlaytest({ draft });

    act(() => result.current.beginPlaytest());

    expect(result.current.canBeginPlaytest).toBe(false);
    expect(result.current.playtest).toBeNull();
  });

  it("starts with cloned definitions and an isolated sandbox store", () => {
    const { result, draft, consoleVictory, editorStore } = renderPlaytest();

    act(() => result.current.beginPlaytest());

    const session = result.current.playtest;
    expect(session).not.toBeNull();
    expect(session?.definition).toEqual(draft);
    expect(session?.definition).not.toBe(draft);
    expect(session?.consoleVictory).toEqual(consoleVictory);
    expect(session?.consoleVictory).not.toBe(consoleVictory);
    expect(session?.sandbox).not.toBe(editorStore);
    expect(session?.sandbox.getState()).toEqual(editorStore.getState());

    draft.title = "Changed after playtest started";
    consoleVictory.operations = [];
    expect(session?.definition.title).not.toBe(draft.title);
    expect(session?.consoleVictory.operations).not.toHaveLength(0);
  });

  it("clears the active playtest on exit", () => {
    const { result } = renderPlaytest();
    act(() => result.current.beginPlaytest());
    expect(result.current.playtest).not.toBeNull();

    act(() => result.current.exitPlaytest());

    expect(result.current.playtest).toBeNull();
  });
});
