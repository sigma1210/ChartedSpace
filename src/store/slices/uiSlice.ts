import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  JumpDestination,
  MapView,
  ModalType,
  SearchFilter,
  UIState,
} from "../../types";

const initialState: UIState = {
  activeModal: null,
  mapView: "galaxy",
  activeCharacterId: null,
  activeWorldId: null,
  activeSectorAbbr: null,
  activeSubsector: null,
  activeUserId: null,
  isOwnProfile: false,
  searchFilter: "all",
  searchQuery: "",
  previousModal: null,
  pendingJumpDestination: null,
  showGalaxyMiniMap: true,
  showSectorMiniMap: true,
  showSubsectorMiniMap: true,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openModal(state, action: PayloadAction<ModalType>) {
      state.previousModal = state.activeModal;
      state.activeModal = action.payload;
    },
    closeModal(state) {
      state.activeModal = null;
      state.previousModal = null;
    },
    goBack(state) {
      state.activeModal = state.previousModal;
      state.previousModal = null;
    },
    openCharacterList(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "characterList";
    },
    openCharacterProfile(state, action: PayloadAction<string>) {
      state.previousModal = state.activeModal;
      state.activeModal = "characterProfile";
      state.activeCharacterId = action.payload;
    },
    openCharacterCreate(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "characterCreate";
      state.activeCharacterId = null;
    },
    setActiveCharacter(state, action: PayloadAction<string>) {
      state.activeCharacterId = action.payload;
    },
    openMap(state, action: PayloadAction<MapView | undefined>) {
      state.previousModal = state.activeModal;
      state.activeModal = "map";
      if (action.payload) state.mapView = action.payload;
    },
    setMapView(state, action: PayloadAction<MapView>) {
      state.mapView = action.payload;
    },
    setActiveSector(state, action: PayloadAction<string>) {
      state.activeSectorAbbr = action.payload;
      state.mapView = "sector";
    },
    setActiveSubsector(state, action: PayloadAction<string>) {
      state.activeSubsector = action.payload;
      state.mapView = "subsector";
    },
    openSystemDetail(state, action: PayloadAction<string>) {
      state.previousModal = state.activeModal;
      state.activeModal = "systemDetail";
      state.activeWorldId = action.payload;
    },
    openSearch(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "search";
      state.searchQuery = "";
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setSearchFilter(state, action: PayloadAction<SearchFilter>) {
      state.searchFilter = action.payload;
    },
    openNotifications(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "notifications";
    },
    openOwnProfile(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "userProfile";
      state.isOwnProfile = true;
      state.activeUserId = null;
    },
    openUserProfile(state, action: PayloadAction<string>) {
      state.previousModal = state.activeModal;
      state.activeModal = "userProfile";
      state.isOwnProfile = false;
      state.activeUserId = action.payload;
    },
    openJumpRangeSelector(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "jumpRangeSelector";
      state.pendingJumpDestination = null;
    },
    openCrewManagement(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "crewManagement";
    },
    setJumpDestination(state, action: PayloadAction<JumpDestination>) {
      state.pendingJumpDestination = action.payload;
      state.activeModal = null;
      state.previousModal = null;
    },
    clearJumpDestination(state) {
      state.pendingJumpDestination = null;
    },
    toggleGalaxyMiniMap(state) {
      state.showGalaxyMiniMap = !state.showGalaxyMiniMap;
    },
    toggleSectorMiniMap(state) {
      state.showSectorMiniMap = !state.showSectorMiniMap;
    },
    toggleSubsectorMiniMap(state) {
      state.showSubsectorMiniMap = !state.showSubsectorMiniMap;
    },
  },
});

export const {
  openModal,
  closeModal,
  goBack,
  openCharacterList,
  openCharacterProfile,
  openCharacterCreate,
  setActiveCharacter,
  openMap,
  setMapView,
  setActiveSector,
  setActiveSubsector,
  openSystemDetail,
  openSearch,
  setSearchQuery,
  setSearchFilter,
  openNotifications,
  openOwnProfile,
  openUserProfile,
  openJumpRangeSelector,
  setJumpDestination,
  clearJumpDestination,
  openCrewManagement,
  toggleGalaxyMiniMap,
  toggleSectorMiniMap,
  toggleSubsectorMiniMap,
} = uiSlice.actions;

export default uiSlice.reducer;
