"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchCharacters } from "../../store/slices/characterSlice";
import { fetchShip } from "../../store/slices/shipSlice";
import { fetchTurn } from "../../store/slices/turnSlice";
import { refreshWorldCrew } from "../../store/slices/availableCrewSlice";
import { selectCharacters, selectCharactersStatus } from "../../store/selectors/character.selectors";
import { setActiveLocation } from "../../store/slices/galaxySlice";
import { setActiveCharacter } from "../../store/slices/uiSlice";

const subsectorFromHex = (hex: string): string => {
  const hexX = parseInt(hex.slice(0, 2), 10);
  const hexY = parseInt(hex.slice(2, 4), 10);
  const subCol = Math.floor((hexX - 1) / 8);
  const subRow = Math.floor((hexY - 1) / 10);
  return "ABCDEFGHIJKLMNOP"[subRow * 4 + subCol] ?? "A";
};

const MapInitializer = () => {
  const dispatch    = useAppDispatch();
  const characters  = useAppSelector(selectCharacters);
  const charStatus  = useAppSelector(selectCharactersStatus);
  const initialized = useRef(false);

  useEffect(() => {
    dispatch(fetchCharacters());
    dispatch(fetchShip());
    dispatch(fetchTurn());
    dispatch(refreshWorldCrew());
  }, [dispatch]);

  useEffect(() => {
    if (initialized.current || charStatus !== "loaded") return;
    const first = characters.find(c => c.sectorAbbr && c.hex);
    if (!first) return;
    initialized.current = true;
    dispatch(setActiveCharacter(first.id));
    dispatch(setActiveLocation({
      sectorAbbr:   first.sectorAbbr!,
      subsectorKey: subsectorFromHex(first.hex!),
    }));
  }, [charStatus, characters, dispatch]);

  return null;
};

export default MapInitializer;
