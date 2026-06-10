import type { LegacyMonthlyExpenseObservation } from "@/plugin-api/workflows";
import { recordEconomyLegacyMonthlyExpenses } from "./economySlice";

export const recordEconomyLegacyMonthlyExpenseObservations = (
  observations: readonly LegacyMonthlyExpenseObservation[],
) =>
  observations.map((observation) =>
    recordEconomyLegacyMonthlyExpenses(observation),
  );
