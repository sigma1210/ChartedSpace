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
