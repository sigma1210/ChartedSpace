import { createPluginTestRootState } from "@/plugin-api/testing";
import { registeredPluginActions } from "../../actionRegistry";
import { registeredPluginHudLayouts } from "../../hudLayouts";
import { pluginReducers } from "../../registry";
import {
  recordEconomyLedgerRequest,
} from "../../economy";
import {
  expenseScenarioPlugin,
  expenseScenarioRunAction,
  expenseScenarioRunActionId,
  expenseScenarioPluginId,
  expenseScenarioStateKey,
  initialExpenseScenarioState,
  recordExpenseScenarioRun,
  runExpenseScenario,
} from "..";

describe("expense scenario plugin", () => {
  it("registers its action, state, and HUD through the plugin catalog", () => {
    expect(expenseScenarioPlugin.metadata.id).toBe(expenseScenarioPluginId);
    expect(expenseScenarioPlugin.state.stateKey).toBe(expenseScenarioStateKey);
    expect(expenseScenarioPlugin.actions).toContain(expenseScenarioRunAction);
    expect(expenseScenarioRunAction.id).toBe(expenseScenarioRunActionId);
    expect(registeredPluginActions).toContain(expenseScenarioRunAction);
    expect(registeredPluginHudLayouts).toContain(expenseScenarioPlugin.huds[0]);
    expect(pluginReducers[expenseScenarioStateKey]).toBe(
      expenseScenarioPlugin.state.reducer,
    );
  });

  it("records a matching expense scenario in the economy ledger", async () => {
    const dispatch = jest.fn();
    const getState = () => createPluginTestRootState({
      pluginState: {
        expenseScenario: {
          ...initialExpenseScenarioState,
          mortgageAmount: 150920,
          crewSalaryTotal: 17000,
          expectedTotal: 167920,
          ownerCredits: 500000,
        },
      },
    });

    await runExpenseScenario()(dispatch, getState, undefined);

    const ledgerAction = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === recordEconomyLedgerRequest.type);

    expect(ledgerAction?.payload).toMatchObject({
      source: expenseScenarioPluginId,
      memo: "Expense scenario",
      total: 167920,
      comparisonTotal: 167920,
      comparisonLabel: "Expected",
      comparisonStatus: "match",
      fundingStatus: "solvent",
      projectedBalance: 332080,
      policy: "allowDebt",
      policyOutcome: "accepted",
    });
    expect(dispatch).toHaveBeenCalledWith(
      recordExpenseScenarioRun({
        total: 167920,
        projectedOwnerCredits: 332080,
        fundingStatus: "solvent",
      }),
    );
  });

  it("records a mismatching expense scenario in the economy ledger", async () => {
    const dispatch = jest.fn();
    const getState = () => createPluginTestRootState({
      pluginState: {
        expenseScenario: {
          ...initialExpenseScenarioState,
          mortgageAmount: 150920,
          crewSalaryTotal: 17000,
          expectedTotal: 100,
          ownerCredits: 500000,
        },
      },
    });

    await runExpenseScenario()(dispatch, getState, undefined);

    const ledgerAction = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === recordEconomyLedgerRequest.type);

    expect(ledgerAction?.payload).toMatchObject({
      source: expenseScenarioPluginId,
      total: 167920,
      comparisonTotal: 100,
      comparisonStatus: "mismatch",
    });
  });

  it("records debt funding status when projected owner credits are negative", async () => {
    const dispatch = jest.fn();
    const getState = () => createPluginTestRootState({
      pluginState: {
        expenseScenario: {
          ...initialExpenseScenarioState,
          mortgageAmount: 150920,
          crewSalaryTotal: 17000,
          expectedTotal: 167920,
          ownerCredits: 1000,
        },
      },
    });

    await runExpenseScenario()(dispatch, getState, undefined);

    expect(dispatch).toHaveBeenCalledWith(
      recordExpenseScenarioRun({
        total: 167920,
        projectedOwnerCredits: -166920,
        fundingStatus: "debt",
      }),
    );
  });

  it("rejects debt scenarios when block payment policy is selected", async () => {
    const dispatch = jest.fn();
    const getState = () => createPluginTestRootState({
      pluginState: {
        expenseScenario: {
          ...initialExpenseScenarioState,
          mortgageAmount: 150920,
          crewSalaryTotal: 17000,
          expectedTotal: 167920,
          ownerCredits: 1000,
          debtPolicy: "blockPayment",
        },
      },
    });

    await runExpenseScenario()(dispatch, getState, undefined);

    const ledgerAction = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === recordEconomyLedgerRequest.type);

    expect(ledgerAction?.payload).toMatchObject({
      source: expenseScenarioPluginId,
      status: "rejected",
      reason: "Ledger post blocked by debt policy",
      total: 167920,
      comparisonStatus: "match",
      fundingStatus: "debt",
      projectedBalance: -166920,
      policy: "blockPayment",
      policyOutcome: "blocked",
    });
  });
});
