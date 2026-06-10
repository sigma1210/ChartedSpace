import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import characterReducer from "./slices/characterSlice";
import shipReducer from "./slices/shipSlice";
import turnReducer from "./slices/turnSlice";
import availableCrewReducer from "./slices/availableCrewSlice";
import systemReducer from "./slices/systemSlice";
import systemSceneReducer from "./slices/systemSceneSlice";
import jumpNavigationReducer from "./slices/jumpNavigationSlice";
import hudReducer from "./slices/hudSlice";
import { pluginsReducer } from "../plugins/registry";
import { installPluginWorkflowHandlers } from "../plugins/workflowHandlerRegistration";

installPluginWorkflowHandlers();

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
    galaxy: galaxyReducer,
    characters: characterReducer,
    ship: shipReducer,
    turn: turnReducer,
    availableCrew: availableCrewReducer,
    system: systemReducer,
    systemScene: systemSceneReducer,
    jumpNavigation: jumpNavigationReducer,
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

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
