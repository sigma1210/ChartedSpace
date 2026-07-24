"use client";

import { PackageOpen } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { selectActiveShip, selectShipStatus } from "./selectors";

export const ShipLockerHudContent = () => {
  const ship = useAppSelector(selectActiveShip);
  const status = useAppSelector(selectShipStatus);

  if (status === "loading") {
    return <div className="w-80 p-2 font-mono text-[8px] uppercase text-(--hud-text-dim)">Loading locker…</div>;
  }
  if (!ship) {
    return <div className="w-80 p-2 font-mono text-[8px] uppercase text-(--hud-text-dim)">No active ship</div>;
  }
  const locker = ship.locker ?? [];

  return (
    <div className="flex max-h-[48vh] w-80 flex-col overflow-hidden p-1 font-mono text-[8px] uppercase text-(--hud-text)">
      <div className="border-b border-(--hud-border-subtle) pb-1">
        <div className="text-[9px]">{ship.name} Locker</div>
        <div className="text-[7px] text-(--hud-text-dim)">{locker.length} individual items</div>
      </div>
      <div className="min-h-0 overflow-y-auto pt-1 pr-1">
        {locker.length === 0 ? (
          <div className="py-5 text-center text-(--hud-text-dim)">Locker is empty</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {locker.map((item, index) => (
              <li key={item.id} className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/60 px-1.5 py-1">
                <div className="flex justify-between gap-2">
                  <span className="text-[9px] text-(--hud-text)">{item.name}</span>
                  <span className="shrink-0 text-(--hud-accent)">#{index + 1}</span>
                </div>
                <div className="text-[7px] text-(--hud-text-dim)">
                  {item.kind} · Cr {item.purchasePrice.toLocaleString()} · turn {item.purchasedAtTurn} · {item.purchasedAtLocation}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export const ShipLockerHudIcon = PackageOpen;
