import "@/lib/turns/index";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { roll2d6, statDM } from "../../lib/dice";
import type { JumpRangeTarget } from "../../lib/jumpRange";
import {
  fireEndTurn,
  fireStartJumpTurn,
  fireStartTurn,
  type TurnEventContext,
} from "../../lib/turns/handlers";
import type { RootState } from "../index";
import { setTargetWorldHex } from "./galaxySlice";
import { fetchCharacters, invalidateCharacters } from "./characterSlice";
import { fetchShip, invalidateShip } from "./shipSlice";
import { advanceTurn } from "./turnSlice";
import {
  setSceneMode,
  setWarpExitBlankActive,
  setWarpLayerState,
} from "./systemSceneSlice";

const PLOT_TARGETS = [4, 6, 8] as const;
export const JUMP_DESTINATION_STORAGE_KEY = "charted-space:jump-destination";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type PlotStatus = "idle" | "plotting" | "plotted" | "failed";

interface JumpNavigationState {
  selectedDestinationKey: string | null;
  plotStatus: PlotStatus;
  actionBusy: boolean;
  hasStoredJumpDestination: boolean;
  warpExitInProgress: boolean;
  jumpResolveInProgress: boolean;
}

const initialState: JumpNavigationState = {
  selectedDestinationKey: null,
  plotStatus: "idle",
  actionBusy: false,
  hasStoredJumpDestination: false,
  warpExitInProgress: false,
  jumpResolveInProgress: false,
};

const buildTurnContext = (
  state: RootState,
  previousStatus: "docked" | "in_jump",
): TurnEventContext | null => {
  const ship = state.ship.ship;
  if (!ship) return null;

  const ownerCharacterId =
    ship.crew.find((member) => member.isOwnerOperator)?.characterId ?? null;
  const ownerCharacter = ownerCharacterId
    ? state.characters.items.find((character) => character.id === ownerCharacterId) ?? null
    : null;

  return {
    currentTurn: state.turn.currentTurn,
    previousStatus,
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

const runWorldTurnLifecycle = async (
  state: RootState,
  previousStatus: "docked" | "in_jump",
) => {
  const ctx = buildTurnContext(state, previousStatus);
  if (!ctx) return;
  const nextCtx = { ...ctx, currentTurn: ctx.currentTurn + 1 };
  await fireEndTurn(nextCtx);
  await fireStartTurn(nextCtx);
};

const runJumpStartLifecycle = async (state: RootState) => {
  const ctx = buildTurnContext(state, "docked");
  if (!ctx) return;
  const nextCtx = { ...ctx, currentTurn: ctx.currentTurn + 1 };
  await fireEndTurn(nextCtx);
  await fireStartJumpTurn(nextCtx);
};

const selectNavigatorDM = (state: RootState) => {
  const ship = state.ship.ship;
  const navigatorId = ship?.crew.find((member) => member.role === "navigator")?.characterId;
  const navigator = navigatorId
    ? state.characters.items.find((character) => character.id === navigatorId) ?? null
    : null;
  const navSkill = navigator?.skills.find((skill) => skill.name === "Navigation")?.level ?? 0;
  return navSkill + statDM(navigator?.intelligence ?? 7);
};

export const selectJumpDestination = createAsyncThunk(
  "jumpNavigation/selectDestination",
  async (target: JumpRangeTarget, { dispatch }) => {
    dispatch(setTargetWorldHex({ sectorAbbr: target.sectorAbbr, hex: target.hex }));
    return target.key;
  },
);

export const plotJumpCourse = createAsyncThunk(
  "jumpNavigation/plotCourse",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const ship = state.ship.ship;
    if (!state.jumpNavigation.selectedDestinationKey || !ship?.currentWorldId) {
      return false;
    }

    const navDM = selectNavigatorDM(state);
    let plotted = false;

    for (const target of PLOT_TARGETS) {
      const raw = roll2d6();
      const total = raw + navDM;
      await delay(600);
      if (total >= target) {
        plotted = true;
        break;
      }
    }

    if (!plotted) {
      await dispatch(
        advanceTurn({
          shipUpdate: { status: "docked", currentWorldId: ship.currentWorldId },
        }),
      );
      await runWorldTurnLifecycle(state, "docked");
      await refreshShipAndCharacters(dispatch);
    }

    return plotted;
  },
);

export const executePlottedJump = createAsyncThunk(
  "jumpNavigation/executePlottedJump",
  async (target: JumpRangeTarget, { dispatch, getState }) => {
    const state = getState() as RootState;
    const ship = state.ship.ship;
    if (!ship) return;

    localStorage.setItem(
      JUMP_DESTINATION_STORAGE_KEY,
      JSON.stringify({
        sectorAbbr: target.sectorAbbr,
        hex: target.hex,
      }),
    );

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "in_jump",
          destinationWorldHex: target.hex,
          destinationWorldSectorAbbr: target.sectorAbbr,
        },
      }),
    );
    await runJumpStartLifecycle(state);
    await refreshShipAndCharacters(dispatch);
  },
);

export const resolveNormalJump = createAsyncThunk(
  "jumpNavigation/resolveNormalJump",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const destinationWorldId = state.ship.ship?.destinationWorldId;
    if (!destinationWorldId) return false;

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "docked",
          currentWorldId: destinationWorldId,
          destinationWorldHex: "",
          jumpArrivesTurn: null,
        },
      }),
    );
    localStorage.removeItem(JUMP_DESTINATION_STORAGE_KEY);
    await runWorldTurnLifecycle(state, "in_jump");
    await refreshShipAndCharacters(dispatch);
    return true;
  },
);

export const resolveFailedJump = createAsyncThunk(
  "jumpNavigation/resolveFailedJump",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const currentWorldId = state.ship.ship?.currentWorldId;
    if (!currentWorldId) return false;

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "docked",
          currentWorldId,
          destinationWorldHex: "",
          jumpArrivesTurn: null,
        },
      }),
    );
    localStorage.removeItem(JUMP_DESTINATION_STORAGE_KEY);
    await runWorldTurnLifecycle(state, "docked");
    await refreshShipAndCharacters(dispatch);
    return true;
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      return !state.jumpNavigation.jumpResolveInProgress &&
        !state.jumpNavigation.warpExitInProgress;
    },
  },
);

export const initializeJumpNavigationFromStorage = createAsyncThunk(
  "jumpNavigation/initializeFromStorage",
  async () => {
    return typeof window !== "undefined" &&
      !!localStorage.getItem(JUMP_DESTINATION_STORAGE_KEY);
  },
);

export const runWarpExitSequence = createAsyncThunk(
  "jumpNavigation/runWarpExitSequence",
  async (_, { dispatch }) => {
    dispatch(setWarpExitBlankActive(true));
    dispatch(setSceneMode("system"));
    dispatch(setWarpLayerState({
      showWarpLayer: false,
      warpLayerActive: false,
      warpLayerOpacity: 0,
    }));

    try {
      await delay(120);
      await dispatch(resolveNormalJump());
      await delay(240);
    } finally {
      dispatch(setWarpExitBlankActive(false));
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      return !state.jumpNavigation.warpExitInProgress;
    },
  },
);

const jumpNavigationSlice = createSlice({
  name: "jumpNavigation",
  initialState,
  reducers: {
    clearStoredJumpDestination(state) {
      state.hasStoredJumpDestination = false;
    },
    resetJumpNavigation(state) {
      state.selectedDestinationKey = null;
      state.plotStatus = "idle";
      state.actionBusy = false;
      state.warpExitInProgress = false;
      state.jumpResolveInProgress = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(selectJumpDestination.fulfilled, (state, action) => {
        state.selectedDestinationKey = action.payload;
        state.plotStatus = "idle";
      })
      .addCase(plotJumpCourse.pending, (state) => {
        state.plotStatus = "plotting";
      })
      .addCase(plotJumpCourse.fulfilled, (state, action) => {
        state.plotStatus = action.payload ? "plotted" : "failed";
      })
      .addCase(plotJumpCourse.rejected, (state) => {
        state.plotStatus = "failed";
      })
      .addCase(executePlottedJump.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(executePlottedJump.fulfilled, (state) => {
        state.actionBusy = false;
        state.hasStoredJumpDestination = true;
      })
      .addCase(executePlottedJump.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(resolveNormalJump.pending, (state) => {
        state.jumpResolveInProgress = true;
      })
      .addCase(resolveNormalJump.fulfilled, (state) => {
        state.selectedDestinationKey = null;
        state.plotStatus = "idle";
        state.actionBusy = false;
        state.hasStoredJumpDestination = false;
        state.jumpResolveInProgress = false;
      })
      .addCase(resolveNormalJump.rejected, (state) => {
        state.jumpResolveInProgress = false;
      })
      .addCase(resolveFailedJump.pending, (state) => {
        state.jumpResolveInProgress = true;
      })
      .addCase(resolveFailedJump.fulfilled, (state) => {
        state.selectedDestinationKey = null;
        state.plotStatus = "idle";
        state.actionBusy = false;
        state.hasStoredJumpDestination = false;
        state.jumpResolveInProgress = false;
      })
      .addCase(resolveFailedJump.rejected, (state) => {
        state.jumpResolveInProgress = false;
      })
      .addCase(initializeJumpNavigationFromStorage.fulfilled, (state, action) => {
        state.hasStoredJumpDestination = action.payload;
      })
      .addCase(runWarpExitSequence.pending, (state) => {
        state.warpExitInProgress = true;
      })
      .addCase(runWarpExitSequence.fulfilled, (state) => {
        state.warpExitInProgress = false;
      })
      .addCase(runWarpExitSequence.rejected, (state) => {
        state.warpExitInProgress = false;
      });
  },
});

export const {
  clearStoredJumpDestination,
  resetJumpNavigation,
} = jumpNavigationSlice.actions;

export default jumpNavigationSlice.reducer;
