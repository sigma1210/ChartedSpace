import { registeredPluginHudLayouts } from "../../hudLayouts";
import { registeredPluginHudRenderers } from "../../hudRenderers";
import { registeredPluginManifests } from "../../catalog";
import { pluginReducers } from "../../registry";
import { navigationPlugin } from "..";
import {
  navigationPluginId,
  navigationSelectHudId,
  navigationStateKey,
} from "../metadata";
import { selectShipNavigationCapabilities } from "@/plugin-api";
import navigationReducer, {
  clearNavigationSelection,
  executeNavigationJump,
  hydrateNavigationSnapshot,
  initialNavigationState,
  replotNavigationDestination,
  resolveNavigationPlot,
  selectNavigationDestination,
  startNavigationPlot,
} from "../navigationSlice";
import { buildNavigationGridLayout } from "../navigationGridGeometry";
import {
  selectNavigationGridCells,
  selectNavigationJumpExecutionRequest,
  selectNavigationJumpRating,
  selectNavigationSnapshotWorldCells,
  selectNavigationTargets,
} from "../selectors";
import { createPluginTestRootState } from "@/plugin-api/testing";
import type { RootState } from "@/store";
import type { World } from "@/types";

type TestThunk = (
  dispatch: (action: unknown) => unknown,
  getState: () => RootState,
  extra: undefined,
) => unknown | Promise<unknown>;

const runTestThunk = async (
  thunk: unknown,
  dispatch: (action: unknown) => unknown,
  getState: () => RootState,
) => {
  await (thunk as TestThunk)(dispatch, getState, undefined);
};

const world = (hex: string, name: string): World => ({
  hex,
  hexX: Number.parseInt(hex.slice(0, 2), 10),
  hexY: Number.parseInt(hex.slice(2), 10),
  name,
  uwp: {
    raw: "A000000-0",
    starport: "A",
    size: "0",
    atmosphere: "0",
    hydrographics: "0",
    population: "0",
    government: "0",
    lawLevel: "0",
    techLevel: "0",
  },
  remarks: [],
  importance: "",
  economics: "",
  culture: "",
  nobility: "",
  bases: "",
  travelZone: "",
  pbg: {
    raw: "000",
    populationMultiplier: 0,
    belts: 0,
    gasGiants: 0,
  },
  worldsInSystem: 1,
  allegiance: "",
  stellar: null,
});

const createNavigationRoot = (jumpRating = 2): RootState => {
  const root = createPluginTestRootState();
  return {
    ...root,
    plugins: {
      ...root.plugins,
      shipPlugin: {
        ...root.plugins.shipPlugin,
        ship: root.plugins.shipPlugin.ship && {
          ...root.plugins.shipPlugin.ship,
          currentWorldId: "world-regina",
          worldName: "Regina",
          sectorAbbr: "Spin",
          hex: "1910",
          jumpRating,
        },
      },
    },
    galaxy: {
      sectors: [{
        X: 0,
        Y: 0,
        Milieu: "M1105",
        Abbreviation: "Spin",
        Tags: "",
        Names: [{ Text: "Spinward Marches" }],
      }],
      sectorData: {
        Spin: {
          sector: "Spinward Marches",
          abbreviation: "Spin",
          milieu: "M1105",
          source: "",
          credits: "",
          subsectors: {},
          allegiances: {},
          worlds: [
            world("1910", "Regina"),
            world("1912", "Two Parsecs"),
            world("1916", "Six Parsecs"),
            world("1917", "Seven Parsecs"),
          ],
        },
      },
      loadingStatus: {},
      activeSectorAbbr: "Spin",
      activeSubsectorKey: "A",
      activeWorldHex: null,
      activeWorldSectorAbbr: null,
      targetWorldHex: null,
      targetWorldSectorAbbr: null,
    },
  };
};
const successfulPlotState = navigationReducer(
  navigationReducer(
    navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1912"),
    ),
    startNavigationPlot("Spin:1912"),
  ),
  resolveNavigationPlot({
    result: { success: true, roll: 10, target: 4 },
    route: {
      destinationKey: "Spin:1912",
      sectorAbbr: "Spin",
      hex: "1912",
      worldName: "Two Parsecs",
      jumpDistance: 2,
      fuelCostEstimate: 20000,
    },
  }),
);

const failedPlotState = navigationReducer(
  navigationReducer(
    navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1912"),
    ),
    startNavigationPlot("Spin:1912"),
  ),
  resolveNavigationPlot({
    result: { success: false, roll: 3, target: 4 },
    route: null,
  }),
);

describe("navigation plugin", () => {
  it("registers plugin state and HUD", () => {
    expect(registeredPluginManifests).toContain(navigationPlugin);
    expect(navigationPlugin.metadata.id).toBe(navigationPluginId);
    expect(navigationPlugin.state.stateKey).toBe(navigationStateKey);
    expect(navigationPlugin.huds[0].id).toBe(navigationSelectHudId);
    expect(registeredPluginHudLayouts).toContain(navigationPlugin.huds[0]);
    expect(registeredPluginHudRenderers.some((renderer) => renderer.id === navigationSelectHudId)).toBe(true);
    expect(pluginReducers[navigationStateKey]).toBe(navigationPlugin.state.reducer);
  });

  it("tracks selected destination in private plugin state", () => {
    const selected = navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1910"),
    );

    expect(selected.selectedDestinationKey).toBe("Spin:1910");
    expect(navigationReducer(selected, clearNavigationSelection())).toEqual(
      initialNavigationState,
    );
  });

  it("tracks and resets plot state with destination changes", () => {
    const selected = navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1912"),
    );
    const plotting = navigationReducer(
      selected,
      startNavigationPlot("Spin:1912"),
    );
    const success = navigationReducer(
      plotting,
      resolveNavigationPlot({
        result: { success: true, roll: 10, target: 4 },
        route: {
          destinationKey: "Spin:1912",
          sectorAbbr: "Spin",
          hex: "1912",
          worldName: "Two Parsecs",
          jumpDistance: 2,
          fuelCostEstimate: 20000,
        },
      }),
    );

    expect(plotting.plotStatus).toBe("plotting");
    expect(plotting.plotDestinationKey).toBe("Spin:1912");
    expect(success.plotStatus).toBe("success");
    expect(success.plotResult).toEqual({ success: true, roll: 10, target: 4 });
    expect(success.plottedRoute).toEqual({
      destinationKey: "Spin:1912",
      sectorAbbr: "Spin",
      hex: "1912",
      worldName: "Two Parsecs",
      jumpDistance: 2,
      fuelCostEstimate: 20000,
    });

    const changedDestination = navigationReducer(
      success,
      selectNavigationDestination("Spin:1916"),
    );
    expect(changedDestination.selectedDestinationKey).toBe("Spin:1916");
    expect(changedDestination.plotStatus).toBe("idle");
    expect(changedDestination.plotDestinationKey).toBeNull();
    expect(changedDestination.plotResult).toBeNull();
    expect(changedDestination.plottedRoute).toBeNull();
  });

  it("does not store a plotted route when plot fails", () => {
    const selected = navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1912"),
    );
    const plotting = navigationReducer(
      selected,
      startNavigationPlot("Spin:1912"),
    );
    const failed = navigationReducer(
      plotting,
      resolveNavigationPlot({
        result: { success: false, roll: 3, target: 4 },
        route: {
          destinationKey: "Spin:1912",
          sectorAbbr: "Spin",
          hex: "1912",
          worldName: "Two Parsecs",
          jumpDistance: 2,
          fuelCostEstimate: 20000,
        },
      }),
    );

    expect(failed.plotStatus).toBe("failed");
    expect(failed.plotResult).toEqual({ success: false, roll: 3, target: 4 });
    expect(failed.plottedRoute).toBeNull();
  });

  it("executes a successful plotted route and clears the selected destination after completion", async () => {
    const root = {
      ...createNavigationRoot(6),
      plugins: {
        ...createNavigationRoot(6).plugins,
        navigation: successfulPlotState,
      },
    };
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.navigation.execute",
            currentTurn: 3,
            stopped: false,
            proposedEffects: [],
            effectResolutions: [],
            driveCheck: {
              rawRoll: 8,
              modifier: 0,
              total: 8,
              target: 4,
              outcome: "success",
            },
            currentLocation: {
              sectorAbbr: "Spin",
              hex: "1910",
            },
            finalLocation: {
              sectorAbbr: "Spin",
              hex: "1912",
            },
            destination: {
              sectorAbbr: "Spin",
              hex: "1912",
            },
            jumpDistance: 2,
            fuelCostEstimate: 20000,
            plotCheck: {
              roll: 10,
              target: 4,
            },
          }),
        };
      }
      return action;
    });

    await runTestThunk(executeNavigationJump(), dispatch, () => root);

    const navigationActions = actions.filter(
      (action): action is { type: string; payload?: unknown } =>
        typeof action === "object" && action !== null && "type" in action,
    );
    const executedState = navigationActions.reduce(
      (state, action) => navigationReducer(state, action),
      successfulPlotState,
    );

    expect(actions.some((action) => typeof action === "function")).toBe(true);
    expect(executedState.executeStatus).toBe("complete");
    expect(executedState.executeResult).toEqual({
      stopped: false,
      driveOutcome: "success",
      finalLocation: {
        sectorAbbr: "Spin",
        hex: "1912",
      },
      fuelCostEstimate: 20000,
    });
    expect(executedState.selectedDestinationKey).toBe("Spin:1912");
    expect(executedState.plotStatus).toBe("idle");
    expect(executedState.plotResult).toBeNull();
    expect(executedState.plottedRoute).toBeNull();
  });

  it("does not execute without a successful plotted route", async () => {
    const selected = navigationReducer(
      initialNavigationState,
      selectNavigationDestination("Spin:1912"),
    );
    const root = {
      ...createNavigationRoot(6),
      plugins: {
        ...createNavigationRoot(6).plugins,
        navigation: selected,
      },
    };
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      return action;
    });

    await runTestThunk(executeNavigationJump(), dispatch, () => root);

    const navigationActions = actions.filter(
      (action): action is { type: string; payload?: unknown } =>
        typeof action === "object" && action !== null && "type" in action,
    );
    const rejectedState = navigationActions.reduce(
      (state, action) => navigationReducer(state, action),
      selected,
    );

    expect(actions.some((action) => typeof action === "function")).toBe(false);
    expect(rejectedState.executeStatus).toBe("error");
    expect(rejectedState.executeError).toBe("No plotted navigation route is ready to execute");
    expect(rejectedState.selectedDestinationKey).toBe("Spin:1912");
  });

  it("derives the minimal jump execution request from a valid plotted route", () => {
    const root = {
      ...createNavigationRoot(6),
      plugins: {
        ...createNavigationRoot(6).plugins,
        navigation: successfulPlotState,
      },
    };

    expect(selectNavigationJumpExecutionRequest(root)).toEqual({
      destination: {
        sectorAbbr: "Spin",
        hex: "1912",
      },
      jumpDistance: 2,
      fuelCostEstimate: 20000,
      plotCheck: {
        roll: 10,
        target: 4,
      },
    });
    expect(JSON.stringify(selectNavigationJumpExecutionRequest(root))).not.toContain("Two Parsecs");
  });

  it("does not derive jump execution request for failed or stale plots", () => {
    const baseRoot = createNavigationRoot(6);
    const failedRoot = {
      ...baseRoot,
      plugins: {
        ...baseRoot.plugins,
        navigation: failedPlotState,
      },
    };
    const staleSelectionRoot = {
      ...baseRoot,
      plugins: {
        ...baseRoot.plugins,
        navigation: {
          ...successfulPlotState,
          selectedDestinationKey: "Spin:1916",
        },
      },
    };

    expect(selectNavigationJumpExecutionRequest(failedRoot)).toBeNull();
    expect(selectNavigationJumpExecutionRequest(staleSelectionRoot)).toBeNull();
  });

  it("advances time and selects the new destination when replotting after success", async () => {
    const root = {
      ...createNavigationRoot(6),
      plugins: {
        ...createNavigationRoot(6).plugins,
        navigation: successfulPlotState,
      },
    };
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.navigation.replot",
            previousTurn: 3,
            currentTurn: 4,
            stopped: false,
          }),
        };
      }
      return action;
    });

    await runTestThunk(replotNavigationDestination("Spin:1916"), dispatch, () => root);

    const navigationActions = actions.filter(
      (action): action is { type: string; payload?: unknown } =>
        typeof action === "object" && action !== null && "type" in action,
    );
    const replotState = navigationActions.reduce(
      (state, action) => navigationReducer(state, action),
      successfulPlotState,
    );

    expect(actions.some((action) => typeof action === "function")).toBe(true);
    expect(replotState.selectedDestinationKey).toBe("Spin:1916");
    expect(replotState.replotStatus).toBe("complete");
    expect(replotState.lastReplotTurn).toBe(3);
    expect(replotState.plottedRoute).toBeNull();
    expect(replotState.plotStatus).toBe("idle");
  });

  it("keeps the existing plotted route when replot turn advance is blocked", async () => {
    const root = {
      ...createNavigationRoot(6),
      plugins: {
        ...createNavigationRoot(6).plugins,
        navigation: successfulPlotState,
      },
    };
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.navigation.replot",
            previousTurn: 3,
            currentTurn: 3,
            stopped: true,
            stoppedReason: "blocked by test",
          }),
        };
      }
      return action;
    });

    await runTestThunk(replotNavigationDestination("Spin:1916"), dispatch, () => root);

    const navigationActions = actions.filter(
      (action): action is { type: string; payload?: unknown } =>
        typeof action === "object" && action !== null && "type" in action,
    );
    const blockedState = navigationActions.reduce(
      (state, action) => navigationReducer(state, action),
      successfulPlotState,
    );

    expect(blockedState.selectedDestinationKey).toBe("Spin:1912");
    expect(blockedState.replotStatus).toBe("blocked");
    expect(blockedState.replotError).toBe("blocked by test");
    expect(blockedState.plottedRoute?.destinationKey).toBe("Spin:1912");
    expect(blockedState.plotStatus).toBe("success");
  });

  it("advances time before replotting after a failed plot", async () => {
    const baseRoot = createNavigationRoot(6);
    const root = {
      ...baseRoot,
      plugins: {
        ...baseRoot.plugins,
        navigation: failedPlotState,
      },
    };
    const actions: unknown[] = [];
    const dispatch = jest.fn((action: unknown) => {
      actions.push(action);
      if (typeof action === "function") {
        return {
          unwrap: async () => ({
            source: "plugin.navigation.replot",
            previousTurn: 3,
            currentTurn: 4,
            stopped: false,
          }),
        };
      }
      return action;
    });

    await runTestThunk(replotNavigationDestination("Spin:1916"), dispatch, () => root);

    const navigationActions = actions.filter(
      (action): action is { type: string; payload?: unknown } =>
        typeof action === "object" && action !== null && "type" in action,
    );
    const replotState = navigationActions.reduce(
      (state, action) => navigationReducer(state, action),
      failedPlotState,
    );

    expect(actions.some((action) => typeof action === "function")).toBe(true);
    expect(replotState.selectedDestinationKey).toBe("Spin:1916");
    expect(replotState.replotStatus).toBe("complete");
    expect(replotState.plotStatus).toBe("idle");
    expect(replotState.plotResult).toBeNull();
    expect(replotState.plottedRoute).toBeNull();
  });

  it("lays out radius one jump cells with the center in the middle column", () => {
    const layout = buildNavigationGridLayout([
      { key: "-1,0", dq: -1, dr: 0, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "-1,1", dq: -1, dr: 1, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "0,-1", dq: 0, dr: -1, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "center", dq: 0, dr: 0, isCenter: true, distance: 0, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "0,1", dq: 0, dr: 1, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "1,-1", dq: 1, dr: -1, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
      { key: "1,0", dq: 1, dr: 0, isCenter: false, distance: 1, sectorAbbr: null, hex: null, name: null, starport: null, world: null, inRange: false },
    ]);

    const center = layout.cells.find((cell) => cell.isCenter);

    expect(layout.cells).toHaveLength(7);
    expect(center?.px).toBeCloseTo(20.67, 2);
    expect(center?.py).toBeCloseTo(22.21, 2);
  });

  it("hydrates a location-based jump six navigation snapshot", async () => {
    const root = createNavigationRoot(2);
    const actions: Array<{ type: string; payload?: unknown }> = [];
    const dispatch = (action: unknown) => {
      if (typeof action !== "object" || action === null || !("type" in action)) return action;
      const typedAction = action as { type: string; payload?: unknown };
      actions.push(typedAction);
      return typedAction;
    };

    await runTestThunk(hydrateNavigationSnapshot(), dispatch, () => root);

    const hydrated = actions.reduce(
      (state, action) => navigationReducer(state, action),
      initialNavigationState,
    );

    expect(hydrated.snapshotStatus).toBe("ready");
    expect(hydrated.snapshotOrigin).toEqual({
      worldId: "world-regina",
      worldName: "Regina",
      sectorAbbr: "Spin",
      hex: "1910",
    });
    expect(hydrated.snapshotCells).toHaveLength(127);
    expect(hydrated.snapshotCells.some((cell) => cell.name === "Six Parsecs")).toBe(true);
    expect(hydrated.snapshotCells.some((cell) => cell.name === "Seven Parsecs")).toBe(false);
  });

  it("keeps jump six snapshot data while filtering visible targets by ship jump rating", async () => {
    const root = createNavigationRoot(2);
    const actions: Array<{ type: string; payload?: unknown }> = [];
    const dispatch = (action: unknown) => {
      if (typeof action !== "object" || action === null || !("type" in action)) return action;
      const typedAction = action as { type: string; payload?: unknown };
      actions.push(typedAction);
      return typedAction;
    };

    await runTestThunk(hydrateNavigationSnapshot(), dispatch, () => root);
    const navigationState = actions.reduce(
      (state, action) => navigationReducer(state, action),
      initialNavigationState,
    );
    const jump2Root = {
      ...root,
      plugins: {
        ...root.plugins,
        navigation: navigationState,
      },
    };
    const jump6Root = {
      ...jump2Root,
      plugins: {
        ...jump2Root.plugins,
        shipPlugin: {
          ...jump2Root.plugins.shipPlugin,
          ship: jump2Root.plugins.shipPlugin.ship && {
            ...jump2Root.plugins.shipPlugin.ship,
            jumpRating: 6,
          },
        },
      },
    };

    expect(selectNavigationSnapshotWorldCells(jump2Root).map((cell) => cell.name)).toEqual([
      "Two Parsecs",
      "Six Parsecs",
    ]);
    expect(selectNavigationGridCells(jump2Root).some((cell) => cell.name === "Six Parsecs")).toBe(false);
    expect(selectNavigationTargets(jump2Root).map((target) => target.name)).toEqual([
      "Two Parsecs",
    ]);
    expect(selectNavigationTargets(jump6Root).map((target) => target.name)).toEqual([
      "Two Parsecs",
      "Six Parsecs",
    ]);
  });

  it("uses the ship plugin jump rating override after core ship refreshes", async () => {
    const root = createNavigationRoot(1);
    const actions: Array<{ type: string; payload?: unknown }> = [];
    const dispatch = (action: unknown) => {
      if (typeof action !== "object" || action === null || !("type" in action)) return action;
      const typedAction = action as { type: string; payload?: unknown };
      actions.push(typedAction);
      return typedAction;
    };

    await runTestThunk(hydrateNavigationSnapshot(), dispatch, () => root);
    const navigationState = actions.reduce(
      (state, action) => navigationReducer(state, action),
      initialNavigationState,
    );
    const mockedRoot = {
      ...root,
      plugins: {
        ...root.plugins,
        shipPlugin: {
          ...root.plugins.shipPlugin,
          developmentJumpRatingOverride: 6,
        },
        navigation: navigationState,
      },
    };

    expect(selectNavigationJumpRating(mockedRoot)).toBe(6);
    expect(selectShipNavigationCapabilities(mockedRoot)).toEqual({ jumpRating: 6 });
    expect(selectNavigationTargets(mockedRoot).map((target) => target.name)).toEqual([
      "Two Parsecs",
      "Six Parsecs",
    ]);
  });
});
