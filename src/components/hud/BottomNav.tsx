"use client";

import { Users, Map, Search, Bell, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  openCharacterList,
  openMap,
  openSearch,
  openNotifications,
  openOwnProfile,
} from "../../store/slices/uiSlice";
import { selectActiveModal } from "../../store/selectors/ui.selectors";
import { selectNotificationCount } from "../../store/selectors/notifications.selectors";

const NAV_ITEMS = [
  { id: "characterList", label: "Characters", Icon: Users, action: openCharacterList },
  { id: "map",           label: "Map",        Icon: Map,   action: () => openMap(undefined) },
  { id: "search",        label: "Search",     Icon: Search, action: openSearch },
  { id: "notifications", label: "Alerts",     Icon: Bell,  action: openNotifications },
  { id: "userProfile",   label: "Profile",    Icon: User,  action: openOwnProfile },
] as const;

const BottomNav = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const notifCount = useAppSelector(selectNotificationCount);

  return (
    <nav
      className="relative z-20 flex items-stretch border-t border-(--hud-border) bg-(--hud-surface)"
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ id, label, Icon, action }) => {
        const isActive = activeModal === id;
        const isAlerts = id === "notifications";

        return (
          <button
            key={id}
            onClick={() => dispatch(action())}
            className={[
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs uppercase tracking-widest transition-colors",
              isActive
                ? "text-(--hud-text) bg-(--hud-surface-2)"
                : "text-(--hud-text-dim) hover:text-(--hud-text) hover:bg-(--hud-surface-2)",
            ].join(" ")}
          >
            <span className="relative">
              <Icon size={18} strokeWidth={1.5} />
              {isAlerts && notifCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-(--hud-error) text-[10px] font-bold text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </span>
            <span className="font-mono">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
export default BottomNav
