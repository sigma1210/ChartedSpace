import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { economyLedgerPostResolver } from "../economy/effectResolvers";
import {
  economyLedgerPostEffectType,
} from "../economy/metadata";
import { recordEconomyLedgerRequest } from "../economy/economySlice";
import {
  expenseScenarioPluginId,
} from "./metadata";
import { selectExpenseScenarioState, type ExpenseScenarioPluginRoot } from "./selectors";

export interface ExpenseScenarioState {
  mortgageAmount: number;
  crewSalaryTotal: number;
  expectedTotal: number;
  ownerCredits: number;
  debtPolicy: "allowDebt" | "blockPayment";
  runCount: number;
  lastRunTotal: number | null;
  lastProjectedOwnerCredits: number | null;
  lastFundingStatus: "solvent" | "debt" | null;
}

export const initialExpenseScenarioState: ExpenseScenarioState = {
  mortgageAmount: 150920,
  crewSalaryTotal: 17000,
  expectedTotal: 167920,
  ownerCredits: 500000,
  debtPolicy: "allowDebt",
  runCount: 0,
  lastRunTotal: null,
  lastProjectedOwnerCredits: null,
  lastFundingStatus: null,
};

const toNonNegativeInteger = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

const expenseScenarioSlice = createSlice({
  name: "expenseScenario",
  initialState: initialExpenseScenarioState,
  reducers: {
    setExpenseScenarioMortgageAmount(state, action: PayloadAction<number>) {
      state.mortgageAmount = toNonNegativeInteger(action.payload);
    },
    setExpenseScenarioCrewSalaryTotal(state, action: PayloadAction<number>) {
      state.crewSalaryTotal = toNonNegativeInteger(action.payload);
    },
    setExpenseScenarioExpectedTotal(state, action: PayloadAction<number>) {
      state.expectedTotal = toNonNegativeInteger(action.payload);
    },
    setExpenseScenarioOwnerCredits(state, action: PayloadAction<number>) {
      state.ownerCredits = toNonNegativeInteger(action.payload);
    },
    setExpenseScenarioDebtPolicy(
      state,
      action: PayloadAction<ExpenseScenarioState["debtPolicy"]>,
    ) {
      state.debtPolicy = action.payload;
    },
    recordExpenseScenarioRun(
      state,
      action: PayloadAction<{
        total: number;
        projectedOwnerCredits: number;
        fundingStatus: "solvent" | "debt";
      }>,
    ) {
      state.runCount += 1;
      state.lastRunTotal = action.payload.total;
      state.lastProjectedOwnerCredits = action.payload.projectedOwnerCredits;
      state.lastFundingStatus = action.payload.fundingStatus;
    },
  },
});

export const {
  recordExpenseScenarioRun,
  setExpenseScenarioCrewSalaryTotal,
  setExpenseScenarioDebtPolicy,
  setExpenseScenarioExpectedTotal,
  setExpenseScenarioMortgageAmount,
  setExpenseScenarioOwnerCredits,
} = expenseScenarioSlice.actions;

export const runExpenseScenario = createAsyncThunk(
  "expenseScenario/run",
  async (_, { dispatch, getState }) => {
    const state = selectExpenseScenarioState(
      getState() as ExpenseScenarioPluginRoot,
    );
    const mortgageAmount = toNonNegativeInteger(state.mortgageAmount);
    const crewSalaryTotal = toNonNegativeInteger(state.crewSalaryTotal);
    const expectedTotal = toNonNegativeInteger(state.expectedTotal);
    const ownerCredits = toNonNegativeInteger(state.ownerCredits);
    const debtPolicy = state.debtPolicy;
    const total = mortgageAmount + crewSalaryTotal;
    const projectedOwnerCredits = ownerCredits - total;
    const fundingStatus = projectedOwnerCredits < 0 ? "debt" : "solvent";
    const entries = [
      {
        accountId: "scenario:owner:credits",
        change: -total,
        memo: "Scenario expense total",
      },
      ...(mortgageAmount > 0
        ? [{
          accountId: "sink:monthly-mortgage",
          change: mortgageAmount,
          memo: "Scenario mortgage",
        }]
        : []),
      ...(crewSalaryTotal > 0
        ? [{
          accountId: "sink:crew-salaries",
          change: crewSalaryTotal,
          memo: "Scenario crew salaries",
        }]
        : []),
    ];

    if (total <= 0 || entries.length < 2) {
      dispatch(recordEconomyLedgerRequest({
        id: `${expenseScenarioPluginId}:empty:${Date.now()}`,
        turn: 0,
        source: expenseScenarioPluginId,
        effectType: economyLedgerPostEffectType,
        validationStatus: "rejected",
        commitStatus: "blocked",
        status: "rejected",
        reason: `Expense scenario requires a positive mortgage or crew salary total; scenario funding: ${fundingStatus}`,
        memo: "Expense scenario",
        total,
        entries: [],
        createdAt: Date.now(),
        comparisonTotal: expectedTotal,
        comparisonLabel: "Expected",
        comparisonStatus: total === expectedTotal ? "match" : "mismatch",
        fundingStatus,
        projectedBalance: projectedOwnerCredits,
        policy: debtPolicy,
        policyOutcome: "blocked",
      }));
      dispatch(recordExpenseScenarioRun({
        total,
        projectedOwnerCredits,
        fundingStatus,
      }));
      return;
    }

    const resolution = await economyLedgerPostResolver.resolve({
      type: economyLedgerPostEffectType,
      source: expenseScenarioPluginId,
      description: "Expense scenario",
      payload: {
        memo: "Expense scenario",
        entries,
        funding: {
          availableCredits: ownerCredits,
          policy: debtPolicy,
        },
      },
    }, {
      source: expenseScenarioPluginId,
      currentTurn: 0,
    });

    for (const action of resolution.actions ?? []) {
      if (action.type !== recordEconomyLedgerRequest.type) {
        dispatch(action);
        continue;
      }

      dispatch(recordEconomyLedgerRequest({
        ...(action.payload as Parameters<typeof recordEconomyLedgerRequest>[0]),
        comparisonTotal: expectedTotal,
        comparisonLabel: "Expected",
        comparisonStatus: total === expectedTotal ? "match" : "mismatch",
      }));
    }

    dispatch(recordExpenseScenarioRun({
      total,
      projectedOwnerCredits,
      fundingStatus,
    }));
  },
);

export default expenseScenarioSlice.reducer;
