"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { EditorPanDrag } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";
import {
  tacticalEditorLocalMapPoint,
  type TacticalEditorClientPointer,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorPointerCoordinates";

type LocalMapPoint = (event: TacticalEditorClientPointer) => { x: number; y: number } | null;

export const useTacticalEditorCanvasNavigation = ({
  panByPixels,
  zoomAt,
  localMapPoint = tacticalEditorLocalMapPoint,
}: {
  panByPixels?: (screenDelta: { x: number; y: number }, viewport: { width: number; height: number }) => void;
  zoomAt?: (anchor: { x: number; y: number }, factor: number) => void;
  localMapPoint?: LocalMapPoint;
}) => {
  const previewRef = useRef<SVGSVGElement>(null);
  const [panDrag, setPanDrag] = useState<EditorPanDrag | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))) return;
      setSpacePressed(true);
      event.preventDefault();
    };
    const keyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpacePressed(false);
    };
    const loseFocus = () => setSpacePressed(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", loseFocus);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", loseFocus);
    };
  }, []);

  useEffect(() => {
    const svg = previewRef.current;
    if (!svg || !panByPixels || !zoomAt) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const bounds = svg.getBoundingClientRect();
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        panByPixels(
          event.shiftKey
            ? { x: -event.deltaY, y: 0 }
            : { x: -event.deltaX, y: -event.deltaY },
          { width: bounds.width, height: bounds.height },
        );
        return;
      }
      const anchor = localMapPoint({
        currentTarget: svg,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      if (anchor) zoomAt(anchor, Math.exp(-event.deltaY * 0.002));
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [localMapPoint, panByPixels, zoomAt]);

  return {
    previewRef,
    panDrag,
    setPanDrag,
    spacePressed,
  };
};
