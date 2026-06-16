import { shipNavigationCapabilitiesProvider } from "./ship/shipNavigationCapabilities";

export const registeredShipNavigationCapabilitiesProviders = [
  shipNavigationCapabilitiesProvider,
] as const;
