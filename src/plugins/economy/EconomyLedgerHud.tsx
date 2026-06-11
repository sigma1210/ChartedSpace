"use client";

import { CheckCircle2, ReceiptText, Trash2 } from "lucide-react";
import {
  hudActionButtonClass,
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import {
  clearEconomyLedgerRequests,
  commitEconomyLedgerRequestToCredits,
} from "./economySlice";
import {
  selectEconomyLedgerRequests,
  selectEconomyLedgerSummary,
} from "./selectors";

export const EconomyLedgerHudContent = () => {
  const dispatch = usePluginDispatch();
  const ledgerRequests = usePluginSelector(selectEconomyLedgerRequests);
  const summary = usePluginSelector(selectEconomyLedgerSummary);

  return (
    <div className="flex max-h-[42vh] w-72 flex-col gap-2 overflow-hidden py-1">
      <div className="grid grid-cols-3 gap-2 text-center font-mono text-[8px] uppercase tracking-widest">
        <div className="border border-(--hud-border) px-2 py-1">
          <div className="text-(--hud-text-dim)">Accepted</div>
          <div className="text-(--hud-text)">{summary.accepted}</div>
        </div>
        <div className="border border-(--hud-border) px-2 py-1">
          <div className="text-(--hud-text-dim)">Rejected</div>
          <div className="text-(--hud-text)">{summary.rejected}</div>
        </div>
        <div className="border border-(--hud-border) px-2 py-1">
          <div className="text-(--hud-text-dim)">Unresolved</div>
          <div className="text-(--hud-text)">{summary.unresolved}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => dispatch(clearEconomyLedgerRequests())}
        className={`${hudActionButtonClass} w-full`}
      >
        <Trash2 size={12} aria-hidden="true" />
        Clear Ledger Log
      </button>

      {ledgerRequests.length === 0 ? (
        <div className="font-mono text-[9px] uppercase tracking-widest text-(--hud-text-dim)">
          No ledger requests
        </div>
      ) : (
        <div className="min-h-0 max-h-36 space-y-2 overscroll-contain overflow-y-auto pr-1">
          {ledgerRequests.map((request) => (
            <div
              key={request.id}
              className="border border-(--hud-border) p-2 font-mono text-[8px] leading-4"
            >
              <div className="flex items-center justify-between gap-2 text-(--hud-text)">
                <span>Turn {request.turn}</span>
                <span className="uppercase text-(--hud-accent)">{request.status}</span>
              </div>
              <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                <span>Validation</span>
                <span
                  className={
                    request.validationStatus === "rejected"
                      ? "text-red-300"
                      : "text-(--hud-accent)"
                  }
                >
                  {request.validationStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                <span>Commit</span>
                <span
                  className={
                    request.commitStatus === "blocked" ||
                    request.commitStatus === "failed"
                      ? "text-red-300"
                      : "text-(--hud-accent)"
                  }
                >
                  {request.commitStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-(--hud-text)">
                <span className="text-(--hud-text-dim)">Total</span>
                <span>Cr {request.total.toLocaleString()}</span>
              </div>
              {typeof request.comparisonTotal === "number" && (
                <div className="flex items-center justify-between gap-2 text-(--hud-text)">
                  <span className="text-(--hud-text-dim)">
                    {request.comparisonLabel ?? "Compare"}
                  </span>
                  <span>Cr {request.comparisonTotal.toLocaleString()}</span>
                </div>
              )}
              {request.comparisonStatus && (
                <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                  <span>Comparison</span>
                  <span
                    className={
                      request.comparisonStatus === "mismatch"
                        ? "text-red-300"
                        : "text-(--hud-accent)"
                    }
                  >
                    {request.comparisonStatus}
                  </span>
                </div>
              )}
              {request.fundingStatus && (
                <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                  <span>Funding</span>
                  <span
                    className={
                      request.fundingStatus === "debt"
                        ? "text-red-300"
                        : "text-(--hud-accent)"
                    }
                  >
                    {request.fundingStatus}
                  </span>
                </div>
              )}
              {typeof request.projectedBalance === "number" && (
                <div className="flex items-center justify-between gap-2 text-(--hud-text)">
                  <span className="text-(--hud-text-dim)">Projected</span>
                  <span>Cr {request.projectedBalance.toLocaleString()}</span>
                </div>
              )}
              {request.policy && (
                <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                  <span>Policy</span>
                  <span>{request.policy === "blockPayment" ? "block pay" : "allow debt"}</span>
                </div>
              )}
              {request.policyOutcome && (
                <div className="flex items-center justify-between gap-2 uppercase text-(--hud-text-dim)">
                  <span>Outcome</span>
                  <span
                    className={
                      request.policyOutcome === "blocked"
                        ? "text-red-300"
                        : "text-(--hud-accent)"
                    }
                  >
                    {request.policyOutcome}
                  </span>
                </div>
              )}
              {request.commitNote && (
                <div className="text-(--hud-text-dim)">{request.commitNote}</div>
              )}
              <div className="text-(--hud-text-dim)">{request.source}</div>
              <div className="text-(--hud-text)">{request.memo ?? request.effectType}</div>
              {request.reason && (
                <div className="text-(--hud-text-dim)">{request.reason}</div>
              )}
              {request.commitStatus === "pending" && (
                <button
                  type="button"
                  onClick={() => dispatch(commitEconomyLedgerRequestToCredits(request.id))}
                  className="mt-1 flex h-6 w-full items-center justify-center gap-1 border border-(--hud-accent) px-2 text-[8px] uppercase tracking-widest text-(--hud-accent) transition-colors hover:bg-(--hud-accent) hover:text-(--hud-bg)"
                >
                  <CheckCircle2 size={11} aria-hidden="true" />
                  Commit Expense
                </button>
              )}
              <div className="mt-1 space-y-1">
                {request.entries.map((entry, index) => (
                  <div
                    key={`${request.id}-${index}`}
                    className="grid grid-cols-[1fr_4.5rem] gap-2 text-(--hud-text-dim)"
                  >
                    <span className="truncate">{entry.accountId}</span>
                    <span className="text-right text-(--hud-text)">
                      {entry.change > 0 ? "+" : ""}
                      {entry.change.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const EconomyLedgerHudIcon = ReceiptText;
