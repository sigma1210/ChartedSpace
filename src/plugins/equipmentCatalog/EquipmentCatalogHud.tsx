"use client";

import { useCallback, useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { refreshCharacters } from "@/plugins/characters";
import { refreshShip } from "@/plugins/ship";
import { useAppDispatch } from "@/store/hooks";

interface ModifierLine {
  label: string;
  value: number;
}

interface MarketItem {
  id: string;
  name: string;
  kind: "weapon" | "armor";
  techLevel: number;
  price: number;
  purchasePrice: number;
  availabilityRequired: boolean;
  modifierLines: ModifierLine[];
  totalModifier: number;
  retryAvailable: boolean;
  retryTurn: number | null;
}

interface EquipmentMarket {
  world: {
    name: string;
    lawLevel: number;
    techLevel: number;
    population: number;
    starport: string;
  };
  currentTurn: number;
  ownerCredits: number;
  crew: Array<{ id: string; name: string; skillLevel: number }>;
  purchaser: { id: string; name: string; skillLevel: number };
  priceMultiplier: 1 | 2 | 3;
  items: MarketItem[];
}

interface PurchaseResult {
  succeeded: boolean;
  availabilityRequired: boolean;
  item: { id: string; name: string };
  purchaserName: string;
  price: number;
  dice: readonly [number, number] | null;
  rawRoll: number | null;
  modifierLines: ModifierLine[];
  totalModifier: number | null;
  total: number | null;
}

const signed = (value: number) => value >= 0 ? `+${value}` : `${value}`;

const requestMarket = async (
  purchaserCrewId: string,
  priceMultiplier: 1 | 2 | 3,
) => {
  const params = new URLSearchParams({ priceMultiplier: String(priceMultiplier) });
  if (purchaserCrewId) params.set("purchaserCrewId", purchaserCrewId);
  const response = await fetch(`/api/catalog/equipment?${params}`);
  const data = await response.json() as { market?: EquipmentMarket; error?: string };
  if (!response.ok || !data.market) throw new Error(data.error ?? "Unable to load catalog");
  return data.market;
};

export const EquipmentCatalogHudContent = () => {
  const dispatch = useAppDispatch();
  const [market, setMarket] = useState<EquipmentMarket | null>(null);
  const [purchaserCrewId, setPurchaserCrewId] = useState("");
  const [priceMultiplier, setPriceMultiplier] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<"loading" | "ready" | "buying" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);

  const loadMarket = useCallback(async () => {
    try {
      const nextMarket = await requestMarket(purchaserCrewId, priceMultiplier);
      setMarket(nextMarket);
      setPurchaserCrewId((current) => current || nextMarket.purchaser.id);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load catalog");
      setStatus("error");
    }
  }, [priceMultiplier, purchaserCrewId]);

  useEffect(() => {
    let active = true;
    void requestMarket(purchaserCrewId, priceMultiplier)
      .then((nextMarket) => {
        if (!active) return;
        setMarket(nextMarket);
        setPurchaserCrewId((current) => current || nextMarket.purchaser.id);
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load catalog");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [priceMultiplier, purchaserCrewId]);

  const purchase = async (catalogItemId: string) => {
    if (!market) return;
    setStatus("buying");
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/catalog/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogItemId, purchaserCrewId: market.purchaser.id, priceMultiplier }),
      });
      const data = await response.json() as { result?: PurchaseResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Purchase failed");
      setResult(data.result);
      await Promise.all([
        loadMarket(),
        dispatch(refreshShip()),
        dispatch(refreshCharacters()),
      ]);
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Purchase failed");
      setStatus("error");
    }
  };

  if (!market && status === "loading") {
    return <div className="w-96 p-2 font-mono text-[8px] uppercase text-(--hud-text-dim)">Loading catalog…</div>;
  }

  return (
    <div className="flex max-h-[68vh] w-[30rem] flex-col gap-1.5 overflow-hidden p-1 font-mono text-[8px] text-(--hud-text)">
      {market && (
        <>
          <div className="grid grid-cols-2 gap-1 border-b border-(--hud-border-subtle) pb-1">
            <div>
              <div className="text-[9px] uppercase text-(--hud-text)">{market.world.name}</div>
              <div className="text-[7px] uppercase text-(--hud-text-dim)">
                Starport {market.world.starport} · TL {market.world.techLevel} · Law {market.world.lawLevel} · Turn {market.currentTurn}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[7px] uppercase text-(--hud-text-dim)">Owner funds</div>
              <div className="text-[9px] text-(--hud-accent)">Cr {market.ownerCredits.toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <label className="flex flex-col gap-0.5 uppercase text-(--hud-text-dim)">
              Purchaser
              <select
                value={market.purchaser.id}
                onChange={(event) => {
                  setResult(null);
                  setError(null);
                  setStatus("loading");
                  setPurchaserCrewId(event.target.value);
                }}
                className="h-6 border border-(--hud-border) bg-(--hud-surface-2) px-1 text-[8px] text-(--hud-text)"
              >
                {market.crew.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.skillLevel >= 0 ? signed(member.skillLevel) : "untrained -3"})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 uppercase text-(--hud-text-dim)">
              Offered price
              <select
                value={priceMultiplier}
                onChange={(event) => {
                  setResult(null);
                  setError(null);
                  setStatus("loading");
                  setPriceMultiplier(Number(event.target.value) as 1 | 2 | 3);
                }}
                className="h-6 border border-(--hud-border) bg-(--hud-surface-2) px-1 text-[8px] text-(--hud-text)"
              >
                <option value={1}>Listed price</option>
                <option value={2}>Double price (DM+1)</option>
                <option value={3}>Triple price (DM+2)</option>
              </select>
            </label>
          </div>

          {result && (
            <div className={`border px-1.5 py-1 ${result.succeeded ? "border-(--hud-success) text-(--hud-success)" : "border-(--hud-error) text-(--hud-error)"}`}>
              {!result.availabilityRequired
                ? `PURCHASED · ${result.item.name} · Cr ${result.price.toLocaleString()}`
                : `${result.succeeded ? "PURCHASED" : "NOT FOUND"} · ${result.item.name} · 2D6: [${result.dice![0]}] + [${result.dice![1]}] = ${result.rawRoll} · DM ${signed(result.totalModifier!)} · total ${result.total}`}
            </div>
          )}
          {error && <div className="border border-(--hud-error) px-1.5 py-1 text-(--hud-error)">{error}</div>}

          <div className="min-h-0 overflow-y-auto pr-1">
            <ul className="flex flex-col gap-1">
              {market.items.map((item) => {
                const affordable = market.ownerCredits >= item.purchasePrice;
                const disabled = status === "buying" || !item.retryAvailable || !affordable;
                return (
                  <li key={item.id} className="border border-(--hud-border-subtle) bg-(--hud-surface-2)/60 p-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase text-(--hud-text)">{item.name}</div>
                        <div className="text-[7px] uppercase text-(--hud-text-dim)">
                          {item.kind} · TL {item.techLevel} · listed Cr {item.price.toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void purchase(item.id)}
                        disabled={disabled}
                        className={`min-h-6 shrink-0 border px-2 uppercase ${
                          !item.retryAvailable
                            ? "border-(--hud-error) text-(--hud-error)"
                            : "border-(--hud-accent) text-(--hud-accent)"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                        title={!item.retryAvailable ? `Retry on turn ${item.retryTurn}` : !affordable ? "Insufficient funds" : `Attempt to buy ${item.name}`}
                      >
                        {!item.retryAvailable
                          ? `Retry turn ${item.retryTurn}`
                          : item.availabilityRequired
                            ? `Check · Cr ${item.purchasePrice.toLocaleString()}`
                            : `Buy · Cr ${item.purchasePrice.toLocaleString()}`}
                      </button>
                    </div>
                    {!item.retryAvailable && (
                      <div className="mt-1 border border-(--hud-error) bg-(--hud-error)/10 px-1 py-0.5 text-[7px] uppercase text-(--hud-error)">
                        Availability attempt failed — retry on turn {item.retryTurn}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-2 text-[7px] text-(--hud-text-dim)">
                      {item.availabilityRequired ? (
                        <>
                          {item.modifierLines.map((line) => (
                            <span key={line.label}>{line.label} {signed(line.value)}</span>
                          ))}
                          <span className="text-(--hud-text)">Total DM {signed(item.totalModifier)}</span>
                        </>
                      ) : (
                        <span className="text-(--hud-success)">Available locally · no check required</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
      {!market && error && <div className="border border-(--hud-error) p-2 text-(--hud-error)">{error}</div>}
    </div>
  );
};

export const EquipmentCatalogHudIcon = ShoppingBag;
