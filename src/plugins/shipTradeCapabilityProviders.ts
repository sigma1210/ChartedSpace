import { shipTradeCapabilitiesProvider } from "./ship/shipTradeCapabilities";

export const registeredShipTradeCapabilitiesProviders = [
  shipTradeCapabilitiesProvider,
] as const;
