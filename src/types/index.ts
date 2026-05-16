export type ModalType =
  | "characterList"
  | "characterProfile"
  | "characterCreate"
  | "search"
  | "notifications"
  | "map"
  | "systemDetail"
  | "userProfile";

export type MapView = "galaxy" | "sector" | "subsector";

export type SearchFilter = "all" | "worlds" | "characters";

export type NotificationType = "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
}

export interface UIState {
  activeModal: ModalType | null;
  mapView: MapView;
  activeCharacterId: string | null;
  activeWorldId: string | null;
  activeSectorAbbr: string | null;
  activeSubsector: string | null;
  activeUserId: string | null;
  isOwnProfile: boolean;
  searchFilter: SearchFilter;
  searchQuery: string;
  previousModal: ModalType | null;
}

export interface NotificationsState {
  items: Notification[];
}

export interface SectorName {
  Text: string;
  Lang?: string;
}

export interface SectorMeta {
  X: number;
  Y: number;
  Milieu: string;
  Abbreviation: string;
  Tags: string;
  Names: SectorName[];
}

export interface WorldUWP {
  raw: string;
  starport: string;
  size: string;
  atmosphere: string;
  hydrographics: string;
  population: string;
  government: string;
  lawLevel: string;
  techLevel: string;
}

export interface World {
  hex: string;
  hexX: number;
  hexY: number;
  name: string;
  uwp: WorldUWP;
  remarks: string;
  importance: string;
  economics: string;
  culture: string;
  nobility: string;
  bases: string;
  travelZone: string;
  pbg: string;
  worldsInSystem: number;
  allegiance: string;
  stellar: string | null;
}

export interface SectorDetail {
  sector: string;
  abbreviation: string;
  milieu: string;
  source: string;
  credits: string;
  subsectors: Record<string, string>;
  allegiances: Record<string, string>;
  worlds: World[];
}

export type SectorLoadStatus = "idle" | "loading" | "loaded" | "error";

export interface GalaxyState {
  sectors: SectorMeta[];
  sectorData: Record<string, SectorDetail>;
  loadingStatus: Record<string, SectorLoadStatus>;
  activeSectorAbbr: string;
  activeSubsectorKey: string;
  activeWorldHex: string | null;
}
