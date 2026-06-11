import type { PluginWorkflowContext } from "@/plugin-api/types";
import { commitEconomyLedgerRequestToCredits, recordEconomyLedgerRequest } from "./economySlice";

interface AutomaticLedgerCommitCandidate {
  id: string;
  status: string;
  commitIntent: string;
  commitStatus: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isAutomaticLedgerCommitCandidate = (
  value: unknown,
): value is AutomaticLedgerCommitCandidate =>
  isRecord(value) &&
  typeof value.id === "string" &&
  value.status === "accepted" &&
  value.commitIntent === "automatic" &&
  value.commitStatus === "pending";

export const commitAutomaticEconomyLedgerAction = async (
  action: { type: string; payload?: unknown },
  _context: PluginWorkflowContext,
  dispatch: (action: unknown) => unknown,
) => {
  if (action.type !== recordEconomyLedgerRequest.type) return;
  if (!isAutomaticLedgerCommitCandidate(action.payload)) return;

  await dispatch(commitEconomyLedgerRequestToCredits(action.payload.id));
};
