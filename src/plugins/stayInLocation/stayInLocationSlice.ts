import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  advanceTurnWorkflow,
  type AdvanceTurnWorkflowDebugCheckpoint,
} from "@/plugin-api/workflows";
import {
  selectStayInLocationBlockBeforeTurnAdvance,
  selectStayInLocationDebugEnabled,
  type StayInLocationPluginRoot,
} from "./selectors";
import { stayInLocationBlockBeforeTurnAdvanceMetadataKey } from "./metadata";

export interface StayInLocationWorkflowDebugRun {
  id: string;
  source: string;
  startedAt: number;
  completedAt: number | null;
  checkpoints: AdvanceTurnWorkflowDebugCheckpoint[];
}

export interface StayInLocationState {
  pressedTurnNumbers: number[];
  lastPressedTurn: number | null;
  debugEnabled: boolean;
  blockBeforeTurnAdvance: boolean;
  activeDebugRunId: string | null;
  debugRuns: StayInLocationWorkflowDebugRun[];
}

export const initialStayInLocationState: StayInLocationState = {
  pressedTurnNumbers: [],
  lastPressedTurn: null,
  debugEnabled: false,
  blockBeforeTurnAdvance: false,
  activeDebugRunId: null,
  debugRuns: [],
};

const maxDebugRuns = 5;

const createWorkflowRunId = () => `stay-in-location:${Date.now()}`;

const stayInLocationSlice = createSlice({
  name: "stayInLocation",
  initialState: initialStayInLocationState,
  reducers: {
    recordStayInLocationTurn(state, action: PayloadAction<number>) {
      state.pressedTurnNumbers.push(action.payload);
      state.lastPressedTurn = action.payload;
    },
    setStayInLocationDebugEnabled(state, action: PayloadAction<boolean>) {
      state.debugEnabled = action.payload;
    },
    setStayInLocationBlockBeforeTurnAdvance(state, action: PayloadAction<boolean>) {
      state.blockBeforeTurnAdvance = action.payload;
    },
    clearStayInLocationDebugRuns(state) {
      state.activeDebugRunId = null;
      state.debugRuns = [];
    },
    recordStayInLocationWorkflowCheckpoint(
      state,
      action: PayloadAction<AdvanceTurnWorkflowDebugCheckpoint>,
    ) {
      const checkpoint = action.payload;
      let run = state.debugRuns.find((candidate) => candidate.id === checkpoint.workflowRunId);
      if (!run) {
        run = {
          id: checkpoint.workflowRunId,
          source: checkpoint.source,
          startedAt: checkpoint.timestamp,
          completedAt: null,
          checkpoints: [],
        };
        state.debugRuns.unshift(run);
        state.debugRuns = state.debugRuns.slice(0, maxDebugRuns);
      }

      run.checkpoints.push(checkpoint);
      run.checkpoints.sort((left, right) => left.sequence - right.sequence);
      state.activeDebugRunId = run.id;

      if (checkpoint.phase === "workflowComplete") {
        run.completedAt = checkpoint.timestamp;
      }
    },
  },
});

export const {
  clearStayInLocationDebugRuns,
  recordStayInLocationTurn,
  recordStayInLocationWorkflowCheckpoint,
  setStayInLocationBlockBeforeTurnAdvance,
  setStayInLocationDebugEnabled,
} = stayInLocationSlice.actions;

export const advanceStayInLocationTurn = createAsyncThunk(
  "stayInLocation/advanceTurn",
  async (_, { dispatch, getState }) => {
    const debugEnabled = selectStayInLocationDebugEnabled(
      getState() as StayInLocationPluginRoot,
    );
    const blockBeforeTurnAdvance = selectStayInLocationBlockBeforeTurnAdvance(
      getState() as StayInLocationPluginRoot,
    );
    const workflowRunId = debugEnabled ? createWorkflowRunId() : null;
    const result = await dispatch(advanceTurnWorkflow({
      source: "plugin.stayInLocation",
      lifecycle: "world",
      metadata: blockBeforeTurnAdvance
        ? {
          [stayInLocationBlockBeforeTurnAdvanceMetadataKey]: true,
        }
        : undefined,
      debug: debugEnabled && workflowRunId
        ? {
          enabled: true,
          checkpointActionType: recordStayInLocationWorkflowCheckpoint.type,
          workflowRunId,
        }
        : undefined,
    })).unwrap();

    if (!result.stopped) {
      dispatch(recordStayInLocationTurn(result.previousTurn));
    }
  },
);

export default stayInLocationSlice.reducer;
