"use client";

import { useEffect, useRef } from "react";
import {
  characterActionsHudId,
  characterListHudId,
  selectCharacters,
  selectCharactersStatus,
} from "@/plugins/characters";
import {
  selectActiveShip,
  selectShipStatus,
} from "@/plugins/ship";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setHudVisible } from "@/store/slices/hudSlice";
import { openModal } from "@/store/slices/uiSlice";

type DataLoadStatus = "idle" | "loading" | "loaded" | "error";

export type CharacterStartDecision =
  | "open-character-list"
  | "open-character-generation"
  | null;

export const characterStartDecision = ({
  shipStatus,
  hasShip,
  charactersStatus,
  characterCount,
}: {
  shipStatus: DataLoadStatus;
  hasShip: boolean;
  charactersStatus: DataLoadStatus;
  characterCount: number;
}): CharacterStartDecision => {
  if (shipStatus !== "loaded" || charactersStatus !== "loaded" || hasShip) return null;
  return characterCount > 0 ? "open-character-list" : "open-character-generation";
};

const CharacterStartLifecycle = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectActiveShip);
  const shipStatus = useAppSelector(selectShipStatus);
  const characters = useAppSelector(selectCharacters);
  const charactersStatus = useAppSelector(selectCharactersStatus);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;

    const decision = characterStartDecision({
      shipStatus,
      hasShip: Boolean(ship),
      charactersStatus,
      characterCount: characters.length,
    });
    if (!decision) return;

    opened.current = true;
    dispatch(setHudVisible({ id: characterActionsHudId, visible: true }));

    if (decision === "open-character-list") {
      dispatch(setHudVisible({ id: characterListHudId, visible: true }));
    } else {
      dispatch(openModal("characterGeneration"));
    }
  }, [characters.length, charactersStatus, dispatch, ship, shipStatus]);

  return null;
};

export default CharacterStartLifecycle;
