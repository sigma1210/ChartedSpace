import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface MockShipState {
  lastMockedJumpRating: number | null;
}

export const initialMockShipState: MockShipState = {
  lastMockedJumpRating: null,
};

const mockShipSlice = createSlice({
  name: "mockShip",
  initialState: initialMockShipState,
  reducers: {
    recordMockShipJumpRating(state, action: PayloadAction<number>) {
      state.lastMockedJumpRating = action.payload;
    },
  },
});

export const {
  recordMockShipJumpRating,
} = mockShipSlice.actions;

export default mockShipSlice.reducer;
