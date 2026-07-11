"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export interface PluginHudSize { width: number; height: number }

const PluginHudViewportContext = createContext<PluginHudSize | null>(null);

export const usePluginHudViewport = () => {
  const viewport = useContext(PluginHudViewportContext);
  if (!viewport) throw new Error("FloatingPluginHud must be rendered inside PluginHudLayer");
  return viewport;
};

export const PluginHudLayer = ({ children, hiddenHuds = [], onRestoreHud, onResetLayout, className = "" }: {
  children: ReactNode;
  hiddenHuds?: { id: string; title: string }[];
  onRestoreHud?: (id: string) => void;
  onResetLayout?: () => void;
  className?: string;
}) => {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<PluginHudSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <PluginHudViewportContext.Provider value={viewport}>
      <div ref={layerRef} className={`relative h-full min-h-0 overflow-hidden ${className}`}>
        {children}
        {(hiddenHuds.length > 0 || onResetLayout) && (
          <details className="absolute right-2 top-2 z-40 border border-(--hud-border) bg-(--hud-bg)/90 font-mono text-[8px] uppercase tracking-wider text-(--hud-text) shadow-lg backdrop-blur-xl">
            <summary className="cursor-pointer select-none px-2 py-1 text-(--hud-text-dim)">HUDs</summary>
            <div className="flex min-w-32 flex-col gap-1 border-t border-(--hud-border) p-1">
              {hiddenHuds.map((hud) => (
                <button key={hud.id} type="button" onClick={() => onRestoreHud?.(hud.id)} className="h-6 px-2 text-left hover:bg-(--hud-accent)/10 hover:text-(--hud-accent)">
                  Show {hud.title}
                </button>
              ))}
              {onResetLayout && <button type="button" onClick={onResetLayout} className="h-6 border-t border-(--hud-border) px-2 text-left hover:bg-(--hud-accent)/10 hover:text-(--hud-accent)">Reset layout</button>}
            </div>
          </details>
        )}
      </div>
    </PluginHudViewportContext.Provider>
  );
};
