import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";
import characterReducer from "./slices/characterSlice";
import shipReducer from "./slices/shipSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
    galaxy: galaxyReducer,
    characters: characterReducer,
    ship: shipReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
