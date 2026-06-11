import "@/lib/turns/index";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  PluginEventHandler,
  PluginWorkflowEffect,
  PluginWorkflowContext,
  PluginWorkflowPhase,
  PluginWorkflowResult,
  PluginEffectResolution,
} from "../../plugins/types";
import type { RootState } from "../../store";
import { fetchCharacters, invalidateCharacters } from "../../store/slices/characterSlice";
import { fetchShip, invalidateShip } from "../../store/slices/shipSlice";
import { advanceTurn, type AdvanceTurnPayload } from "../../store/slices/turnSlice";
import {
  fireEndTurn,
  fireStartJumpTurn,
  fireStartTurn,
  type LegacyMonthlyExpenseObservation,
  type TurnEventContext,
} from "../turns/handlers";

export type AdvanceTurnLifecycle = "world" | "jump-start" | "none";

export type AdvanceTurnWorkflowDebugPhase =
  | "workflowRequested"
  | "contextBuilt"
  | "beforeTurnAdvance"
  | "pluginHandlersDiscovered"
  | "pluginHandlerStarted"
  | "pluginHandlerCompleted"
  | "pluginHandlerStoppedWorkflow"
  | "pluginEffectsProposed"
  | "pluginEffectResolved"
  | "turnCommitted"
  | "legacyLifecycleComplete"
  | "afterTurnAdvance"
  | "refreshComplete"
  | "workflowComplete";

export interface AdvanceTurnWorkflowDebugCheckpoint {
  workflowRunId: string;
  source: string;
  phase: AdvanceTurnWorkflowDebugPhase;
  label: string;
  status: "complete";
  currentTurn: number;
  sequence: number;
  timestamp: number;
  summary?: string;
}

export interface AdvanceTurnWorkflowDebugInput {
  enabled: boolean;
  checkpointActionType: string;
  workflowRunId: string;
}

export interface AdvanceTurnWorkflowInput {
  source: string;
  payload?: AdvanceTurnPayload;
  lifecycle?: AdvanceTurnLifecycle;
  metadata?: Record<string, unknown>;
  debug?: AdvanceTurnWorkflowDebugInput;
}

export interface AdvanceTurnWorkflowPluginEvent {
  source: string;
  lifecycle: AdvanceTurnLifecycle;
  previousTurn: number;
  currentTurn: number;
  metadata?: Record<string, unknown>;
  ship?: TurnEventContext["ship"];
  ownerCharacter?: TurnEventContext["ownerCharacter"];
}

export interface AdvanceTurnWorkflowResult {
  source: string;
  previousTurn: number;
  currentTurn: number;
  stopped: boolean;
  stoppedByHandlerId?: string;
  stoppedReason?: string;
  proposedEffects: PluginWorkflowEffect[];
  effectResolutions: PluginEffectResolution[];
}

interface PluginWorkflowPhaseRunnerInput {
  phase: PluginWorkflowPhase;
  event: AdvanceTurnWorkflowPluginEvent;
  context: PluginWorkflowContext;
  onHandlersDiscovered?: (handlerCount: number) => void;
  onHandlerStart?: (handler: PluginEventHandler) => void;
  onHandlerComplete?: (
    handler: PluginEventHandler,
    result: PluginWorkflowResult,
  ) => void;
}

interface PluginWorkflowPhaseRunnerResult {
  disposition: "continue" | "stop";
  handlerCount: number;
  stoppedByHandlerId?: string;
  reason?: string;
  effects: PluginWorkflowEffect[];
}

type PluginWorkflowPhaseRunner = (
  input: PluginWorkflowPhaseRunnerInput,
) => Promise<PluginWorkflowPhaseRunnerResult>;

type PluginWorkflowEffectResolver = (
  effects: readonly PluginWorkflowEffect[],
  context: PluginWorkflowContext,
) => Promise<PluginEffectResolution[]>;

type PluginLegacyMonthlyExpenseRecorder = (
  observations: readonly LegacyMonthlyExpenseObservation[],
  context: PluginWorkflowContext,
) => Promise<readonly { type: string; payload?: unknown }[]>;

type PluginWorkflowActionCommitter = (
  action: { type: string; payload?: unknown },
  context: PluginWorkflowContext,
  dispatch: (action: unknown) => unknown,
) => Promise<void>;

let pluginWorkflowPhaseRunner: PluginWorkflowPhaseRunner = async ({ onHandlersDiscovered }) => {
  onHandlersDiscovered?.(0);
  return {
    disposition: "continue",
    handlerCount: 0,
    effects: [],
  };
};

let pluginWorkflowEffectResolver: PluginWorkflowEffectResolver = async (effects) =>
  effects.map((effect) => ({
    status: "unresolved",
    reason: `No resolver installed for ${effect.type}`,
  }));

let pluginLegacyMonthlyExpenseRecorder: PluginLegacyMonthlyExpenseRecorder = async () => [];
let pluginWorkflowActionCommitter: PluginWorkflowActionCommitter = async () => {};

export const resetPluginWorkflowPhaseRunner = () => {
  pluginWorkflowPhaseRunner = async ({ onHandlersDiscovered }) => {
    onHandlersDiscovered?.(0);
    return {
      disposition: "continue",
      handlerCount: 0,
      effects: [],
    };
  };
};

export const setPluginWorkflowPhaseRunner = (runner: PluginWorkflowPhaseRunner) => {
  pluginWorkflowPhaseRunner = runner;
};

export const resetPluginWorkflowEffectResolver = () => {
  pluginWorkflowEffectResolver = async (effects) =>
    effects.map((effect) => ({
      status: "unresolved",
      reason: `No resolver installed for ${effect.type}`,
    }));
};

export const setPluginWorkflowEffectResolver = (
  resolver: PluginWorkflowEffectResolver,
) => {
  pluginWorkflowEffectResolver = resolver;
};

export const resetPluginLegacyMonthlyExpenseRecorder = () => {
  pluginLegacyMonthlyExpenseRecorder = async () => [];
};

export const setPluginLegacyMonthlyExpenseRecorder = (
  recorder: PluginLegacyMonthlyExpenseRecorder,
) => {
  pluginLegacyMonthlyExpenseRecorder = recorder;
};

export const resetPluginWorkflowActionCommitter = () => {
  pluginWorkflowActionCommitter = async () => {};
};

export const setPluginWorkflowActionCommitter = (
  committer: PluginWorkflowActionCommitter,
) => {
  pluginWorkflowActionCommitter = committer;
};

const isLegacyMonthlyExpenseObservation = (
  value: unknown,
): value is LegacyMonthlyExpenseObservation =>
  typeof value === "object" &&
  value !== null &&
  (value as LegacyMonthlyExpenseObservation).source === "legacy.monthlyCosts" &&
  typeof (value as LegacyMonthlyExpenseObservation).turn === "number" &&
  typeof (value as LegacyMonthlyExpenseObservation).total === "number" &&
  typeof (value as LegacyMonthlyExpenseObservation).newCredits === "number";

const buildTurnContext = (state: RootState): TurnEventContext | null => {
  const ship = state.ship.ship;
  if (!ship) return null;
  if (ship.status !== "docked" && ship.status !== "in_jump") return null;

  const ownerCharacterId =
    ship.crew.find((member) => member.isOwnerOperator)?.characterId ?? null;
  const ownerCharacter = ownerCharacterId
    ? state.characters.items.find((character) => character.id === ownerCharacterId) ?? null
    : null;

  return {
    currentTurn: state.turn.currentTurn,
    previousStatus: ship.status,
    ship,
    ownerCharacter,
  };
};

const refreshShipAndCharacters = async (dispatch: (action: unknown) => unknown) => {
  dispatch(invalidateShip());
  await dispatch(fetchShip());
  dispatch(invalidateCharacters());
  await dispatch(fetchCharacters());
};

const createCheckpointEmitter = (
  input: AdvanceTurnWorkflowInput,
  dispatch: (action: unknown) => unknown,
  initialTurn: number,
) => {
  let sequence = 0;

  return (
    phase: AdvanceTurnWorkflowDebugPhase,
    label: string,
    summary?: string,
    currentTurn = initialTurn,
  ) => {
    if (!input.debug?.enabled) return;
    dispatch({
      type: input.debug.checkpointActionType,
      payload: {
        workflowRunId: input.debug.workflowRunId,
        source: input.source,
        phase,
        label,
        status: "complete",
        currentTurn,
        sequence,
        timestamp: Date.now(),
        summary,
      } satisfies AdvanceTurnWorkflowDebugCheckpoint,
    });
    sequence += 1;
  };
};

const runWorkflowPluginPhase = async ({
  phase,
  event,
  context,
  checkpoint,
}: {
  phase: PluginWorkflowPhase;
  event: AdvanceTurnWorkflowPluginEvent;
  context: PluginWorkflowContext;
  checkpoint: ReturnType<typeof createCheckpointEmitter>;
}) => {
  const result = await pluginWorkflowPhaseRunner({
    phase,
    event,
    context,
    onHandlersDiscovered: (handlerCount) => {
      checkpoint(
        "pluginHandlersDiscovered",
        `${phase} handlers discovered`,
        `${handlerCount}`,
        event.currentTurn,
      );
    },
    onHandlerStart: (handler) => {
      checkpoint(
        "pluginHandlerStarted",
        `${phase} handler started`,
        `${handler.pluginId}/${handler.id}`,
        event.currentTurn,
      );
    },
    onHandlerComplete: (handler, handlerResult) => {
      checkpoint(
        "pluginHandlerCompleted",
        `${phase} handler completed`,
        `${handler.pluginId}/${handler.id}: ${handlerResult.disposition}${handlerResult.reason ? ` - ${handlerResult.reason}` : ""}`,
        event.currentTurn,
      );
    },
  });

  if (result.disposition === "stop") {
    checkpoint(
      "pluginHandlerStoppedWorkflow",
      `${phase} handler stopped workflow`,
      result.reason
        ? `${result.stoppedByHandlerId}: ${result.reason}`
        : result.stoppedByHandlerId,
      event.currentTurn,
    );
  }

  if (result.effects.length > 0) {
    checkpoint(
      "pluginEffectsProposed",
      `${phase} effects proposed`,
      result.effects
        .map((effect) => `${effect.source}:${effect.type}`)
        .join(", "),
      event.currentTurn,
    );
  }

  return result;
};

const resolveWorkflowEffects = async ({
  effects,
  context,
  checkpoint,
  currentTurn,
  dispatch,
}: {
  effects: readonly PluginWorkflowEffect[];
  context: PluginWorkflowContext;
  checkpoint: ReturnType<typeof createCheckpointEmitter>;
  currentTurn: number;
  dispatch: (action: unknown) => unknown;
}) => {
  if (effects.length === 0) return [];

  const resolutions = await pluginWorkflowEffectResolver(effects, context);
  for (const [index, resolution] of resolutions.entries()) {
    const effect = effects[index];
    checkpoint(
      "pluginEffectResolved",
      `${effect.type} ${resolution.status}`,
      resolution.reason ??
        (resolution.resolverId
          ? `${resolution.pluginId}/${resolution.resolverId}`
          : undefined),
      currentTurn,
    );
    for (const action of resolution.actions ?? []) {
      dispatch(action);
      await pluginWorkflowActionCommitter(action, context, dispatch);
    }
  }

  return resolutions;
};

export const advanceTurnWorkflow = createAsyncThunk(
  "coreWorkflow/advanceTurn",
  async (input: AdvanceTurnWorkflowInput, { dispatch, getState }): Promise<AdvanceTurnWorkflowResult> => {
    const state = getState() as RootState;
    const ctx = buildTurnContext(state);
    const lifecycle = input.lifecycle ?? "world";
    const checkpoint = createCheckpointEmitter(
      input,
      dispatch,
      state.turn.currentTurn,
    );

    checkpoint("workflowRequested", "Workflow requested", input.source);
    checkpoint(
      "contextBuilt",
      "Turn context built",
      ctx ? `Ship status: ${ctx.previousStatus}` : "No eligible ship context",
    );
    checkpoint("beforeTurnAdvance", "Before turn advance");

    const beforeTurnEvent = {
      source: input.source,
      lifecycle,
      previousTurn: state.turn.currentTurn,
      currentTurn: state.turn.currentTurn,
      metadata: input.metadata,
      ship: ctx?.ship,
      ownerCharacter: ctx?.ownerCharacter,
    } satisfies AdvanceTurnWorkflowPluginEvent;
    const pluginContext = {
      source: input.source,
      currentTurn: state.turn.currentTurn,
    } satisfies PluginWorkflowContext;
    const beforeTurnResult = await runWorkflowPluginPhase({
      phase: "beforeTurnAdvance",
      event: beforeTurnEvent,
      context: pluginContext,
      checkpoint,
    });

    if (beforeTurnResult.disposition === "stop") {
      checkpoint(
        "workflowComplete",
        "Workflow stopped before turn advance",
        beforeTurnResult.reason
          ? `${beforeTurnResult.stoppedByHandlerId}: ${beforeTurnResult.reason}`
          : beforeTurnResult.stoppedByHandlerId,
      );
      return {
        source: input.source,
        previousTurn: state.turn.currentTurn,
        currentTurn: state.turn.currentTurn,
        stopped: true,
        stoppedByHandlerId: beforeTurnResult.stoppedByHandlerId,
        stoppedReason: beforeTurnResult.reason,
        proposedEffects: beforeTurnResult.effects,
        effectResolutions: await resolveWorkflowEffects({
          effects: beforeTurnResult.effects,
          context: pluginContext,
          checkpoint,
          currentTurn: state.turn.currentTurn,
          dispatch,
        }),
      };
    }

    await dispatch(advanceTurn(input.payload ?? {}));
    checkpoint(
      "turnCommitted",
      "Turn committed",
      `${state.turn.currentTurn} -> ${state.turn.currentTurn + 1}`,
      state.turn.currentTurn + 1,
    );

    const legacyMonthlyExpenseObservations: LegacyMonthlyExpenseObservation[] = [];

    if (ctx && lifecycle !== "none") {
      const nextCtx = { ...ctx, currentTurn: ctx.currentTurn + 1 };
      const endTurnResults = await fireEndTurn(nextCtx);
      legacyMonthlyExpenseObservations.push(
        ...endTurnResults
          .map((result) => result.metadata?.legacyMonthlyExpenses)
          .filter(isLegacyMonthlyExpenseObservation),
      );

      if (lifecycle === "jump-start") {
        await fireStartJumpTurn(nextCtx);
      } else {
        await fireStartTurn(nextCtx);
      }
    }
    checkpoint(
      "legacyLifecycleComplete",
      "Legacy lifecycle complete",
      lifecycle,
      state.turn.currentTurn + 1,
    );
    checkpoint("afterTurnAdvance", "After turn advance", undefined, state.turn.currentTurn + 1);

    const afterTurnEvent = {
      source: input.source,
      lifecycle,
      previousTurn: state.turn.currentTurn,
      currentTurn: state.turn.currentTurn + 1,
      metadata: input.metadata,
      ship: ctx?.ship,
      ownerCharacter: ctx?.ownerCharacter,
    } satisfies AdvanceTurnWorkflowPluginEvent;
    const afterTurnResult = await runWorkflowPluginPhase({
      phase: "afterTurnAdvance",
      event: afterTurnEvent,
      context: {
        ...pluginContext,
        currentTurn: state.turn.currentTurn + 1,
      },
      checkpoint,
    });

    const proposedEffects = [
      ...beforeTurnResult.effects,
      ...afterTurnResult.effects,
    ];
    const effectResolutions = await resolveWorkflowEffects({
      effects: proposedEffects,
      context: {
        ...pluginContext,
        currentTurn: state.turn.currentTurn + 1,
      },
      checkpoint,
      currentTurn: state.turn.currentTurn + 1,
      dispatch,
    });
    const legacyMonthlyExpenseActions = await pluginLegacyMonthlyExpenseRecorder(
      legacyMonthlyExpenseObservations,
      {
        ...pluginContext,
        currentTurn: state.turn.currentTurn + 1,
      },
    );
    for (const action of legacyMonthlyExpenseActions) {
      dispatch(action);
    }

    await refreshShipAndCharacters(dispatch);
    checkpoint(
      "refreshComplete",
      "Ship and characters refreshed",
      undefined,
      state.turn.currentTurn + 1,
    );
    checkpoint(
      "workflowComplete",
      "Workflow complete",
      undefined,
      state.turn.currentTurn + 1,
    );

    return {
      source: input.source,
      previousTurn: state.turn.currentTurn,
      currentTurn: state.turn.currentTurn + 1,
      stopped: false,
      proposedEffects,
      effectResolutions,
    };
  },
);
