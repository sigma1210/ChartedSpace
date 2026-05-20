import type { RootState } from "../index";

export const selectCurrentTurn = (state: RootState) => state.turn.currentTurn;
export const selectTurnStatus  = (state: RootState) => state.turn.status;
