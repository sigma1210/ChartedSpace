import { createPluginTestRootState } from "@/plugin-api/testing";
import {
  advanceTurnWorkflow,
  executeJumpWorkflow,
  resetPluginLegacyMonthlyExpenseRecorder,
  resetPluginWorkflowActionCommitter,
  resetPluginWorkflowEffectResolver,
  resetPluginWorkflowPhaseRunner,
  resolveJumpDriveCheck,
  setPluginWorkflowActionCommitter,
  setPluginWorkflowEffectResolver,
  setPluginLegacyMonthlyExpenseRecorder,
  setPluginWorkflowPhaseRunner,
} from "../turnWorkflow";

afterEach(() => {
  resetPluginWorkflowPhaseRunner();
  resetPluginWorkflowEffectResolver();
  resetPluginWorkflowActionCommitter();
  resetPluginLegacyMonthlyExpenseRecorder();
});

const createDispatchExecutingNestedThunks = (limit: number) => {
  let nestedThunkExecutions = 0;
  const dispatch: jest.Mock = jest.fn((action: unknown): unknown => {
    if (typeof action === "function" && nestedThunkExecutions < limit) {
      nestedThunkExecutions += 1;
      return action(dispatch, createPluginTestRootState, undefined);
    }
    return action;
  });

  return dispatch;
};

const turnAdvancePayloadsFrom = (dispatch: jest.Mock) =>
  dispatch.mock.calls
    .map(([action]) => action)
    .filter((action): action is { type: string; meta?: { arg?: unknown } } =>
      typeof action === "object" &&
      action !== null &&
      (action as { type?: string }).type === "turn/advance/pending",
    )
    .map((action) => action.meta?.arg);

const mockAdvanceTurnFetch = () =>
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ currentTurn: 4 }),
  } as Response);

describe("turn workflow bridge", () => {
  it("does not run the legacy monthly expense deduction during world turn lifecycle", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
    const dispatch = jest.fn();

    await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
    })(dispatch, createPluginTestRootState, undefined);

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/crew/settle-wages",
      { method: "POST" },
    );

    fetchMock.mockRestore();
  });

  it("emits debug checkpoints when a workflow debug target is provided", async () => {
    const dispatch = jest.fn();
    const checkpointActionType = "test/debugCheckpoint";

    await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
      debug: {
        enabled: true,
        checkpointActionType,
        workflowRunId: "debug-run-1",
      },
    })(dispatch, createPluginTestRootState, undefined);

    const checkpoints = dispatch.mock.calls
      .map(([action]) => action)
      .filter((action) => action?.type === checkpointActionType)
      .map((action) => action.payload);

    expect(checkpoints.map((checkpoint) => checkpoint.phase)).toEqual([
      "workflowRequested",
      "contextBuilt",
      "beforeTurnAdvance",
      "pluginHandlersDiscovered",
      "turnCommitted",
      "legacyLifecycleComplete",
      "afterTurnAdvance",
      "pluginHandlersDiscovered",
      "refreshComplete",
      "workflowComplete",
    ]);
    expect(checkpoints.every((checkpoint) => checkpoint.workflowRunId === "debug-run-1")).toBe(true);
  });

  it("stops before committing a turn when a beforeTurnAdvance handler blocks", async () => {
    const dispatch = jest.fn();
    setPluginWorkflowPhaseRunner(async ({ phase }) => ({
      disposition: phase === "beforeTurnAdvance" ? "stop" : "continue",
      handlerCount: 1,
      stoppedByHandlerId: phase === "beforeTurnAdvance" ? "test.blocker" : undefined,
      reason: phase === "beforeTurnAdvance" ? "Blocked by test" : undefined,
      effects: [],
    }));

    const result = await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
    })(dispatch, createPluginTestRootState, undefined);

    expect(result.payload).toEqual({
      source: "test.workflow",
      previousTurn: 3,
      currentTurn: 3,
      stopped: true,
      stoppedByHandlerId: "test.blocker",
      stoppedReason: "Blocked by test",
      proposedEffects: [],
      effectResolutions: [],
    });
    expect(dispatch.mock.calls.some(([action]) => action?.type === "turn/advanceTurn")).toBe(false);
  });

  it("collects trace-only effect proposals from plugin handlers", async () => {
    const dispatch = jest.fn();
    const checkpointActionType = "test/debugCheckpoint";
    const proposedEffect = {
      type: "debug.note",
      source: "test.handler",
      description: "Trace-only effect proposal",
      payload: { observedTurn: 4 },
    };

    setPluginWorkflowPhaseRunner(async ({ phase, onHandlersDiscovered }) => {
      onHandlersDiscovered?.(phase === "afterTurnAdvance" ? 1 : 0);
      return {
        disposition: "continue",
        handlerCount: phase === "afterTurnAdvance" ? 1 : 0,
        effects: phase === "afterTurnAdvance" ? [proposedEffect] : [],
      };
    });

    const result = await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
      debug: {
        enabled: true,
        checkpointActionType,
        workflowRunId: "debug-run-effects",
      },
    })(dispatch, createPluginTestRootState, undefined);

    const checkpoints = dispatch.mock.calls
      .map(([action]) => action)
      .filter((action) => action?.type === checkpointActionType)
      .map((action) => action.payload);

    expect(result.payload).toMatchObject({
      stopped: false,
      proposedEffects: [proposedEffect],
      effectResolutions: [{
        status: "unresolved",
        reason: "No resolver installed for debug.note",
      }],
    });
    expect(checkpoints).toContainEqual(expect.objectContaining({
      phase: "pluginEffectsProposed",
      label: "afterTurnAdvance effects proposed",
      summary: "test.handler:debug.note",
    }));
  });

  it("passes an empty legacy monthly expense observation list after legacy deduction is retired", async () => {
    const dispatch = jest.fn();

    setPluginLegacyMonthlyExpenseRecorder(async (observations) => [
      {
        type: "test/legacyMonthlyExpensesObserved",
        payload: observations,
      },
    ]);

    await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
    })(dispatch, createPluginTestRootState, undefined);

    expect(dispatch).toHaveBeenCalledWith({
      type: "test/legacyMonthlyExpensesObserved",
      payload: [],
    });
  });

  it("runs the installed action committer after dispatching resolved effect actions", async () => {
    const dispatch = jest.fn();
    const automaticLedgerAction = {
      type: "economy/recordEconomyLedgerRequest",
      payload: {
        id: "ledger-automatic-1",
        status: "accepted",
        commitIntent: "automatic",
        commitStatus: "pending",
      },
    };
    const committedActions: unknown[] = [];

    setPluginWorkflowPhaseRunner(async ({ phase }) => ({
      disposition: "continue",
      handlerCount: phase === "afterTurnAdvance" ? 1 : 0,
      effects: phase === "afterTurnAdvance"
        ? [{
          type: "economy.ledger.post",
          source: "test.economy",
          payload: {},
        }]
        : [],
    }));
    setPluginWorkflowActionCommitter(async (action, _context, workflowDispatch) => {
      committedActions.push(action);
      workflowDispatch({
        type: "test/automaticCommit",
        payload: (action.payload as { id?: string } | undefined)?.id,
      });
    });

    setPluginWorkflowEffectResolver(async () => [{
      status: "accepted",
      actions: [automaticLedgerAction],
    }]);

    await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
    })(dispatch, createPluginTestRootState, undefined);

    expect(dispatch).toHaveBeenCalledWith(automaticLedgerAction);
    expect(dispatch).toHaveBeenCalledWith({
      type: "test/automaticCommit",
      payload: "ledger-automatic-1",
    });
    expect(committedActions).toEqual([automaticLedgerAction]);
  });
});

describe("execute jump workflow", () => {
  const jumpRequest = {
    source: "plugin.navigation",
    destination: {
      sectorAbbr: "Spin",
      hex: "1912",
    },
    jumpDistance: 2,
    fuelCostEstimate: 20000,
    plotCheck: {
      roll: 10,
      target: 8,
    },
    transitionDurationMs: 0,
  };

  it("resolves drive check outcomes from the raw engineering roll", () => {
    expect(resolveJumpDriveCheck(2).outcome).toBe("misjump");
    expect(resolveJumpDriveCheck(3).outcome).toBe("failed");
    expect(resolveJumpDriveCheck(4).outcome).toBe("success");
  });

  it("proposes automatic fuel expense and returns the destination on drive success", async () => {
    const dispatch = createDispatchExecutingNestedThunks(2);
    const fetchMock = mockAdvanceTurnFetch();
    const resolvedActions: unknown[] = [];

    setPluginWorkflowEffectResolver(async (effects) => {
      resolvedActions.push(...effects);
      return effects.map(() => ({
        status: "accepted",
      }));
    });

    const result = await executeJumpWorkflow({
      ...jumpRequest,
      driveRoll: 4,
    })(dispatch, createPluginTestRootState, undefined);

    expect(result.payload).toMatchObject({
      source: "plugin.navigation",
      currentTurn: 3,
      stopped: false,
      driveCheck: {
        rawRoll: 4,
        modifier: 0,
        total: 4,
        target: 4,
        outcome: "success",
      },
      currentLocation: {
        sectorAbbr: "Spin",
        hex: "1910",
      },
      finalLocation: {
        sectorAbbr: "Spin",
        hex: "1912",
      },
    });
    expect(resolvedActions).toEqual([
      expect.objectContaining({
        type: "economy.ledger.post",
        source: "plugin.navigation",
        description: "Jump fuel expense",
        payload: expect.objectContaining({
          memo: "Jump fuel",
          commit: "automatic",
          funding: {
            availableCredits: 100000,
            policy: "allowDebt",
          },
          entries: [
            {
              accountId: "character:owner-1:credits",
              change: -20000,
              memo: "Jump fuel",
            },
            {
              accountId: "sink:jump-fuel",
              change: 20000,
              memo: "Jump fuel distance 2",
            },
          ],
        }),
      }),
    ]);
    expect(dispatch).toHaveBeenCalledWith({
      type: "systemScene/setSceneMode",
      payload: "jump",
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "systemScene/setWarpLayerState",
      payload: {
        showWarpLayer: true,
        warpLayerActive: true,
        warpLayerOpacity: 1,
      },
    });
    expect(dispatch).toHaveBeenCalledWith(expect.any(Function));
    expect(dispatch).toHaveBeenCalledWith({
      type: "systemScene/setSceneMode",
      payload: "system",
    });
    const dispatchedActions = dispatch.mock.calls.map(([action]) => action);
    const warpStartIndex = dispatchedActions.findIndex((action) =>
      typeof action === "object" &&
      action !== null &&
      (action as { type?: string }).type === "systemScene/setWarpLayerState" &&
      (action as { payload?: { showWarpLayer?: boolean } }).payload?.showWarpLayer === true,
    );
    const turnCommitIndex = dispatchedActions.findIndex((action) => typeof action === "function");
    const warpFadeIndex = dispatchedActions.findIndex((action) =>
      typeof action === "object" &&
      action !== null &&
      (action as { type?: string }).type === "systemScene/setWarpLayerState" &&
      (action as { payload?: { warpLayerOpacity?: number } }).payload?.warpLayerOpacity === 0,
    );
    expect(warpStartIndex).toBeGreaterThanOrEqual(0);
    expect(turnCommitIndex).toBeGreaterThan(warpStartIndex);
    expect(warpFadeIndex).toBeGreaterThan(turnCommitIndex);
    expect(turnAdvancePayloadsFrom(dispatch)).toEqual([
      {
        shipUpdate: {
          status: "docked",
          currentLocation: "Spin:1912",
          destinationLocation: null,
          jumpArrivesTurn: null,
        },
      },
    ]);
    fetchMock.mockRestore();
  });

  it("keeps the ship at the current location when the drive check fails", async () => {
    const dispatch = createDispatchExecutingNestedThunks(2);
    const fetchMock = mockAdvanceTurnFetch();
    setPluginWorkflowEffectResolver(async (effects) =>
      effects.map(() => ({ status: "accepted" })),
    );

    const result = await executeJumpWorkflow({
      ...jumpRequest,
      driveRoll: 3,
    })(dispatch, createPluginTestRootState, undefined);

    expect(result.payload).toMatchObject({
      stopped: false,
      driveCheck: {
        outcome: "failed",
      },
      finalLocation: {
        sectorAbbr: "Spin",
        hex: "1910",
      },
    });
    expect(turnAdvancePayloadsFrom(dispatch)).toEqual([
      {
        shipUpdate: {
          status: "docked",
          currentLocation: "Spin:1910",
        },
      },
    ]);
    fetchMock.mockRestore();
  });

  it("keeps the ship at the current location on snake-eyes misjump for the first pass", async () => {
    const dispatch = createDispatchExecutingNestedThunks(2);
    const fetchMock = mockAdvanceTurnFetch();
    setPluginWorkflowEffectResolver(async (effects) =>
      effects.map(() => ({ status: "accepted" })),
    );

    const result = await executeJumpWorkflow({
      ...jumpRequest,
      driveRoll: 2,
    })(dispatch, createPluginTestRootState, undefined);

    expect(result.payload).toMatchObject({
      stopped: false,
      driveCheck: {
        rawRoll: 2,
        outcome: "misjump",
      },
      finalLocation: {
        sectorAbbr: "Spin",
        hex: "1910",
      },
    });
    expect(turnAdvancePayloadsFrom(dispatch)).toEqual([
      {
        shipUpdate: {
          status: "docked",
          currentLocation: "Spin:1910",
          destinationLocation: null,
          jumpArrivesTurn: null,
        },
      },
    ]);
    fetchMock.mockRestore();
  });

  it("stops before the drive check when the fuel effect is rejected", async () => {
    const dispatch = jest.fn();
    setPluginWorkflowEffectResolver(async (effects) =>
      effects.map(() => ({
        status: "rejected",
        reason: "Ledger post blocked by debt policy",
      })),
    );

    const result = await executeJumpWorkflow({
      ...jumpRequest,
      driveRoll: 8,
    })(dispatch, createPluginTestRootState, undefined);

    expect(result.payload).toMatchObject({
      stopped: true,
      stoppedReason: "Ledger post blocked by debt policy",
      driveCheck: null,
      finalLocation: {
        sectorAbbr: "Spin",
        hex: "1910",
      },
    });
    expect(dispatch).not.toHaveBeenCalledWith({
      type: "systemScene/setSceneMode",
      payload: "jump",
    });
    expect(dispatch).not.toHaveBeenCalledWith({
      type: "systemScene/setWarpLayerState",
      payload: {
        showWarpLayer: true,
        warpLayerActive: true,
        warpLayerOpacity: 1,
      },
    });
  });
});
