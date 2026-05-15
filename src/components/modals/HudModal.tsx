"use client";

import { X } from "lucide-react";
import { useAppDispatch } from "../../store/hooks";
import { closeModal } from "../../store/slices/uiSlice";

interface HudModalProps {
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function HudModal({
  title,
  subtitle,
  headerRight,
  children,
  maxHeight = "max-h-[80vh]",
}: HudModalProps) {
  const dispatch = useAppDispatch();

  return (
    <div className={`hud-panel flex flex-col rounded-sm ${maxHeight} overflow-hidden`}>
      <div className="hud-panel-header flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className="truncate">{title}</span>
          {subtitle && (
            <span className="text-(--hud-text-dim) font-normal normal-case tracking-normal truncate">
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          <button
            onClick={() => dispatch(closeModal())}
            aria-label="Close"
            className="text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
