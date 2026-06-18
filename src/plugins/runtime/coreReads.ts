"use client";

import { useAppSelector } from "../../store/hooks";
import type { RootState } from "../../store";
import { selectCurrentTurn, selectTurnStatus } from "../../store/selectors/turn.selectors";
import { registeredShipNavigationCapabilitiesProviders } from "../shipNavigationCapabilityProviders";
import { registeredShipTradeCapabilitiesProviders } from "../shipTradeCapabilityProviders";
import {
  resolveShipNavigationCapabilities,
} from "../shipNavigationCapabilities";
import {
  resolveShipTradeCapabilities,
} from "../shipTradeCapabilities";

export const useCoreCurrentTurn = () => useAppSelector(selectCurrentTurn);

export const useCoreTurnAdvanceBusy = () => {
  const turnStatus = useAppSelector(selectTurnStatus);
  return turnStatus === "loading";
};

export const selectShipNavigationCapabilities = (state: RootState) =>
  resolveShipNavigationCapabilities(registeredShipNavigationCapabilitiesProviders, state);

export const selectShipTradeCapabilities = (state: RootState) =>
  resolveShipTradeCapabilities(registeredShipTradeCapabilitiesProviders, state);
