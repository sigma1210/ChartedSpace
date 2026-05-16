"use client";

import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  dismissNotification,
  clearAllNotifications,
} from "../../store/slices/notificationsSlice";
import { selectNotifications } from "../../store/selectors/notifications.selectors";
import { NotificationType } from "../../types";

const TYPE_CONFIG: Record<
  NotificationType,
  { Icon: React.ElementType; color: string; borderColor: string; label: string }
> = {
  error: {
    Icon: AlertCircle,
    color: "text-(--hud-error)",
    borderColor: "border-l-2 border-l-[var(--hud-error)]",
    label: "Error",
  },
  warning: {
    Icon: AlertTriangle,
    color: "text-(--hud-warning)",
    borderColor: "border-l-2 border-l-[var(--hud-warning)]",
    label: "Warning",
  },
  info: {
    Icon: Info,
    color: "text-(--hud-info)",
    borderColor: "border-l-2 border-l-[var(--hud-text)]",
    label: "Info",
  },
};

const NotificationsModal = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(selectNotifications);

  const headerRight = notifications.length > 0 && (
    <button
      onClick={() => dispatch(clearAllNotifications())}
      className="border border-(--hud-border) px-2 py-0.5 text-[10px] uppercase tracking-wider text-(--hud-text-dim) hover:text-(--hud-text) hover:border-(--hud-accent) transition-colors"
    >
      Clear All
    </button>
  );

  return (
    <HudModal
      title="Notifications"
      subtitle={notifications.length > 0 ? `${notifications.length}` : undefined}
      headerRight={headerRight || undefined}
    >
      <div className="flex flex-col gap-2 p-3">
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
            No notifications
          </p>
        ) : (
          notifications.map((n) => {
            const { Icon, color, borderColor, label } = TYPE_CONFIG[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 bg-(--hud-surface-2) p-3 ${borderColor}`}
              >
                <Icon size={14} strokeWidth={1.5} className={`mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] uppercase tracking-wider font-semibold ${color}`}>
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-(--hud-text)">{n.message}</p>
                </div>
                <button
                  onClick={() => dispatch(dismissNotification(n.id))}
                  aria-label="Dismiss"
                  className="shrink-0 text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </HudModal>
  );
}
export default NotificationsModal
