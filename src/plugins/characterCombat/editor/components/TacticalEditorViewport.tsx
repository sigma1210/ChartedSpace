"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  clampTacticalEditorCamera,
  fitTacticalEditorCamera,
  panTacticalEditorCamera,
  tacticalEditorViewBox,
  zoomTacticalEditorCameraAt,
  type TacticalEditorCamera,
  type TacticalEditorMapSize,
  type TacticalEditorSnapMode,
  type TacticalEditorViewportPixels,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorCamera";

type TacticalEditorViewportContextValue = {
  camera: TacticalEditorCamera;
  viewBox: { x: number; y: number; width: number; height: number };
  zoomPercent: number;
  snapMode: TacticalEditorSnapMode;
  setSnapMode: (mode: TacticalEditorSnapMode) => void;
  setCamera: (camera: TacticalEditorCamera) => void;
  zoomAt: (anchor: { x: number; y: number }, factor: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitMap: () => void;
  resetView: () => void;
  panByPixels: (screenDelta: { x: number; y: number }, viewport: TacticalEditorViewportPixels) => void;
};

const TacticalEditorViewportContext = createContext<TacticalEditorViewportContextValue | null>(null);

export const TacticalEditorViewportProvider = ({
  map,
  children,
}: {
  map: TacticalEditorMapSize;
  children: ReactNode;
}) => {
  const [camera, updateCamera] = useState(() => fitTacticalEditorCamera(map));
  const [snapMode, setSnapMode] = useState<TacticalEditorSnapMode>("grid");
  const setCamera = useCallback((next: TacticalEditorCamera) => {
    updateCamera(clampTacticalEditorCamera(next, map));
  }, [map]);
  const zoomAt = useCallback((anchor: { x: number; y: number }, factor: number) => {
    updateCamera((current) => zoomTacticalEditorCameraAt(current, anchor, factor, map));
  }, [map]);
  const zoomAroundCenter = useCallback((factor: number) => {
    updateCamera((current) => zoomTacticalEditorCameraAt(
      current,
      { x: current.centerX, y: current.centerY },
      factor,
      map,
    ));
  }, [map]);
  const fitMap = useCallback(() => updateCamera(fitTacticalEditorCamera(map)), [map]);
  const panByPixels = useCallback((
    screenDelta: { x: number; y: number },
    viewport: TacticalEditorViewportPixels,
  ) => {
    updateCamera((current) => panTacticalEditorCamera(current, screenDelta, viewport, map));
  }, [map]);
  const value = useMemo<TacticalEditorViewportContextValue>(() => ({
    camera,
    viewBox: tacticalEditorViewBox(camera, map),
    zoomPercent: Math.round(camera.zoom * 100),
    snapMode,
    setSnapMode,
    setCamera,
    zoomAt,
    zoomIn: () => zoomAroundCenter(1.25),
    zoomOut: () => zoomAroundCenter(0.8),
    fitMap,
    resetView: fitMap,
    panByPixels,
  }), [camera, fitMap, map, panByPixels, setCamera, snapMode, zoomAroundCenter, zoomAt]);
  return <TacticalEditorViewportContext.Provider value={value}>{children}</TacticalEditorViewportContext.Provider>;
};

export const useTacticalEditorViewport = () => useContext(TacticalEditorViewportContext);
