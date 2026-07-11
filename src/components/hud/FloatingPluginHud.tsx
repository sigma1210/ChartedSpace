"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEventHandler, type ReactNode } from "react";
import { HudHeader, HudPanel } from "@/components/world/HudPrimitives";
import { usePluginHudViewport, type PluginHudSize } from "./PluginHudLayer";

export interface PluginHudPoint { x: number; y: number }
export interface FloatingPluginHudLayout { visible: boolean; pinned: boolean; position: PluginHudPoint }

const screenMargin = 8;

export const clampFloatingHudPosition = (position: PluginHudPoint, viewport: PluginHudSize, panel: PluginHudSize): PluginHudPoint => {
  if (!viewport.width || !viewport.height) return { x: Math.max(screenMargin, position.x), y: Math.max(screenMargin, position.y) };
  const maxX = Math.max(screenMargin, viewport.width - (panel.width || 160) - screenMargin);
  const maxY = Math.max(screenMargin, viewport.height - (panel.height || 28) - screenMargin);
  return { x: Math.max(screenMargin, Math.min(maxX, position.x)), y: Math.max(screenMargin, Math.min(maxY, position.y)) };
};

const samePosition = (a: PluginHudPoint, b: PluginHudPoint) => Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;

export const FloatingPluginHud = ({ title, layout, onLayoutChange, children, className = "" }: {
  title: string;
  layout: FloatingPluginHudLayout;
  onLayoutChange: (layout: FloatingPluginHudLayout) => void;
  children: ReactNode;
  className?: string;
}) => {
  const viewport = usePluginHudViewport();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: PluginHudPoint } | null>(null);
  const dragPositionRef = useRef<PluginHudPoint | null>(null);
  const [panelSize, setPanelSize] = useState<PluginHudSize>({ width: 0, height: 0 });
  const [dragPosition, setDragPosition] = useState<PluginHudPoint | null>(null);
  const activePosition = dragPosition ?? layout.position;
  const safePosition = useMemo(() => clampFloatingHudPosition(activePosition, viewport, panelSize), [activePosition, panelSize, viewport]);

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element) return;
    const measure = () => setPanelSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (dragRef.current) return;
    const clamped = clampFloatingHudPosition(layout.position, viewport, panelSize);
    if (!samePosition(clamped, layout.position)) onLayoutChange({ ...layout, position: clamped });
  }, [layout, onLayoutChange, panelSize, viewport]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!dragRef.current || layout.pinned) return;
      const next = clampFloatingHudPosition({
        x: dragRef.current.origin.x + event.clientX - dragRef.current.startX,
        y: dragRef.current.origin.y + event.clientY - dragRef.current.startY,
      }, viewport, panelSize);
      dragPositionRef.current = next;
      setDragPosition(next);
    };
    const finish = () => {
      if (!dragRef.current) return;
      const finalPosition = dragPositionRef.current;
      dragRef.current = null;
      dragPositionRef.current = null;
      setDragPosition(null);
      if (finalPosition) onLayoutChange({ ...layout, position: finalPosition });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [layout, onLayoutChange, panelSize, viewport]);

  const startDrag = useCallback<PointerEventHandler<HTMLDivElement>>((event) => {
    if (layout.pinned || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: safePosition };
    dragPositionRef.current = safePosition;
    setDragPosition(safePosition);
  }, [layout.pinned, safePosition]);

  if (!layout.visible) return null;
  return (
    <div ref={panelRef} className="pointer-events-none absolute z-20" style={{ left: safePosition.x, top: safePosition.y }}>
      <HudPanel className={className}>
        <HudHeader title={title} pinned={layout.pinned} onTogglePinned={() => onLayoutChange({ ...layout, pinned: !layout.pinned })} onClose={() => onLayoutChange({ ...layout, visible: false })} onDragStart={startDrag} closeTitle={`Collapse ${title}`} />
        {children}
      </HudPanel>
    </div>
  );
};
