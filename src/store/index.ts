import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import characterReducer from "./slices/characterSlice";
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

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
    galaxy: galaxyReducer,
    characters: characterReducer,
    turn: turnReducer,
    availableCrew: availableCrewReducer,
    system: systemReducer,
    systemScene: systemSceneReducer,
    hud: hudReducer,
    plugins: pluginsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["galaxy/loadSector/fulfilled"],
        ignoredPaths: ["galaxy.sectorData"],
      },
    }),
});

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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
