"use client";

import { PackageOpen } from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectActiveShip, selectShipStatus } from "./selectors";

type LockerTab = "weapons" | "armor" | "equipment";

const lockerTabs: Array<{ id: LockerTab; label: string }> = [
  { id: "weapons", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "equipment", label: "Equipment" },
];

export const ShipLockerHudContent = () => {
  const ship = useAppSelector(selectActiveShip);
  const status = useAppSelector(selectShipStatus);
  const [activeTab, setActiveTab] = useState<LockerTab>("weapons");

  if (status === "loading") {
    return <div className="w-80 p-2 font-mono text-[8px] uppercase text-(--hud-text-dim)">Loading locker…</div>;
  }
  if (!ship) {
    return <div className="w-80 p-2 font-mono text-[8px] uppercase text-(--hud-text-dim)">No active ship</div>;
  }
  const locker = ship.locker ?? [];
  const visibleItems = locker.filter((item) => {
    if (activeTab === "weapons") return item.kind === "weapon";
    if (activeTab === "armor") return item.kind === "armor";
    return item.kind !== "weapon" && item.kind !== "armor";
  });

  return (
    <div className="flex max-h-[48vh] w-80 flex-col overflow-hidden p-1 font-mono text-[8px] uppercase text-(--hud-text)">
      <div className="border-b border-(--hud-border-subtle) pb-1">
        <div className="text-[9px]">{ship.name} Locker</div>
        <div className="text-[7px] text-(--hud-text-dim)">{locker.length} individual items</div>
      </div>
      <div className="grid grid-cols-3 border-b border-(--hud-border-subtle) py-1">
        {lockerTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border px-1 py-1 text-[7px] ${activeTab === tab.id ? "border-(--hud-accent) bg-(--hud-surface-2) text-(--hud-accent)" : "border-(--hud-border-subtle) text-(--hud-text-dim)"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-y-auto pt-1 pr-1">
        {visibleItems.length === 0 ? (
          <div className="py-5 text-center text-(--hud-text-dim)">No {activeTab} in locker</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {visibleItems.map((item, index) => (
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
