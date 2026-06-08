"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectShip } from "../../store/selectors/ship.selectors";
import {
  selectShowWarpLayer,
  selectWarpExitBlankActive,
} from "../../store/selectors/systemScene.selectors";
import {
  setSceneMode,
  setWarpLayerState,
} from "../../store/slices/systemSceneSlice";

export const WarpSceneLifecycle = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectShip);
  const showWarpLayer = useAppSelector(selectShowWarpLayer);
  const warpExitBlankActive = useAppSelector(selectWarpExitBlankActive);
  const fadeTimerRef = useRef<number | null>(null);
  const enterFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    if (enterFrameRef.current !== null) {
      window.cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }

    if (warpExitBlankActive) {
      dispatch(setSceneMode("system"));
      dispatch(setWarpLayerState({
        showWarpLayer: false,
        warpLayerActive: false,
        warpLayerOpacity: 0,
      }));
      return;
    }

    if (ship?.status === "in_jump") {
      dispatch(setSceneMode("jump"));
      dispatch(setWarpLayerState({
        showWarpLayer: true,
        warpLayerActive: true,
      }));
      enterFrameRef.current = window.requestAnimationFrame(() => {
        dispatch(setWarpLayerState({ warpLayerOpacity: 1 }));
        enterFrameRef.current = null;
      });
      return;
    }

    dispatch(setSceneMode("system"));

    if (showWarpLayer) {
      dispatch(setWarpLayerState({
        warpLayerActive: true,
        warpLayerOpacity: 1,
      }));
      fadeTimerRef.current = window.setTimeout(() => {
        dispatch(setWarpLayerState({
          showWarpLayer: false,
          warpLayerActive: false,
          warpLayerOpacity: 0,
        }));
        fadeTimerRef.current = null;
      }, 700);
      return;
    }

    dispatch(setWarpLayerState({
      warpLayerActive: false,
      warpLayerOpacity: 0,
    }));
  }, [dispatch, ship?.status, showWarpLayer, warpExitBlankActive]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
      if (enterFrameRef.current !== null) window.cancelAnimationFrame(enterFrameRef.current);
    },
    [],
  );

  return null;
};
