export type ModalType =
  | "characterList"
  | "characterProfile"
  | "characterCreate"
  | "search"
  | "notifications"
  | "map"
  | "systemDetail"
  | "userProfile"
  | "jumpRangeSelector"
  | "crewManagement";

export type MapView = "galaxy" | "sector" | "subsector";

export type SearchFilter = "all" | "worlds" | "characters";

export type NotificationType = "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
}

export interface JumpDestination {
  hex: string;
  sectorAbbr: string;
  name: string;
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
  pendingJumpDestination: JumpDestination | null;
  showGalaxyMiniMap: boolean;
  showSectorMiniMap: boolean;
  showSubsectorMiniMap: boolean;
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

export interface WorldCoord {
  hex:        string;
  sectorAbbr: string;
}

export type MapMode = "galaxyMiniMap" | "subsectorMiniMap";

// ─── Crew library ─────────────────────────────────────────────────────────────

export interface CrewLibraryEntry {
  age:     number;
  upp:     { str: number; dex: number; end: number; int: number; edu: number; soc: number };
  skills:  Array<{ name: string; level: number }>;
  careers: Array<{ career: string; terms: number; rank: number; commissioned: boolean }>;
}

export interface AvailableCrewMember extends CrewLibraryEntry {
  id:   string;
  name: string;
}

export interface WorldDotStyle {
  fill: string;
  r:    number;
}

export interface GalaxyState {
  sectors: SectorMeta[];
  sectorData: Record<string, SectorDetail>;
  loadingStatus: Record<string, SectorLoadStatus>;
  activeSectorAbbr: string;
  activeSubsectorKey: string;
  activeWorldHex: string | null;
  activeWorldSectorAbbr: string | null;
  targetWorldHex: string | null;
  targetWorldSectorAbbr: string | null;
}
