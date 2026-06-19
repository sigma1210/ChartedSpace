"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectShipLocation } from "../../plugins/ship";
import {
  setActiveLocation,
} from "../../store/slices/galaxySlice";
import {
  setRenderableLocation,
} from "../../store/slices/systemSceneSlice";
import { hydrateNavigationSnapshot } from "../../plugins/navigation/navigationSlice";

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
  const currentSectorStatus = useAppSelector(
    (state) => shipLocation?.sectorAbbr ? state.galaxy.loadingStatus[shipLocation.sectorAbbr] : null,
  );

  useEffect(() => {
    if (!shipLocation?.sectorAbbr || !shipLocation.hex) return;
    dispatch(setRenderableLocation({
      sectorAbbr: shipLocation.sectorAbbr,
      hex: shipLocation.hex,
    }));
  }, [dispatch, shipLocation?.sectorAbbr, shipLocation?.hex]);

  // Gate snapshot on sector data being loaded — fetchShip can resolve before
  // preloadGalaxySectors finishes, causing a stale snapshot with no world data.
  useEffect(() => {
    if (!shipLocation?.sectorAbbr || !shipLocation.hex) return;
    if (currentSectorStatus !== "loaded") return;
    dispatch(hydrateNavigationSnapshot());
  }, [dispatch, shipLocation?.sectorAbbr, shipLocation?.hex, currentSectorStatus]);

  useEffect(() => {
    if (!shipLocation?.sectorAbbr || !shipLocation.hex) return;
    dispatch(setActiveLocation({
      sectorAbbr: shipLocation.sectorAbbr,
      subsectorKey: subsectorFromHex(shipLocation.hex),
    }));
  }, [dispatch, shipLocation?.hex, shipLocation?.sectorAbbr]);

  return null;
};
