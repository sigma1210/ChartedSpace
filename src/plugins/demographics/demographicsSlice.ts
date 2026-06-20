import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const demographicDotModes = ["default", "stellar", "allegiance"] as const;
export type DemographicDotMode = typeof demographicDotModes[number];

export interface DemographicsState {
  selectedDotMode: DemographicDotMode;
}

export const initialDemographicsState: DemographicsState = {
  selectedDotMode: "default",
};

const demographicsSlice = createSlice({
  name: "demographics",
  initialState: initialDemographicsState,
  reducers: {
    setDemographicDotMode(state, action: PayloadAction<DemographicDotMode>) {
      state.selectedDotMode = action.payload;
    },
  },
});

export const {
  setDemographicDotMode,
} = demographicsSlice.actions;

export default demographicsSlice.reducer;
