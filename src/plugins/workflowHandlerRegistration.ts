import { setPluginWorkflowPhaseRunner } from "../lib/workflows/turnWorkflow";
import { runRegisteredPluginHandlersForPhase } from "./handlerRegistry";

export const installPluginWorkflowHandlers = () => {
  setPluginWorkflowPhaseRunner(runRegisteredPluginHandlersForPhase);
};
