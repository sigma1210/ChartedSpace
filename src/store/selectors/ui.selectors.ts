import type { RootState } from "../index";

export const selectActiveModal = (state: RootState) => state.ui.activeModal;
export const selectMapView = (state: RootState) => state.ui.mapView;
export const selectActiveCharacterId = (state: RootState) => state.ui.activeCharacterId;
export const selectActiveWorldId = (state: RootState) => state.ui.activeWorldId;
export const selectActiveSectorAbbr = (state: RootState) => state.ui.activeSectorAbbr;
export const selectActiveSubsector = (state: RootState) => state.ui.activeSubsector;
export const selectActiveUserId = (state: RootState) => state.ui.activeUserId;
export const selectIsOwnProfile = (state: RootState) => state.ui.isOwnProfile;
export const selectSearchQuery = (state: RootState) => state.ui.searchQuery;
export const selectSearchFilter = (state: RootState) => state.ui.searchFilter;
export const selectPreviousModal = (state: RootState) => state.ui.previousModal;
