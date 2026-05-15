import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Notification, NotificationsState, NotificationType } from "../../types";

const initialState: NotificationsState = {
  items: [],
};

let nextId = 1;

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addNotification(
      state,
      action: PayloadAction<{ type: NotificationType; message: string }>
    ) {
      state.items.push({
        id: String(nextId++),
        type: action.payload.type,
        message: action.payload.message,
        timestamp: Date.now(),
      });
    },
    dismissNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications(state) {
      state.items = [];
    },
  },
});

export const { addNotification, dismissNotification, clearAllNotifications } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;
