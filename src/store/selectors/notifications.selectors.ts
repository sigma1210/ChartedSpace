import type { RootState } from "../index";

export const selectNotifications = (state: RootState) => state.notifications.items;

export const selectNotificationCount = (state: RootState) =>
  state.notifications.items.length;

export const selectHasNotifications = (state: RootState) =>
  state.notifications.items.length > 0;
