import { combineReducers, configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import turnReducer from "./slices/turnSlice";
import availableCrewReducer from "./slices/availableCrewSlice";
import systemReducer from "./slices/systemSlice";
import systemSceneReducer from "./slices/systemSceneSlice";
import hudReducer, { hydrateHudLayouts } from "./slices/hudSlice";
import { pluginsReducer } from "../plugins/registry";
import { installPluginWorkflowHandlers } from "../plugins/workflowHandlerRegistration";
import {
  loadStoredHudLayouts,
  saveStoredHudLayouts,
} from "./hudLayoutStorage";

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
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
