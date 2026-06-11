import {
  setPluginLegacyMonthlyExpenseRecorder,
  setPluginWorkflowActionCommitter,
  setPluginWorkflowEffectResolver,
  setPluginWorkflowPhaseRunner,
} from "../lib/workflows/turnWorkflow";
import { commitAutomaticEconomyLedgerAction } from "./economy/automaticLedgerCommits";
import { recordEconomyLegacyMonthlyExpenseObservations } from "./economy/legacyMonthlyExpenses";
import { resolvePluginWorkflowEffects } from "./effectResolverRegistry";
import { runRegisteredPluginHandlersForPhase } from "./handlerRegistry";

export const installPluginWorkflowHandlers = () => {
  setPluginWorkflowPhaseRunner(runRegisteredPluginHandlersForPhase);
  setPluginWorkflowEffectResolver(resolvePluginWorkflowEffects);
  setPluginWorkflowActionCommitter(commitAutomaticEconomyLedgerAction);
  setPluginLegacyMonthlyExpenseRecorder(async (observations) =>
    recordEconomyLegacyMonthlyExpenseObservations(observations),
  );
};
