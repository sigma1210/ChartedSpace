"use client";

import { ClipboardList, Gauge, PackageOpen, Ship, UsersRound } from "lucide-react";
import { HudIconButton } from "@/components/world/HudPrimitives";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectHudVisible } from "@/store/selectors/hud.selectors";
import { setHudVisible } from "@/store/slices/hudSlice";
import { openModal } from "@/store/slices/uiSlice";
import { selectActiveShip } from "./selectors";
import { shipCrewListHudId, shipHudId, shipLockerHudId } from "./metadata";

export const ShipsPluginBar = () => {
  const dispatch = useAppDispatch();
  const ship = useAppSelector(selectActiveShip);
  const shipHudVisible = useAppSelector(selectHudVisible(shipHudId));
  const crewListHudVisible = useAppSelector(selectHudVisible(shipCrewListHudId));
  const lockerHudVisible = useAppSelector(selectHudVisible(shipLockerHudId));
  const ships = ship ? [ship] : [];

  const openShipHud = () => {
    dispatch(setHudVisible({ id: shipHudId, visible: true }));
  };

  const openCrewModal = () => {
    dispatch(openModal("shipCrewAssignment"));
  };

  const openCrewListHud = () => {
    dispatch(setHudVisible({ id: shipCrewListHudId, visible: true }));
  };

  const openLockerHud = () => {
    dispatch(setHudVisible({ id: shipLockerHudId, visible: true }));
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {ships.length > 0 ? (
          ships.map((item) => (
            <HudIconButton
              key={item.id}
              title={shipHudVisible ? `${item.name} systems visible` : `Open ${item.name}`}
              onClick={openShipHud}
            >
              <Ship size={13} aria-hidden="true" />
            </HudIconButton>
          ))
        ) : (
          <span className="font-mono text-[8px] uppercase tracking-wider text-(--hud-text-dim)">
            No ship
          </span>
        )}
        <HudIconButton
          title={shipHudVisible ? "Ship systems visible" : "Open ship systems"}
          onClick={openShipHud}
        >
          <Gauge size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={lockerHudVisible ? "Ship locker visible" : "Open ship locker"}
          onClick={openLockerHud}
        >
          <PackageOpen size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title="Manage ship crew"
          onClick={openCrewModal}
        >
          <UsersRound size={13} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={crewListHudVisible ? "Ship crew list visible" : "Open ship crew list"}
          onClick={openCrewListHud}
        >
          <ClipboardList size={13} aria-hidden="true" />
        </HudIconButton>
      </div>
      {ships.length > 0 && (
        <div className="max-w-36 truncate font-mono text-[7px] uppercase tracking-wider text-(--hud-text-dim)">
          {ships.map((item) => item.name).join(" / ")}
        </div>
      )}
    </div>
  );
};
