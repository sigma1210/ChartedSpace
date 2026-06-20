"use client";

import { useAppSelector } from "../../store/hooks";
import type { RootState } from "../../store";
import { selectCurrentTurn, selectTurnStatus } from "../../store/selectors/turn.selectors";
import {
  resolveShipNavigationCapabilities,
  resolveShipTradeCapabilities,
  shipNavigationCapabilitiesProvider,
  shipTradeCapabilitiesProvider,
} from "../ship";

const registeredShipNavigationCapabilitiesProviders = [
  shipNavigationCapabilitiesProvider,
] as const;

const registeredShipTradeCapabilitiesProviders = [
  shipTradeCapabilitiesProvider,
] as const;

export const useCoreCurrentTurn = () => useAppSelector(selectCurrentTurn);

export const useCoreTurnAdvanceBusy = () => {
  const turnStatus = useAppSelector(selectTurnStatus);
  return turnStatus === "loading";
};

export const selectShipNavigationCapabilities = (state: RootState) =>
  resolveShipNavigationCapabilities(registeredShipNavigationCapabilitiesProviders, state);

export const selectShipTradeCapabilities = (state: RootState) =>
  resolveShipTradeCapabilities(registeredShipTradeCapabilitiesProviders, state);
