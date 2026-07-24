import { createSlice } from "@reduxjs/toolkit";

export interface EquipmentCatalogState {
  readonly version: 1;
}

export const initialEquipmentCatalogState: EquipmentCatalogState = {
  version: 1,
};

const equipmentCatalogSlice = createSlice({
  name: "equipmentCatalog",
  initialState: initialEquipmentCatalogState,
  reducers: {},
});

export default equipmentCatalogSlice.reducer;
