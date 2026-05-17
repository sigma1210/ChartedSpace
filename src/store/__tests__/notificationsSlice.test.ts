import notificationsReducer, {
  addNotification,
  dismissNotification,
  clearAllNotifications,
} from "../slices/notificationsSlice";
import {
  selectNotifications,
  selectNotificationCount,
  selectHasNotifications,
} from "../selectors/notifications.selectors";
import type { NotificationsState } from "../../types";
import type { RootState } from "../index";

const initialState: NotificationsState = { items: [] };

const makeRoot = (notifications: NotificationsState): RootState => {
  return {
    ui: {
      activeModal: null,
      mapView: "galaxy",
      activeCharacterId: null,
      activeWorldId: null,
      activeSectorAbbr: null,
      activeSubsector: null,
      activeUserId: null,
      isOwnProfile: false,
      searchFilter: "all",
      searchQuery: "",
      previousModal: null,
    },
    notifications,
    galaxy: { sectors: [], sectorData: {}, loadingStatus: {}, activeSectorAbbr: "Spin", activeSubsectorKey: "A", activeWorldHex: null, activeWorldSectorAbbr: null, targetWorldHex: null, targetWorldSectorAbbr: null },
    characters: { items: [], status: "idle", error: null },
  };
}

describe("notificationsSlice reducers", () => {
  it("returns initial state", () => {
    expect(notificationsReducer(undefined, { type: "@@INIT" })).toEqual(initialState);
  });

  describe("addNotification", () => {
    it("adds an error notification", () => {
      const state = notificationsReducer(
        initialState,
        addNotification({ type: "error", message: "Something failed" })
      );
      expect(state.items).toHaveLength(1);
      expect(state.items[0].type).toBe("error");
      expect(state.items[0].message).toBe("Something failed");
      expect(state.items[0].id).toBeDefined();
      expect(state.items[0].timestamp).toBeDefined();
    });

    it("adds multiple notifications independently", () => {
      let state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "Info message" })
      );
      state = notificationsReducer(
        state,
        addNotification({ type: "warning", message: "Warning message" })
      );
      expect(state.items).toHaveLength(2);
      expect(state.items[0].type).toBe("info");
      expect(state.items[1].type).toBe("warning");
    });

    it("assigns unique ids to each notification", () => {
      let state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "A" })
      );
      state = notificationsReducer(
        state,
        addNotification({ type: "info", message: "B" })
      );
      const [first, second] = state.items;
      expect(first.id).not.toBe(second.id);
    });
  });

  describe("dismissNotification", () => {
    it("removes the notification with the given id", () => {
      const state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "Test" })
      );
      const id = state.items[0].id;
      const next = notificationsReducer(state, dismissNotification(id));
      expect(next.items).toHaveLength(0);
    });

    it("does not affect other notifications", () => {
      let state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "A" })
      );
      state = notificationsReducer(
        state,
        addNotification({ type: "error", message: "B" })
      );
      const idToRemove = state.items[0].id;
      const next = notificationsReducer(state, dismissNotification(idToRemove));
      expect(next.items).toHaveLength(1);
      expect(next.items[0].message).toBe("B");
    });

    it("is a no-op for an unknown id", () => {
      const state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "Test" })
      );
      const next = notificationsReducer(state, dismissNotification("does-not-exist"));
      expect(next.items).toHaveLength(1);
    });
  });

  describe("clearAllNotifications", () => {
    it("empties the items array", () => {
      let state = notificationsReducer(
        initialState,
        addNotification({ type: "info", message: "A" })
      );
      state = notificationsReducer(
        state,
        addNotification({ type: "error", message: "B" })
      );
      const next = notificationsReducer(state, clearAllNotifications());
      expect(next.items).toHaveLength(0);
    });

    it("is a no-op when already empty", () => {
      const next = notificationsReducer(initialState, clearAllNotifications());
      expect(next.items).toHaveLength(0);
    });
  });
});

describe("notifications selectors", () => {
  describe("selectNotifications", () => {
    it("returns empty array when no notifications", () => {
      const root = makeRoot({ items: [] });
      expect(selectNotifications(root)).toEqual([]);
    });

    it("returns all notification items", () => {
      const items = [
        { id: "1", type: "info" as const, message: "A", timestamp: 1000 },
        { id: "2", type: "error" as const, message: "B", timestamp: 2000 },
      ];
      const root = makeRoot({ items });
      expect(selectNotifications(root)).toEqual(items);
    });
  });

  describe("selectNotificationCount", () => {
    it("returns 0 when empty", () => {
      expect(selectNotificationCount(makeRoot({ items: [] }))).toBe(0);
    });

    it("returns correct count", () => {
      const items = [
        { id: "1", type: "info" as const, message: "A", timestamp: 1 },
        { id: "2", type: "warning" as const, message: "B", timestamp: 2 },
        { id: "3", type: "error" as const, message: "C", timestamp: 3 },
      ];
      expect(selectNotificationCount(makeRoot({ items }))).toBe(3);
    });
  });

  describe("selectHasNotifications", () => {
    it("returns false when empty", () => {
      expect(selectHasNotifications(makeRoot({ items: [] }))).toBe(false);
    });

    it("returns true when there are notifications", () => {
      const items = [{ id: "1", type: "info" as const, message: "A", timestamp: 1 }];
      expect(selectHasNotifications(makeRoot({ items }))).toBe(true);
    });
  });
});
