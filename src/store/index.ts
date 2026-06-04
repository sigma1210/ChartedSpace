import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import characterReducer from "./slices/characterSlice";
import shipReducer from "./slices/shipSlice";
import turnReducer from "./slices/turnSlice";
import availableCrewReducer from "./slices/availableCrewSlice";
import systemReducer from "./slices/systemSlice";

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
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
