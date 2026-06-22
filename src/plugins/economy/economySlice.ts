import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LegacyMonthlyExpenseObservation } from "@/plugin-api/workflows";
import type { RootState } from "@/store";
import { fetchCharacters, invalidateCharacters } from "@/plugins/characters";

export interface EconomyLedgerEntryLog {
  accountId: string;
  change: number;
  memo?: string;
}

export type EconomyLedgerCommitIntent = "notRequired" | "manual" | "automatic";

export interface EconomyLedgerRequestLog {
  id: string;
  turn: number;
  source: string;
  effectType: string;
  validationStatus: "accepted" | "rejected" | "unresolved";
  commitIntent: EconomyLedgerCommitIntent;
  commitStatus: "notRequired" | "pending" | "committed" | "failed" | "blocked";
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
  commitNote?: string;
}

export type EconomyLedgerRequestPayload =
  Omit<EconomyLedgerRequestLog, "validationStatus" | "commitIntent" | "commitStatus"> &
  Partial<Pick<EconomyLedgerRequestLog, "validationStatus" | "commitIntent" | "commitStatus">>;

export interface EconomyState {
  ledgerRequests: EconomyLedgerRequestLog[];
}

export const initialEconomyState: EconomyState = {
  ledgerRequests: [],
};

const maxLedgerRequests = 50;
const characterCreditAccountPattern = /^character:([^:]+):credits$/;

const isMonthlyExpenseRequest = (
  request: Pick<EconomyLedgerRequestLog, "memo" | "entries">,
) =>
  request.memo === "Monthly ship expenses" ||
  request.entries.some((entry) =>
    entry.accountId === "sink:monthly-mortgage" ||
    entry.accountId === "sink:crew-salaries",
  );

const isSameMonthlyLedgerRequest = (
  left: EconomyLedgerRequestLog,
  right: EconomyLedgerRequestPayload,
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
  validationStatus: "unresolved",
  commitIntent: "notRequired",
  commitStatus: "notRequired",
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

const defaultCommitStatusForValidation = (
  validationStatus: EconomyLedgerRequestLog["validationStatus"],
): EconomyLedgerRequestLog["commitStatus"] => {
  if (validationStatus === "accepted") return "notRequired";
  if (validationStatus === "rejected") return "blocked";
  return "notRequired";
};

const defaultCommitStatusForIntent = (
  validationStatus: EconomyLedgerRequestLog["validationStatus"],
  commitIntent: EconomyLedgerCommitIntent,
): EconomyLedgerRequestLog["commitStatus"] => {
  if (validationStatus === "rejected") return "blocked";
  if (validationStatus !== "accepted") return "notRequired";
  if (commitIntent === "notRequired") return "notRequired";
  return "pending";
};

const normalizeLedgerRequest = (
  request: EconomyLedgerRequestPayload,
): EconomyLedgerRequestLog => {
  const validationStatus = request.validationStatus ?? request.status;
  const commitIntent = request.commitIntent ??
    (request.commitStatus === "pending" ? "manual" : "notRequired");
  return {
    ...request,
    validationStatus,
    commitIntent,
    commitStatus:
      request.commitStatus ??
      defaultCommitStatusForIntent(validationStatus, commitIntent) ??
      defaultCommitStatusForValidation(validationStatus),
  };
};

const ownerCreditDebitForRequest = (request: EconomyLedgerRequestLog) => {
  const ownerCreditEntry = request.entries.find((entry) =>
    characterCreditAccountPattern.test(entry.accountId) && entry.change < 0,
  );
  if (!ownerCreditEntry) return null;

  const match = ownerCreditEntry.accountId.match(characterCreditAccountPattern);
  if (!match) return null;

  return {
    characterId: match[1],
    change: ownerCreditEntry.change,
  };
};

export const commitEconomyLedgerRequestToCredits = createAsyncThunk(
  "economy/commitLedgerRequestToCredits",
  async (requestId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const request = state.plugins.economy.ledgerRequests.find(
      (candidate) => candidate.id === requestId,
    );
    if (!request) {
      throw new Error("Ledger request not found");
    }
    if (request.status !== "accepted" || request.commitStatus !== "pending") {
      throw new Error("Ledger request is not an accepted pending commit");
    }

    const debit = ownerCreditDebitForRequest(request);
    if (!debit) {
      throw new Error("Ledger request has no owner credit debit");
    }

    const character = state.plugins.characters.items.find(
      (candidate) => candidate.id === debit.characterId,
    );
    if (!character) {
      throw new Error("Owner character not found in local state");
    }

    const nextCredits = character.credits + debit.change;
    const response = await fetch(`/api/characters/${debit.characterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits: nextCredits }),
    });

    if (!response.ok) {
      let message = "Failed to commit ledger request";
      try {
        const body = await response.json() as { error?: string };
        message = body.error ?? message;
      } catch {
        // Keep the generic message if the response is not JSON.
      }
      throw new Error(message);
    }

    dispatch(commitEconomyLedgerRequest({
      id: requestId,
      result: "committed",
      note: `Committed owner credits: Cr ${character.credits.toLocaleString()} -> Cr ${nextCredits.toLocaleString()}`,
    }));
    dispatch(invalidateCharacters());
    await dispatch(fetchCharacters());

    return {
      requestId,
      characterId: debit.characterId,
      previousCredits: character.credits,
      nextCredits,
    };
  },
);

const economySlice = createSlice({
  name: "economy",
  initialState: initialEconomyState,
  reducers: {
    recordEconomyLedgerRequest(
      state,
      action: PayloadAction<EconomyLedgerRequestPayload>,
    ) {
      const nextRequest = normalizeLedgerRequest(action.payload);
      const existingIndex = state.ledgerRequests.findIndex((request) =>
        isSameMonthlyLedgerRequest(request, nextRequest),
      );
      const existingRequest = existingIndex >= 0
        ? state.ledgerRequests[existingIndex]
        : null;
      if (existingIndex >= 0) {
        state.ledgerRequests.splice(existingIndex, 1);
      }

      state.ledgerRequests.unshift({
        ...nextRequest,
        comparisonTotal: existingRequest
          ? nextRequest.comparisonTotal ?? existingRequest.comparisonTotal
          : nextRequest.comparisonTotal,
        comparisonLabel: existingRequest
          ? nextRequest.comparisonLabel ?? existingRequest.comparisonLabel
          : nextRequest.comparisonLabel,
        legacyTotal: existingRequest
          ? nextRequest.legacyTotal ?? existingRequest.legacyTotal
          : nextRequest.legacyTotal,
        legacyNewCredits: existingRequest
          ? nextRequest.legacyNewCredits ?? existingRequest.legacyNewCredits
          : nextRequest.legacyNewCredits,
        comparisonStatus: existingRequest
          ? nextRequest.comparisonStatus ?? existingRequest.comparisonStatus
          : nextRequest.comparisonStatus,
        fundingStatus: existingRequest
          ? nextRequest.fundingStatus ?? existingRequest.fundingStatus
          : nextRequest.fundingStatus,
        projectedBalance: existingRequest
          ? nextRequest.projectedBalance ?? existingRequest.projectedBalance
          : nextRequest.projectedBalance,
        policy: existingRequest
          ? nextRequest.policy ?? existingRequest.policy
          : nextRequest.policy,
        policyOutcome: existingRequest
          ? nextRequest.policyOutcome ?? existingRequest.policyOutcome
          : nextRequest.policyOutcome,
        commitNote: existingRequest
          ? nextRequest.commitNote ?? existingRequest.commitNote
          : nextRequest.commitNote,
        commitIntent: existingRequest
          ? nextRequest.commitIntent ?? existingRequest.commitIntent
          : nextRequest.commitIntent,
        validationStatus: existingRequest
          ? nextRequest.validationStatus ?? existingRequest.validationStatus
          : nextRequest.validationStatus,
        commitStatus: existingRequest
          ? nextRequest.commitStatus ?? existingRequest.commitStatus
          : nextRequest.commitStatus,
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
    commitEconomyLedgerRequest(
      state,
      action: PayloadAction<{
        id: string;
        result?: "committed" | "failed";
        note?: string;
      }>,
    ) {
      const request = state.ledgerRequests.find(
        (candidate) => candidate.id === action.payload.id,
      );
      if (!request || request.commitStatus !== "pending") return;

      const result = action.payload.result ?? "committed";
      request.commitStatus = result;
      request.commitNote =
        action.payload.note ??
        (result === "committed"
          ? "Ledger commit completed"
          : "Ledger commit failed");
    },
    clearEconomyLedgerRequests(state) {
      state.ledgerRequests = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(commitEconomyLedgerRequestToCredits.rejected, (state, action) => {
      const request = state.ledgerRequests.find(
        (candidate) => candidate.id === action.meta.arg,
      );
      if (!request || request.commitStatus !== "pending") return;

      request.commitStatus = "failed";
      request.commitNote =
        action.error.message ?? "Ledger commit failed";
    });
  },
});

export const {
  clearEconomyLedgerRequests,
  commitEconomyLedgerRequest,
  recordEconomyLegacyMonthlyExpenses,
  recordEconomyLedgerRequest,
} = economySlice.actions;

export default economySlice.reducer;
