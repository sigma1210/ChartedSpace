"use client";

import { FlaskConical } from "lucide-react";
import {
  hudActionButtonClass,
  usePluginActionRunner,
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import {
  setExpenseScenarioDebtPolicy,
  setExpenseScenarioCrewSalaryTotal,
  setExpenseScenarioExpectedTotal,
  setExpenseScenarioMortgageAmount,
  setExpenseScenarioOwnerCredits,
} from "./expenseScenarioSlice";
import { selectExpenseScenarioState } from "./selectors";
import {
  expenseScenarioPluginId,
  expenseScenarioRunActionId,
} from "./metadata";

const numberInputClass =
  "h-7 w-full border border-(--hud-border) bg-black/40 px-2 text-right font-mono text-[9px] text-(--hud-text) outline-none focus:border-(--hud-accent)";

const parseCurrencyInput = (value: string) => {
  const parsed = Number.parseInt(value.replaceAll(",", ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const ExpenseScenarioHudContent = () => {
  const dispatch = usePluginDispatch();
  const runPluginAction = usePluginActionRunner();
  const scenario = usePluginSelector(selectExpenseScenarioState);
  const actualTotal = scenario.mortgageAmount + scenario.crewSalaryTotal;
  const projectedOwnerCredits = scenario.ownerCredits - actualTotal;
  const fundingStatus = projectedOwnerCredits < 0 ? "debt" : "solvent";

  const runScenario = () => {
    runPluginAction(expenseScenarioPluginId, expenseScenarioRunActionId);
  };

  return (
    <div className="flex max-h-[36vh] w-60 flex-col gap-2 overflow-hidden py-1">
      <div className="min-h-0 space-y-2 overflow-y-auto overscroll-contain pr-1">
        <div className="grid grid-cols-[1fr_6.5rem] items-center gap-1.5 text-[9px]">
          <label className="uppercase tracking-widest text-(--hud-text-dim)" htmlFor="expense-scenario-mortgage">
            Mortgage
          </label>
          <input
            id="expense-scenario-mortgage"
            type="number"
            min={0}
            value={scenario.mortgageAmount}
            onChange={(event) =>
              dispatch(setExpenseScenarioMortgageAmount(parseCurrencyInput(event.currentTarget.value)))
            }
            className={numberInputClass}
          />

          <label className="uppercase tracking-widest text-(--hud-text-dim)" htmlFor="expense-scenario-crew">
            Crew Salaries
          </label>
          <input
            id="expense-scenario-crew"
            type="number"
            min={0}
            value={scenario.crewSalaryTotal}
            onChange={(event) =>
              dispatch(setExpenseScenarioCrewSalaryTotal(parseCurrencyInput(event.currentTarget.value)))
            }
            className={numberInputClass}
          />

          <label className="uppercase tracking-widest text-(--hud-text-dim)" htmlFor="expense-scenario-expected">
            Expected
          </label>
          <input
            id="expense-scenario-expected"
            type="number"
            min={0}
            value={scenario.expectedTotal}
            onChange={(event) =>
              dispatch(setExpenseScenarioExpectedTotal(parseCurrencyInput(event.currentTarget.value)))
            }
            className={numberInputClass}
          />

          <label className="uppercase tracking-widest text-(--hud-text-dim)" htmlFor="expense-scenario-owner-credits">
            Owner Credits
          </label>
          <input
            id="expense-scenario-owner-credits"
            type="number"
            min={0}
            value={scenario.ownerCredits}
            onChange={(event) =>
              dispatch(setExpenseScenarioOwnerCredits(parseCurrencyInput(event.currentTarget.value)))
            }
            className={numberInputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-1 border border-(--hud-border) p-1">
          <button
            type="button"
            onClick={() => dispatch(setExpenseScenarioDebtPolicy("allowDebt"))}
            className={`h-7 border px-2 text-[8px] uppercase tracking-widest transition-colors ${
              scenario.debtPolicy === "allowDebt"
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border) text-(--hud-text-dim)"
            }`}
          >
            Allow Debt
          </button>
          <button
            type="button"
            onClick={() => dispatch(setExpenseScenarioDebtPolicy("blockPayment"))}
            className={`h-7 border px-2 text-[8px] uppercase tracking-widest transition-colors ${
              scenario.debtPolicy === "blockPayment"
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border) text-(--hud-text-dim)"
            }`}
          >
            Block Pay
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 border border-(--hud-border) px-2 py-1 font-mono text-[9px]">
          <span className="uppercase tracking-widest text-(--hud-text-dim)">Actual</span>
          <span className="text-right text-(--hud-text)">Cr {actualTotal.toLocaleString()}</span>
          <span className="uppercase tracking-widest text-(--hud-text-dim)">Projected</span>
          <span className="text-right text-(--hud-text)">
            Cr {projectedOwnerCredits.toLocaleString()}
          </span>
          <span className="uppercase tracking-widest text-(--hud-text-dim)">Funding</span>
          <span
            className={
              fundingStatus === "debt"
                ? "text-right uppercase text-red-300"
                : "text-right uppercase text-(--hud-accent)"
            }
          >
            {fundingStatus}
          </span>
          <span className="uppercase tracking-widest text-(--hud-text-dim)">Runs</span>
          <span className="text-right text-(--hud-text)">{scenario.runCount}</span>
        </div>

        <button
          type="button"
          onClick={runScenario}
          className={`${hudActionButtonClass} w-full`}
        >
          <FlaskConical size={12} aria-hidden="true" />
          Run Expense Scenario
        </button>
      </div>
    </div>
  );
};

export const ExpenseScenarioHudIcon = FlaskConical;
