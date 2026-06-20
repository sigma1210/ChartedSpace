import type { PluginEventHandler } from "@/plugin-api/types";
import type { AdvanceTurnWorkflowPluginEvent } from "@/plugin-api/workflows";
import shipTypes from "@/data/classic/ships.json";
import {
  economyLedgerPostEffectType,
  economyPluginId,
} from "./metadata";

const monthlyExpenseCadence = 4;
const automaticMonthlyExpenseSources = new Set([
  "plugin.navigation.execute",
  "plugin.stayInLocation",
  "core.stayInLocation",
]);

const isAdvanceTurnWorkflowEvent = (
  event: unknown,
): event is AdvanceTurnWorkflowPluginEvent =>
  typeof event === "object" &&
  event !== null &&
  "currentTurn" in event;

const monthlyMortgageForShip = (shipType: string, isMortgaged: boolean) => {
  if (!isMortgaged) return 0;
  const typeData = (shipTypes as Array<{ type: string; monthlyMortgage?: number }>)
    .find((shipTypeData) => shipTypeData.type === shipType);
  return typeData?.monthlyMortgage ?? 0;
};

const monthlyExpenseCommitIntentForSource = (source: string) =>
  automaticMonthlyExpenseSources.has(source) ? "automatic" : "manual";

export const economyMonthlyExpensesHandler = {
  id: "monthlyExpenses.proposeLedgerPost",
  pluginId: economyPluginId,
  phase: "afterTurnAdvance",
  order: 100,
  handle: (event) => {
    if (!isAdvanceTurnWorkflowEvent(event)) {
      return { disposition: "continue" };
    }
    if (event.currentTurn % monthlyExpenseCadence !== 0) {
      return { disposition: "continue" };
    }
    if (!event.ship) {
      return { disposition: "continue" };
    }

    const ownerCrew = event.ship.crew.find((crewMember) => crewMember.isOwnerOperator);
    const ownerCharacterId = ownerCrew?.characterId ?? event.ownerCharacter?.id ?? null;
    if (!ownerCharacterId) {
      return { disposition: "continue" };
    }

    const mortgage = monthlyMortgageForShip(event.ship.type, event.ship.isMortgaged);
    const salaries = event.ship.crew.reduce(
      (total, crewMember) => total + crewMember.monthlySalary,
      0,
    );
    const total = mortgage + salaries;
    if (total <= 0) {
      return { disposition: "continue" };
    }

    return {
      disposition: "continue",
      effects: [{
        type: economyLedgerPostEffectType,
        source: economyPluginId,
        description: "Monthly ship expenses",
        payload: {
          memo: "Monthly ship expenses",
          commit: monthlyExpenseCommitIntentForSource(event.source),
          entries: [
            {
              accountId: `character:${ownerCharacterId}:credits`,
              change: -total,
              memo: "Monthly ship expenses",
            },
            ...(mortgage > 0
              ? [{
                accountId: "sink:monthly-mortgage",
                change: mortgage,
                memo: "Monthly mortgage",
              }]
              : []),
            ...(salaries > 0
              ? [{
                accountId: "sink:crew-salaries",
                change: salaries,
                memo: "Crew salaries",
              }]
              : []),
          ],
        },
      }],
    };
  },
} satisfies PluginEventHandler;

export const economyHandlers = [
  economyMonthlyExpensesHandler,
] as const;
