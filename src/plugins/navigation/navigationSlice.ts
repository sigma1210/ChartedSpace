import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { buildJumpRangeCells, type JumpRangeCell } from "@/lib/jumpRange";
import {
  advanceTurnWorkflow,
  executeJumpWorkflow,
  type JumpDriveOutcome,
  type JumpExecutionDestination,
} from "@/plugin-api/workflows";
import { selectShipLocation } from "@/plugins/ship";
import type { RootState } from "@/store";

export interface NavigationSnapshotOrigin {
  worldName: string | null;
  sectorAbbr: string;
  hex: string;
}

export type NavigationSnapshotStatus = "idle" | "loading" | "ready" | "error";
export type NavigationPlotStatus = "idle" | "plotting" | "success" | "failed";
export type NavigationExecuteStatus = "idle" | "executing" | "complete" | "blocked" | "error";
export type NavigationReplotStatus = "idle" | "advancing" | "blocked" | "complete" | "error";

export interface NavigationPlotResult {
  success: boolean;
  roll: number;
  target: number;
}

export interface NavigationPlottedRoute {
  destinationKey: string;
  sectorAbbr: string;
  hex: string;
  worldName: string | null;
  jumpDistance: number;
  fuelCostEstimate: number;
}

export interface NavigationJumpExecutionRequest {
  destination: {
    sectorAbbr: string;
    hex: string;
  };
  jumpDistance: number;
  fuelCostEstimate: number;
  plotCheck: {
    roll: number;
    target: number;
  };
}

export interface NavigationExecutionResult {
  stopped: boolean;
  stoppedReason?: string;
  driveOutcome: JumpDriveOutcome | null;
  finalLocation: JumpExecutionDestination | null;
  fuelCostEstimate: number;
}

export interface NavigationState {
  selectedDestinationKey: string | null;
  plotStatus: NavigationPlotStatus;
  plotDestinationKey: string | null;
  plotResult: NavigationPlotResult | null;
  plottedRoute: NavigationPlottedRoute | null;
  executeStatus: NavigationExecuteStatus;
  executeError: string | null;
  executeResult: NavigationExecutionResult | null;
  replotStatus: NavigationReplotStatus;
  replotError: string | null;
  lastReplotTurn: number | null;
  snapshotStatus: NavigationSnapshotStatus;
  snapshotError: string | null;
  snapshotOrigin: NavigationSnapshotOrigin | null;
  snapshotMaxJumpRating: number;
  snapshotCells: JumpRangeCell[];
}

export const initialNavigationState: NavigationState = {
  selectedDestinationKey: null,
  plotStatus: "idle",
  plotDestinationKey: null,
  plotResult: null,
  plottedRoute: null,
  executeStatus: "idle",
  executeError: null,
  executeResult: null,
  replotStatus: "idle",
  replotError: null,
  lastReplotTurn: null,
  snapshotStatus: "idle",
  snapshotError: null,
  snapshotOrigin: null,
  snapshotMaxJumpRating: 6,
  snapshotCells: [],
};

const navigationSnapshotOriginFromState = (state: RootState): NavigationSnapshotOrigin | null => {
  const location = selectShipLocation(state);
  if (!location?.sectorAbbr || !location.hex) return null;

  return {
    worldName:  location.worldName,
    sectorAbbr: location.sectorAbbr,
    hex:        location.hex,
  };
};

const sameNavigationOrigin = (
  left: NavigationSnapshotOrigin | null,
  right: NavigationSnapshotOrigin | null,
) =>
  !!left &&
  !!right &&
  left.sectorAbbr === right.sectorAbbr &&
  left.hex === right.hex;

export const hydrateNavigationSnapshot = createAsyncThunk<
  {
    origin: NavigationSnapshotOrigin;
    cells: JumpRangeCell[];
  },
  void,
  { state: RootState; rejectValue: string }
>(
  "navigation/hydrateSnapshot",
  async (_, { getState, rejectWithValue }) => {
    const state = getState();
    const origin = navigationSnapshotOriginFromState(state);
    if (!origin) return rejectWithValue("Ship location unavailable");

    const cells = buildJumpRangeCells({
      shipHex: origin.hex,
      shipSectorAbbr: origin.sectorAbbr,
      jumpRating: 6,
      allSectors: state.galaxy.sectors,
      sectorData: state.galaxy.sectorData,
    });

    return {
      origin,
      cells,
    };
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const origin = navigationSnapshotOriginFromState(state);
      if (!origin) return true;

      const navigationState = state.plugins.navigation;
      if (navigationState.snapshotStatus === "loading") return false;
      if (navigationState.snapshotStatus === "idle") return true;
      if (!sameNavigationOrigin(navigationState.snapshotOrigin, origin)) return true;

      // Same origin: allow re-run if sector data is now loaded but snapshot found no worlds
      // (happens when fetchShip resolves before preloadGalaxySectors completes)
      const sectorLoaded = state.galaxy.loadingStatus[origin.sectorAbbr] === "loaded";
      const hasWorldData = navigationState.snapshotCells.some((c) => c.world !== null);
      return sectorLoaded && !hasWorldData;
    },
  },
);

export const replotNavigationDestination = createAsyncThunk<
  {
    targetKey: string;
    previousTurn: number;
    currentTurn: number;
    stopped: boolean;
    stoppedReason?: string;
  },
  string,
  { state: RootState; rejectValue: string }
>(
  "navigation/replotDestination",
  async (targetKey, { dispatch, rejectWithValue }) => {
    const result = await dispatch(advanceTurnWorkflow({
      source: "plugin.navigation.replot",
      lifecycle: "world",
      metadata: {
        targetKey,
      },
    })).unwrap();

    if (result.stopped) {
      return {
        targetKey,
        previousTurn: result.previousTurn,
        currentTurn: result.currentTurn,
        stopped: true,
        stoppedReason: result.stoppedReason,
      };
    }

    if (result.currentTurn === result.previousTurn) {
      return rejectWithValue("Replot did not advance time");
    }

    return {
      targetKey,
      previousTurn: result.previousTurn,
      currentTurn: result.currentTurn,
      stopped: false,
    };
  },
  {
    condition: (targetKey, { getState }) => {
      const navigationState = (getState() as RootState).plugins.navigation;
      const completedFailedPlot = navigationState.plotStatus === "failed";
      const completedSuccessfulDifferentPlot =
        navigationState.plotStatus === "success" &&
        !!navigationState.plottedRoute &&
        navigationState.plottedRoute.destinationKey !== targetKey;

      return (
        navigationState.replotStatus !== "advancing" &&
        (completedFailedPlot || completedSuccessfulDifferentPlot)
      );
    },
  },
);

const clearPlotState = (state: NavigationState) => {
  state.plotStatus = "idle";
  state.plotDestinationKey = null;
  state.plotResult = null;
  state.plottedRoute = null;
  state.executeStatus = "idle";
  state.executeError = null;
  state.executeResult = null;
};

export const executeNavigationJump = createAsyncThunk<
  NavigationExecutionResult,
  void,
  { state: RootState; rejectValue: string }
>(
  "navigation/executeJump",
  async (_, { dispatch, getState, rejectWithValue }) => {
    const navigationState = getState().plugins.navigation;
    const route = navigationState.plottedRoute;
    const plotResult = navigationState.plotResult;

    if (
      navigationState.plotStatus !== "success" ||
      !route ||
      !plotResult?.success ||
      navigationState.selectedDestinationKey !== route.destinationKey
    ) {
      return rejectWithValue("No plotted navigation route is ready to execute");
    }

    const result = await dispatch(executeJumpWorkflow({
      source: "plugin.navigation.execute",
      destination: {
        sectorAbbr: route.sectorAbbr,
        hex: route.hex,
      },
      jumpDistance: route.jumpDistance,
      fuelCostEstimate: route.fuelCostEstimate,
      plotCheck: {
        roll: plotResult.roll,
        target: plotResult.target,
      },
    })).unwrap();

    return {
      stopped: result.stopped,
      stoppedReason: result.stoppedReason,
      driveOutcome: result.driveCheck?.outcome ?? null,
      finalLocation: result.finalLocation,
      fuelCostEstimate: result.fuelCostEstimate,
    };
  },
  {
    condition: (_, { getState }) => {
      const navigationState = (getState() as RootState).plugins.navigation;
      return navigationState.executeStatus !== "executing";
    },
  },
);

const navigationSlice = createSlice({
  name: "navigation",
  initialState: initialNavigationState,
  reducers: {
    clearNavigationSnapshot(state) {
      state.snapshotStatus = "idle";
      state.snapshotError = null;
      state.snapshotOrigin = null;
      state.snapshotCells = [];
      state.selectedDestinationKey = null;
      state.replotStatus = "idle";
      state.replotError = null;
      clearPlotState(state);
    },
    clearNavigationSelection(state) {
      state.selectedDestinationKey = null;
      state.replotStatus = "idle";
      state.replotError = null;
      clearPlotState(state);
    },
    selectNavigationDestination(state, action: PayloadAction<string>) {
      state.selectedDestinationKey = action.payload;
      state.replotStatus = "idle";
      state.replotError = null;
      clearPlotState(state);
    },
    startNavigationPlot(state, action: PayloadAction<string>) {
      state.plotStatus = "plotting";
      state.plotDestinationKey = action.payload;
      state.plotResult = null;
      state.plottedRoute = null;
      state.executeStatus = "idle";
      state.executeError = null;
      state.executeResult = null;
      state.replotStatus = "idle";
      state.replotError = null;
    },
    resolveNavigationPlot(
      state,
      action: PayloadAction<{
        result: NavigationPlotResult;
        route: NavigationPlottedRoute | null;
      }>,
    ) {
      state.plotStatus = action.payload.result.success ? "success" : "failed";
      state.plotResult = action.payload.result;
      state.plottedRoute = action.payload.result.success ? action.payload.route : null;
      state.executeStatus = "idle";
      state.executeError = null;
      state.executeResult = null;
      state.replotStatus = "idle";
      state.replotError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateNavigationSnapshot.pending, (state) => {
        state.snapshotStatus = "loading";
        state.snapshotError = null;
      })
      .addCase(hydrateNavigationSnapshot.fulfilled, (state, action) => {
        state.snapshotStatus = "ready";
        state.snapshotError = null;
        state.snapshotOrigin = action.payload.origin;
        state.snapshotMaxJumpRating = 6;
        state.snapshotCells = action.payload.cells;
        state.replotStatus = "idle";
        state.replotError = null;
        clearPlotState(state);
      })
      .addCase(hydrateNavigationSnapshot.rejected, (state, action) => {
        state.snapshotStatus = "error";
        state.snapshotError = action.payload ?? action.error.message ?? "Navigation snapshot unavailable";
        state.snapshotOrigin = null;
        state.snapshotCells = [];
        state.replotStatus = "idle";
        state.replotError = null;
        clearPlotState(state);
      })
      .addCase(replotNavigationDestination.pending, (state) => {
        state.replotStatus = "advancing";
        state.replotError = null;
      })
      .addCase(replotNavigationDestination.fulfilled, (state, action) => {
        if (action.payload.stopped) {
          state.replotStatus = "blocked";
          state.replotError = action.payload.stoppedReason ?? "Replot turn advance blocked";
          return;
        }

        state.selectedDestinationKey = action.payload.targetKey;
        state.replotStatus = "complete";
        state.replotError = null;
        state.lastReplotTurn = action.payload.previousTurn;
        clearPlotState(state);
      })
      .addCase(replotNavigationDestination.rejected, (state, action) => {
        state.replotStatus = "error";
        state.replotError = action.payload ?? action.error.message ?? "Replot failed";
      })
      .addCase(executeNavigationJump.pending, (state) => {
        state.executeStatus = "executing";
        state.executeError = null;
        state.executeResult = null;
      })
      .addCase(executeNavigationJump.fulfilled, (state, action) => {
        clearPlotState(state);
        state.executeStatus = action.payload.stopped ? "blocked" : "complete";
        state.executeError = action.payload.stoppedReason ?? null;
        state.executeResult = action.payload;
      })
      .addCase(executeNavigationJump.rejected, (state, action) => {
        clearPlotState(state);
        state.executeStatus = "error";
        state.executeError = action.payload ?? action.error.message ?? "Jump execution failed";
      });
  },
});

export const {
  clearNavigationSnapshot,
  clearNavigationSelection,
  resolveNavigationPlot,
  selectNavigationDestination,
  startNavigationPlot,
} = navigationSlice.actions;

export default navigationSlice.reducer;
