import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "./slices/uiSlice";
import notificationsReducer from "./slices/notificationsSlice";
import galaxyReducer from "./slices/galaxySlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    notifications: notificationsReducer,
    galaxy: galaxyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
