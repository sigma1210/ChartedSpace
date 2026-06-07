import type { PointerEventHandler, ReactNode } from "react";
import { Grip, Pin, PinOff, X } from "lucide-react";

export const hudIconButtonClass =
  "group relative grid h-3 w-3 shrink-0 place-items-center border border-transparent bg-transparent text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:bg-(--hud-bg)/50 hover:text-(--hud-text) focus-visible:border-(--hud-accent) focus-visible:bg-(--hud-bg)/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-(--hud-text-dim)";

export const hudActionButtonClass =
  "flex h-7 min-w-24 items-center justify-center gap-1.5 border border-(--hud-accent) bg-(--hud-bg)/45 px-2 font-mono text-[9px] uppercase tracking-wider text-(--hud-accent) transition-colors hover:bg-(--hud-accent) hover:text-(--hud-bg) disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-(--hud-bg)/45 disabled:hover:text-(--hud-accent)";

export const HudIconButton = ({
  children,
  title,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className={hudIconButtonClass}
  >
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden -translate-x-1/2 whitespace-nowrap border border-(--hud-accent)/70 bg-(--hud-bg)/95 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-(--hud-accent) shadow-[0_0_12px_rgba(34,211,238,0.18)] group-hover:block group-focus-visible:block">
      {title}
    </span>
  </button>
);

export const HudPanel = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`select-none border border-(--hud-accent)/65 bg-(--hud-bg)/82 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-(--hud-text) shadow-[0_0_24px_rgba(34,211,238,0.16)] backdrop-blur-md ${className}`}
    style={{ pointerEvents: "auto" }}
    onPointerDown={(event) => event.stopPropagation()}
  >
    {children}
  </div>
);

export const HudHeader = ({
  title,
  actions,
  pinned,
  onTogglePinned,
  onClose,
  onDragStart,
  closeTitle = "Close HUD",
}: {
  title?: string;
  actions?: ReactNode;
  pinned: boolean;
  onTogglePinned: () => void;
  onClose?: () => void;
  onDragStart: PointerEventHandler<HTMLDivElement>;
  closeTitle?: string;
}) => (
  <div
    className={`mb-0.5 flex h-3 items-center justify-between gap-2 border-b border-(--hud-border) pb-0 leading-none ${pinned ? "cursor-default" : "cursor-move"}`}
    onPointerDown={onDragStart}
  >
    <div className="flex min-w-0 items-center gap-1.5">
      <Grip size={8} aria-hidden="true" className="shrink-0 text-(--hud-text-dim)" />
      {title && (
        <span className="truncate text-[8px] leading-none tracking-widest text-(--hud-text-dim)">
          {title}
        </span>
      )}
    </div>
    <div className="flex items-center gap-1">
      {actions}
      <HudIconButton
        title={pinned ? "Unpin HUD" : "Pin HUD"}
        onClick={onTogglePinned}
      >
        {pinned ? <Pin size={8} aria-hidden="true" /> : <PinOff size={8} aria-hidden="true" />}
      </HudIconButton>
      {onClose && (
        <HudIconButton title={closeTitle} onClick={onClose}>
          <X size={8} aria-hidden="true" />
        </HudIconButton>
      )}
    </div>
  </div>
);
