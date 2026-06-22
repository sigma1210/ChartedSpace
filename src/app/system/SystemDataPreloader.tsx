"use client";

import { useEffect } from "react";
import { fetchCharacters } from "@/plugins/characters";
import { fetchShip } from "@/plugins/ship";
import { useAppDispatch } from "@/store/hooks";
import { preloadGalaxySectors } from "@/store/slices/galaxySlice";
import { fetchTurn } from "@/store/slices/turnSlice";

const SystemDataPreloader = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchShip());
    dispatch(fetchTurn());
    dispatch(fetchCharacters());
    dispatch(preloadGalaxySectors());
  }, [dispatch]);

  return null;
};

export default SystemDataPreloader;
