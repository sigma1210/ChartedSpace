import { combineReducers, configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import turnReducer from "./slices/turnSlice";
import availableCrewReducer from "./slices/availableCrewSlice";
import systemReducer from "./slices/systemSlice";
import systemSceneReducer from "./slices/systemSceneSlice";
import hudReducer, { hydrateHudLayouts } from "./slices/hudSlice";
import tacticalEditorReducer from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import { pluginsReducer } from "../plugins/registry";
import { installPluginWorkflowHandlers } from "../plugins/workflowHandlerRegistration";
import {
  loadStoredHudLayouts,
  saveStoredHudLayouts,
} from "./hudLayoutStorage";
import {
  saveTacticalEditorHudLayout,
  tacticalEditorHudIds,
} from "@/plugins/characterCombat/editor/state/hudLayouts";

installPluginWorkflowHandlers();

export const rootReducer = combineReducers({
  ui: uiReducer,
  notifications: notificationsReducer,
  galaxy: galaxyReducer,
  turn: turnReducer,
  availableCrew: availableCrewReducer,
  system: systemReducer,
  systemScene: systemSceneReducer,
  hud: hudReducer,
  tacticalEditor: tacticalEditorReducer,
  plugins: pluginsReducer,
});

export const createAppStore = (preloadedState?: ReturnType<typeof rootReducer>) => configureStore({
  reducer: rootReducer,
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["galaxy/loadSector/fulfilled"],
        ignoredPaths: ["galaxy.sectorData"],
      },
    }),
});

export const store = createAppStore();

if (typeof window !== "undefined") {
  const storedHudLayouts = loadStoredHudLayouts();
  if (Object.keys(storedHudLayouts).length > 0) {
    store.dispatch(hydrateHudLayouts(storedHudLayouts));
  }
  let previousHudLayouts = store.getState().hud.layouts;
  store.subscribe(() => {
    const nextHudLayouts = store.getState().hud.layouts;
    if (nextHudLayouts === previousHudLayouts) return;
    previousHudLayouts = nextHudLayouts;
    saveStoredHudLayouts(nextHudLayouts);
  });

  let previousTacticalEditorHudLayouts = store.getState().tacticalEditor.hudLayouts;
  store.subscribe(() => {
    const nextLayouts = store.getState().tacticalEditor.hudLayouts;
    if (nextLayouts === previousTacticalEditorHudLayouts) return;
    const previousLayouts = previousTacticalEditorHudLayouts;
    previousTacticalEditorHudLayouts = nextLayouts;
    tacticalEditorHudIds.forEach((id) => {
      if (nextLayouts[id] !== previousLayouts[id]) {
        saveTacticalEditorHudLayout(id, nextLayouts[id]);
      }
    });
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
