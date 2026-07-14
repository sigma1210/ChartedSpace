"use client";

import "@/lib/turns/index";
import { useEffect, useRef } from "react";
import Link from "next/link";
import StarSystemView from "@/components/world/StarSystemView";
import { WarpSceneLifecycle } from "@/components/world/WarpSceneLifecycle";
import { SystemLocationLifecycle } from "@/components/world/SystemLocationLifecycle";
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
    if (characters.length > 0) {
      dispatch(setHudVisible({ id: characterListHudId, visible: true }));
    } else {
      dispatch(openModal("characterGeneration"));
    }
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
      <Link href="/system/tactical" className="absolute right-4 top-4 z-40 border border-cyan-400/70 bg-slate-950/90 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100 shadow-lg shadow-cyan-950/40 hover:bg-cyan-950">
        Tactical map
      </Link>
    </div>
  );
};

export default SystemPageClient;
