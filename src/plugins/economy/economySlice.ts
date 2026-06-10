import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LegacyMonthlyExpenseObservation } from "@/plugin-api/workflows";

export interface EconomyLedgerEntryLog {
  accountId: string;
  change: number;
  memo?: string;
}

export interface EconomyLedgerRequestLog {
  id: string;
  turn: number;
  source: string;
  effectType: string;
  status: "accepted" | "rejected" | "unresolved";
  reason?: string;
  memo?: string;
  total: number;
  entries: EconomyLedgerEntryLog[];
  createdAt: number;
  comparisonTotal?: number;
  comparisonLabel?: string;
  legacyTotal?: number;
  legacyNewCredits?: number;
  comparisonStatus?: "match" | "mismatch" | "pending";
  fundingStatus?: "solvent" | "debt";
  projectedBalance?: number;
  policy?: "allowDebt" | "blockPayment";
  policyOutcome?: "accepted" | "blocked";
}

export interface EconomyState {
  ledgerRequests: EconomyLedgerRequestLog[];
}

export const initialEconomyState: EconomyState = {
  ledgerRequests: [],
};

const maxLedgerRequests = 50;

const isMonthlyExpenseRequest = (request: EconomyLedgerRequestLog) =>
  request.memo === "Monthly ship expenses" ||
  request.entries.some((entry) =>
    entry.accountId === "sink:monthly-mortgage" ||
    entry.accountId === "sink:crew-salaries",
  );

const isSameMonthlyLedgerRequest = (
  left: EconomyLedgerRequestLog,
  right: EconomyLedgerRequestLog,
) =>
  left.turn === right.turn &&
  left.source === right.source &&
  left.effectType === right.effectType &&
  isMonthlyExpenseRequest(left) &&
  isMonthlyExpenseRequest(right);

const legacyMonthlyExpenseLog = (
  observation: LegacyMonthlyExpenseObservation,
): EconomyLedgerRequestLog => ({
  id: `${observation.source}:${observation.turn}:${Date.now()}`,
  turn: observation.turn,
  source: observation.source,
  effectType: "legacy.monthlyExpenses",
  status: "unresolved",
  reason: "No economy ledger request found for this legacy expense total",
  memo: "Legacy monthly expenses observed",
  total: 0,
  entries: [],
  createdAt: Date.now(),
  comparisonTotal: observation.total,
  comparisonLabel: "Legacy",
  legacyTotal: observation.total,
  legacyNewCredits: observation.newCredits,
  comparisonStatus: "pending",
});

const economySlice = createSlice({
  name: "economy",
  initialState: initialEconomyState,
  reducers: {
    recordEconomyLedgerRequest(
      state,
      action: PayloadAction<EconomyLedgerRequestLog>,
    ) {
      const existingIndex = state.ledgerRequests.findIndex((request) =>
        isSameMonthlyLedgerRequest(request, action.payload),
      );
      const existingRequest = existingIndex >= 0
        ? state.ledgerRequests[existingIndex]
        : null;
      if (existingIndex >= 0) {
        state.ledgerRequests.splice(existingIndex, 1);
      }

      state.ledgerRequests.unshift({
        ...action.payload,
        comparisonTotal: existingRequest
          ? action.payload.comparisonTotal ?? existingRequest.comparisonTotal
          : action.payload.comparisonTotal,
        comparisonLabel: existingRequest
          ? action.payload.comparisonLabel ?? existingRequest.comparisonLabel
          : action.payload.comparisonLabel,
        legacyTotal: existingRequest
          ? action.payload.legacyTotal ?? existingRequest.legacyTotal
          : action.payload.legacyTotal,
        legacyNewCredits: existingRequest
          ? action.payload.legacyNewCredits ?? existingRequest.legacyNewCredits
          : action.payload.legacyNewCredits,
        comparisonStatus: existingRequest
          ? action.payload.comparisonStatus ?? existingRequest.comparisonStatus
          : action.payload.comparisonStatus,
        fundingStatus: existingRequest
          ? action.payload.fundingStatus ?? existingRequest.fundingStatus
          : action.payload.fundingStatus,
        projectedBalance: existingRequest
          ? action.payload.projectedBalance ?? existingRequest.projectedBalance
          : action.payload.projectedBalance,
        policy: existingRequest
          ? action.payload.policy ?? existingRequest.policy
          : action.payload.policy,
        policyOutcome: existingRequest
          ? action.payload.policyOutcome ?? existingRequest.policyOutcome
          : action.payload.policyOutcome,
      });
      state.ledgerRequests = state.ledgerRequests.slice(0, maxLedgerRequests);
    },
    recordEconomyLegacyMonthlyExpenses(
      state,
      action: PayloadAction<LegacyMonthlyExpenseObservation>,
    ) {
      const observation = action.payload;
      const matchingIndexes = state.ledgerRequests.reduce<number[]>(
        (indexes, candidate, index) => {
          if (
            candidate.turn === observation.turn &&
            candidate.status === "accepted" &&
            isMonthlyExpenseRequest(candidate)
          ) {
            indexes.push(index);
          }
          return indexes;
        },
        [],
      );

      if (matchingIndexes.length === 0) {
        state.ledgerRequests.unshift(legacyMonthlyExpenseLog(observation));
        state.ledgerRequests = state.ledgerRequests.slice(0, maxLedgerRequests);
        return;
      }

      const request = state.ledgerRequests[matchingIndexes[0]];
      request.comparisonTotal = observation.total;
      request.comparisonLabel = "Legacy";
      request.legacyTotal = observation.total;
      request.legacyNewCredits = observation.newCredits;
      request.comparisonStatus =
        request.total === observation.total ? "match" : "mismatch";

      for (const duplicateIndex of matchingIndexes.slice(1).toReversed()) {
        state.ledgerRequests.splice(duplicateIndex, 1);
      }
    },
    clearEconomyLedgerRequests(state) {
      state.ledgerRequests = [];
    },
  },
});

export const {
  clearEconomyLedgerRequests,
  recordEconomyLegacyMonthlyExpenses,
  recordEconomyLedgerRequest,
} = economySlice.actions;

export default economySlice.reducer;
