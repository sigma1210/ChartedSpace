import {
  setPluginLegacyMonthlyExpenseRecorder,
  setPluginWorkflowEffectResolver,
  setPluginWorkflowPhaseRunner,
} from "../lib/workflows/turnWorkflow";
import { recordEconomyLegacyMonthlyExpenseObservations } from "./economy/legacyMonthlyExpenses";
import { resolvePluginWorkflowEffects } from "./effectResolverRegistry";
import { runRegisteredPluginHandlersForPhase } from "./handlerRegistry";

export const installPluginWorkflowHandlers = () => {
  setPluginWorkflowPhaseRunner(runRegisteredPluginHandlersForPhase);
  setPluginWorkflowEffectResolver(resolvePluginWorkflowEffects);
  setPluginLegacyMonthlyExpenseRecorder(async (observations) =>
    recordEconomyLegacyMonthlyExpenseObservations(observations),
  );
};
