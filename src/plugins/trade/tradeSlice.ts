import { createSlice } from "@reduxjs/toolkit";

export interface TradeState {
  readonly version: 1;
}

export const initialTradeState: TradeState = {
  version: 1,
};

const tradeSlice = createSlice({
  name: "trade",
  initialState: initialTradeState,
  reducers: {},
});

export default tradeSlice.reducer;
