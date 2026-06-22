"use client";

import { useEffect } from "react";
import { useAppDispatch } from "../../store/hooks";
import { fetchCharacters } from "../../plugins/characters";
import { preloadGalaxySectors } from "../../store/slices/galaxySlice";
import { fetchShip } from "../../plugins/ship";
import { fetchTurn } from "../../store/slices/turnSlice";

const MapDataPreloader = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchShip());
    dispatch(fetchTurn());
    dispatch(fetchCharacters());
    dispatch(preloadGalaxySectors());
  }, [dispatch]);

  return null;
};

export default MapDataPreloader;
