"use client";

import { useAppSelector } from "../../store/hooks";
import { selectCurrentTurn, selectTurnStatus } from "../../store/selectors/turn.selectors";

export const useCoreCurrentTurn = () => useAppSelector(selectCurrentTurn);

export const useCoreTurnAdvanceBusy = () => {
  const turnStatus = useAppSelector(selectTurnStatus);
  return turnStatus === "loading";
};
