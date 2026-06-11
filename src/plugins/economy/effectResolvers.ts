import type {
  PluginEffectResolver,
  PluginWorkflowEffect,
} from "@/plugin-api/types";
import {
  economyLedgerPostEffectType,
  economyPluginId,
} from "./metadata";
import {
  type EconomyLedgerCommitIntent,
  recordEconomyLedgerRequest,
} from "./economySlice";

interface LedgerPostEntry {
  accountId: string;
  change: number;
  memo?: string;
}

interface LedgerPostPayload {
  entries: LedgerPostEntry[];
  memo?: string;
  funding?: LedgerPostFunding;
  commitIntent: EconomyLedgerCommitIntent;
}

interface LedgerPostFunding {
  availableCredits: number;
  policy: "allowDebt" | "blockPayment";
}

interface LedgerFundingResolution {
  fundingStatus: "solvent" | "debt";
  projectedBalance: number;
  policy: "allowDebt" | "blockPayment";
  policyOutcome: "accepted" | "blocked";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseLedgerPostPayload = (
  effect: PluginWorkflowEffect,
): LedgerPostPayload | string => {
  const payload = effect.payload;
  if (!isRecord(payload)) return "Ledger post payload is required";

  const entries = payload.entries;
  if (!Array.isArray(entries)) return "Ledger post entries must be an array";
  if (entries.length < 2) return "Ledger post requires at least two entries";

  const parsedEntries: LedgerPostEntry[] = [];
  for (const [index, entry] of entries.entries()) {
    if (!isRecord(entry)) return `Entry ${index + 1} must be an object`;
    if (typeof entry.accountId !== "string" || entry.accountId.trim() === "") {
      return `Entry ${index + 1} accountId is required`;
    }
    if (typeof entry.change !== "number" || !Number.isFinite(entry.change)) {
      return `Entry ${index + 1} change must be finite`;
    }
    if (entry.change === 0) return `Entry ${index + 1} change cannot be zero`;

    parsedEntries.push({
      accountId: entry.accountId,
      change: entry.change,
      memo: typeof entry.memo === "string" ? entry.memo : undefined,
    });
  }

  const total = parsedEntries.reduce((sum, entry) => sum + entry.change, 0);
  if (Math.abs(total) > 0.0001) {
    return "Ledger post entries must balance to zero";
  }

  return {
    entries: parsedEntries,
    memo: typeof payload.memo === "string" ? payload.memo : undefined,
    funding: parseLedgerPostFunding(payload.funding),
    commitIntent: parseCommitIntent(payload.commit),
  };
};

const parseCommitIntent = (value: unknown): EconomyLedgerCommitIntent => {
  if (value === "manual" || value === "automatic" || value === "notRequired") {
    return value;
  }
  if (value === "pending") {
    return "manual";
  }
  return "notRequired";
};

const parseLedgerPostFunding = (value: unknown): LedgerPostFunding | undefined => {
  if (!isRecord(value)) return undefined;
  if (typeof value.availableCredits !== "number" || !Number.isFinite(value.availableCredits)) {
    return undefined;
  }
  if (value.policy !== "allowDebt" && value.policy !== "blockPayment") {
    return undefined;
  }

  return {
    availableCredits: value.availableCredits,
    policy: value.policy,
  };
};

const ledgerDebitTotal = (entries: readonly LedgerPostEntry[]) =>
  entries
    .filter((entry) => entry.change < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.change), 0);

const resolveFunding = (
  parsed: LedgerPostPayload,
): LedgerFundingResolution | undefined => {
  if (!parsed.funding) return undefined;

  const debitTotal = ledgerDebitTotal(parsed.entries);
  const projectedBalance = parsed.funding.availableCredits - debitTotal;
  const fundingStatus = projectedBalance < 0 ? "debt" : "solvent";
  const policyOutcome =
    fundingStatus === "debt" && parsed.funding.policy === "blockPayment"
      ? "blocked"
      : "accepted";

  return {
    fundingStatus,
    projectedBalance,
    policy: parsed.funding.policy,
    policyOutcome,
  };
};

const ledgerRequestLog = ({
  effect,
  turn,
  status,
  reason,
  parsed,
  funding,
}: {
  effect: PluginWorkflowEffect;
  turn: number;
  status: "accepted" | "rejected";
  reason?: string;
  parsed?: LedgerPostPayload;
  funding?: LedgerFundingResolution;
}) => recordEconomyLedgerRequest({
  id: `${effect.source}:${effect.type}:${turn}:${Date.now()}`,
  turn,
  source: effect.source,
  effectType: effect.type,
  validationStatus: status,
  commitIntent: status === "accepted" ? (parsed?.commitIntent ?? "notRequired") : "notRequired",
  commitStatus:
    status === "rejected"
      ? "blocked"
      : parsed?.commitIntent === "manual" || parsed?.commitIntent === "automatic"
        ? "pending"
        : "notRequired",
  status,
  reason,
  memo: parsed?.memo,
  total: parsed?.entries
    ? ledgerDebitTotal(parsed.entries)
    : 0,
  entries: parsed?.entries ?? [],
  createdAt: Date.now(),
  fundingStatus: funding?.fundingStatus,
  projectedBalance: funding?.projectedBalance,
  policy: funding?.policy,
  policyOutcome: funding?.policyOutcome,
});

export const economyLedgerPostResolver = {
  id: "ledger.post",
  pluginId: economyPluginId,
  effectType: economyLedgerPostEffectType,
  order: 100,
  resolve: (effect, context) => {
    const parsed = parseLedgerPostPayload(effect);
    if (typeof parsed === "string") {
      return {
        status: "rejected",
        reason: parsed,
        actions: [
          ledgerRequestLog({
            effect,
            turn: context.currentTurn,
            status: "rejected",
            reason: parsed,
          }),
        ],
      };
    }

    const funding = resolveFunding(parsed);
    if (funding?.policyOutcome === "blocked") {
      const reason = "Ledger post blocked by debt policy";
      return {
        status: "rejected",
        reason,
        actions: [
          ledgerRequestLog({
            effect,
            turn: context.currentTurn,
            status: "rejected",
            reason,
            parsed,
            funding,
          }),
        ],
      };
    }

    const reason = parsed.memo ?? "Ledger post accepted";
    return {
      status: "accepted",
      reason,
      actions: [
        ledgerRequestLog({
          effect,
          turn: context.currentTurn,
          status: "accepted",
          reason,
          parsed,
          funding,
        }),
      ],
    };
  },
} satisfies PluginEffectResolver;

export const economyEffectResolvers = [
  economyLedgerPostResolver,
] as const;
