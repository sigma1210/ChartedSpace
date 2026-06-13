"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectShipLocation } from "../../store/selectors/ship.selectors";
import { selectWorldByCoord } from "../../store/selectors/galaxy.selectors";
import {
  setActiveLocation,
} from "../../store/slices/galaxySlice";
import {
  setRenderableLocation,
} from "../../store/slices/systemSceneSlice";

const subsectorFromHex = (hex: string): string => {
  const hexX = parseInt(hex.slice(0, 2), 10);
  const hexY = parseInt(hex.slice(2, 4), 10);
  const subCol = Math.floor((hexX - 1) / 8);
  const subRow = Math.floor((hexY - 1) / 10);
  return "ABCDEFGHIJKLMNOP"[subRow * 4 + subCol] ?? "A";
};

export const SystemLocationLifecycle = () => {
  const dispatch = useAppDispatch();
  const shipLocation = useAppSelector(selectShipLocation);
  const world = useAppSelector(
    selectWorldByCoord(shipLocation?.sectorAbbr, shipLocation?.hex),
  );

  useEffect(() => {
    if (!world || !shipLocation?.sectorAbbr) return;
    dispatch(setRenderableLocation({
      sectorAbbr: shipLocation.sectorAbbr,
      hex: world.hex,
    }));
  }, [dispatch, shipLocation?.sectorAbbr, world]);

  useEffect(() => {
    if (!shipLocation?.sectorAbbr || !shipLocation.hex) return;
    dispatch(setActiveLocation({
      sectorAbbr: shipLocation.sectorAbbr,
      subsectorKey: subsectorFromHex(shipLocation.hex),
    }));
  }, [dispatch, shipLocation?.hex, shipLocation?.sectorAbbr]);

  return null;
};
