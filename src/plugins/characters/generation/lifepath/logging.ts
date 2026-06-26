import type {
  GenerationAction,
  GenerationLogEntry,
} from "../types";
import type { LifepathRuntimeState } from "./runtimeTypes";

const nextSequence = (state: LifepathRuntimeState) => state.log.length;

export const appendActionAndLog = ({
  state,
  action,
  label,
  data,
}: {
  state: LifepathRuntimeState;
  action: GenerationAction;
  label: string;
  data?: GenerationLogEntry["data"];
}): Pick<LifepathRuntimeState, "actions" | "log"> => ({
  actions: [...state.actions, action],
  log: [
    ...state.log,
    {
      sequence: nextSequence(state),
      type: action.type,
      actionId: action.id,
      term: action.term === undefined ? state.term : action.term,
      label,
      data: data ?? {},
    },
  ],
});

export const appendTrackedAction = ({
  state,
  action,
  label,
  data,
}: {
  state: LifepathRuntimeState;
  action: GenerationAction;
  label: string;
  data?: GenerationLogEntry["data"];
}): LifepathRuntimeState => ({
  ...state,
  ...appendActionAndLog({ state, action, label, data }),
});
