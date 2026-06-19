import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  MapView,
  ModalType,
  SearchFilter,
  UIState,
} from "../../types";
import type { RootState } from "../index";

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
  showGalaxyMiniMap: true,
  showSectorMiniMap: true,
  showSubsectorMiniMap: true,
  showMainWorldHud: false,
  showCharacterProfileHud: false,
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
    openWorldDetail(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "worldDetail";
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
    openCrewManagement(state) {
      state.previousModal = state.activeModal;
      state.activeModal = "crewManagement";
    },
    toggleGalaxyMiniMap(state) {
      state.showGalaxyMiniMap = !state.showGalaxyMiniMap;
    },
    setGalaxyMiniMapVisible(state, action: PayloadAction<boolean>) {
      state.showGalaxyMiniMap = action.payload;
    },
    toggleSectorMiniMap(state) {
      state.showSectorMiniMap = !state.showSectorMiniMap;
    },
    toggleSubsectorMiniMap(state) {
      state.showSubsectorMiniMap = !state.showSubsectorMiniMap;
    },
    setSubsectorMiniMapVisible(state, action: PayloadAction<boolean>) {
      state.showSubsectorMiniMap = action.payload;
    },
    setSectorMiniMapVisible(state, action: PayloadAction<boolean>) {
      state.showSectorMiniMap = action.payload;
    },
    setMainWorldHudVisible(state, action: PayloadAction<boolean>) {
      state.showMainWorldHud = action.payload;
    },
    setCharacterProfileHudVisible(state, action: PayloadAction<boolean>) {
      state.showCharacterProfileHud = action.payload;
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
  openWorldDetail,
  openSystemDetail,
  openSearch,
  setSearchQuery,
  setSearchFilter,
  openNotifications,
  openOwnProfile,
  openUserProfile,
  openCrewManagement,
  toggleGalaxyMiniMap,
  setGalaxyMiniMapVisible,
  toggleSectorMiniMap,
  toggleSubsectorMiniMap,
  setSubsectorMiniMapVisible,
  setSectorMiniMapVisible,
  setMainWorldHudVisible,
  setCharacterProfileHudVisible,
} = uiSlice.actions;

export const openSelectedWorldSystemDetail = createAsyncThunk(
  "ui/openSelectedWorldSystemDetail",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const sectorAbbr = state.galaxy.activeWorldSectorAbbr;
    const hex = state.galaxy.activeWorldHex;
    if (!sectorAbbr || !hex) return false;

    dispatch(openSystemDetail(hex));
    return true;
  },
);

export default uiSlice.reducer;
