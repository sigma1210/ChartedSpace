"use client";

import "@/lib/turns/index";
import { useEffect, useRef } from "react";
import StarSystemView from "@/components/world/StarSystemView";
import { WarpSceneLifecycle } from "@/components/world/WarpSceneLifecycle";
import { SystemLocationLifecycle } from "@/components/world/SystemLocationLifecycle";
import {
  characterActionsHudId,
  characterCreateHudId,
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

const CharacterStartLifecycle = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectActiveShip);
  const shipStatus = useAppSelector(selectShipStatus);
  const characters = useAppSelector(selectCharacters);
  const charactersStatus = useAppSelector(selectCharactersStatus);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    if (shipStatus !== "loaded") return;
    if (ship) return;
    if (charactersStatus !== "loaded") return;

    opened.current = true;
    dispatch(setHudVisible({ id: characterActionsHudId, visible: true }));
    dispatch(setHudVisible({
      id: characters.length > 0 ? characterListHudId : characterCreateHudId,
      visible: true,
    }));
  }, [characters.length, charactersStatus, dispatch, ship, shipStatus]);

  return null;
};

const SystemPageClient = () => {
  return (
    <div className="starfield h-screen w-screen overflow-hidden">
      <WarpSceneLifecycle />
      <SystemLocationLifecycle />
      <CharacterStartLifecycle />
      <StarSystemView />
    </div>
  );
};

export default SystemPageClient;
