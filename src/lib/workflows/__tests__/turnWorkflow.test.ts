import { createPluginTestRootState } from "@/plugin-api/testing";
import {
  advanceTurnWorkflow,
  resetPluginLegacyMonthlyExpenseRecorder,
  resetPluginWorkflowActionCommitter,
  resetPluginWorkflowEffectResolver,
  resetPluginWorkflowPhaseRunner,
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

describe("turn workflow bridge", () => {
  it("does not run the legacy monthly expense deduction during world turn lifecycle", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
    const dispatch = jest.fn();

    await advanceTurnWorkflow({
      source: "test.workflow",
      lifecycle: "world",
    })(dispatch, createPluginTestRootState, undefined);

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/ship/crew/settle-wages",
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
