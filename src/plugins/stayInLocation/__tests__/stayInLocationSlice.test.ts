import stayInLocationReducer, {
  advanceStayInLocationTurn,
  clearStayInLocationDebugRuns,
  initialStayInLocationState,
  recordStayInLocationTurn,
  recordStayInLocationWorkflowCheckpoint,
  setStayInLocationBlockBeforeTurnAdvance,
  setStayInLocationDebugEnabled,
} from "../stayInLocationSlice";
import { createPluginTestRootState } from "@/plugin-api/testing";
import { stayInLocationStateKey } from "../metadata";

describe("stayInLocation plugin slice", () => {
  it("returns initial private plugin state", () => {
    expect(stayInLocationReducer(undefined, { type: "@@INIT" })).toEqual(initialStayInLocationState);
  });

  it("records the turn numbers where the plugin advanced time", () => {
    let state = stayInLocationReducer(initialStayInLocationState, recordStayInLocationTurn(4));
    state = stayInLocationReducer(state, recordStayInLocationTurn(5));

    expect(state.pressedTurnNumbers).toEqual([4, 5]);
    expect(state.lastPressedTurn).toBe(5);
  });

  it("tracks the debug blocker toggle", () => {
    const state = stayInLocationReducer(
      initialStayInLocationState,
      setStayInLocationBlockBeforeTurnAdvance(true),
    );

    expect(state.blockBeforeTurnAdvance).toBe(true);
  });

  it("tracks workflow debug runs inside private plugin state", () => {
    let state = stayInLocationReducer(
      initialStayInLocationState,
      setStayInLocationDebugEnabled(true),
    );

    state = stayInLocationReducer(state, recordStayInLocationWorkflowCheckpoint({
      workflowRunId: "debug-run-1",
      source: "plugin.stayInLocation",
      phase: "workflowRequested",
      label: "Workflow requested",
      status: "complete",
      currentTurn: 3,
      sequence: 0,
      timestamp: 100,
    }));
    state = stayInLocationReducer(state, recordStayInLocationWorkflowCheckpoint({
      workflowRunId: "debug-run-1",
      source: "plugin.stayInLocation",
      phase: "workflowComplete",
      label: "Workflow complete",
      status: "complete",
      currentTurn: 4,
      sequence: 1,
      timestamp: 120,
    }));

    expect(state.debugEnabled).toBe(true);
    expect(state.activeDebugRunId).toBe("debug-run-1");
    expect(state.debugRuns).toHaveLength(1);
    expect(state.debugRuns[0].completedAt).toBe(120);
    expect(state.debugRuns[0].checkpoints.map((checkpoint) => checkpoint.phase)).toEqual([
      "workflowRequested",
      "workflowComplete",
    ]);

    state = stayInLocationReducer(state, clearStayInLocationDebugRuns());
    expect(state.debugRuns).toEqual([]);
    expect(state.activeDebugRunId).toBeNull();
  });

  it("runs the generic turn lifecycle after advancing", async () => {
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.stayInLocation",
            previousTurn: 3,
            currentTurn: 4,
          }),
        };
      }
      return undefined;
    });

    await advanceStayInLocationTurn()(dispatch, createPluginTestRootState, undefined);

    expect(actions).toContainEqual(recordStayInLocationTurn(3));
    expect(actions.some((action) => typeof action === "function")).toBe(true);
  });

  it("runs the workflow path when debug mode is enabled", async () => {
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.stayInLocation",
            previousTurn: 3,
            currentTurn: 4,
          }),
        };
      }
      return undefined;
    });
    const getState = () => createPluginTestRootState({
      pluginState: {
        [stayInLocationStateKey]: {
          ...initialStayInLocationState,
          debugEnabled: true,
        },
      },
    });

    await advanceStayInLocationTurn()(dispatch, getState, undefined);

    expect(actions.some((action) => typeof action === "function")).toBe(true);
    expect(actions).toContainEqual(recordStayInLocationTurn(3));
  });

  it("does not record a turn press when the workflow is stopped", async () => {
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.stayInLocation",
            previousTurn: 3,
            currentTurn: 3,
            stopped: true,
            stoppedByHandlerId: "test.blocker",
          }),
        };
      }
      return undefined;
    });

    await advanceStayInLocationTurn()(dispatch, createPluginTestRootState, undefined);

    expect(actions).not.toContainEqual(recordStayInLocationTurn(3));
  });
});
