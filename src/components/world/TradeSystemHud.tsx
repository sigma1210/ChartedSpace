"use client";

import { useEffect, useState } from "react";
import type { World } from "../../types";
import type { CargoLotSummary } from "../../store/slices/shipSlice";
import { TRADE_CODE_LABELS, type WorldLocation } from "../../store/selectors/galaxy.selectors";
import { uwpVal } from "../../lib/worldMap";

type TradeTab = "speculation" | "buy" | "sell";

const TRADE_TABS: Array<{ id: TradeTab; label: string }> = [
  { id: "speculation", label: "Spec" },
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
];

interface MarketData {
  worldName: string;
  tradeCodes: string[];
  basePricePerTon: number;
  skillModifier: number;
  pricePerTon: number;
  remainingCapacity: number;
}

const Sep = () => <span className="mx-0.5 text-(--hud-border)">›</span>;

const CodeBadge = ({
  code,
  label,
  accent = false,
}: {
  code: string;
  label?: string;
  accent?: boolean;
}) => (
  <span className="relative group">
    <span className={`border px-1 py-px ${accent ? "border-(--hud-accent) text-(--hud-accent)" : "border-(--hud-border) text-(--hud-text-dim)"}`}>
      {code}
    </span>
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap border border-(--hud-border) bg-(--hud-surface-2) px-1 py-0.5 text-[7px] text-(--hud-text) opacity-0 transition-opacity group-hover:opacity-100">
      {label ?? TRADE_CODE_LABELS[code] ?? code}
    </span>
  </span>
);

const PriceLine = ({ amount, label }: { amount: number | null; label: string }) => {
  if (amount === null) return null;
  return (
    <div className="mt-1 flex items-baseline justify-between gap-2 border border-(--hud-border) bg-(--hud-bg)/45 px-1.5 py-0.5">
      <span className="text-[7px] text-(--hud-text-dim)">{label}</span>
      <span className="font-mono text-[9px] text-(--hud-accent)">
        Cr {amount.toLocaleString()}
      </span>
    </div>
  );
};

const TradeWorldPanel = ({
  label,
  world,
  worldName,
  location,
  tradeCodes,
  price,
  priceLabel,
  empty,
}: {
  label: string;
  world: World | null;
  worldName: string | null;
  location: WorldLocation | null;
  tradeCodes: string[];
  price: number | null;
  priceLabel: string;
  empty: string;
}) => {
  const techLevel = world ? uwpVal(world.uwp.techLevel) : null;

  return (
    <div className="p-2">
      <p className="mb-1 text-[7px] uppercase tracking-widest text-(--hud-text-dim)">{label}</p>
      {location && worldName ? (
        <div className="font-mono text-[8px] uppercase tracking-wider">
          <div className="flex flex-wrap items-center">
            <span className="text-(--hud-text-dim)">{location.sectorName}</span>
            <Sep />
            <span className="text-(--hud-text-dim)">{location.subsectorName}</span>
            <Sep />
            <span className="text-(--hud-text)">{worldName}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5 text-(--hud-text-dim)">
            {tradeCodes.map((code) => <CodeBadge key={code} code={code} />)}
            {techLevel !== null && <CodeBadge code={`TL-${techLevel}`} label="Tech Level" accent />}
          </div>
          <PriceLine amount={price} label={priceLabel} />
        </div>
      ) : (
        <p className="font-mono text-[8px] italic text-(--hud-text-dim)">{empty}</p>
      )}
    </div>
  );
};

const BuyPanel = ({ onCargoPurchased }: { onCargoPurchased: () => void | Promise<void> }) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [commodity, setCommodity] = useState("");
  const [tons, setTons] = useState("1");
  const [buyState, setBuyState] = useState<"idle" | "buying" | "error">("idle");
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMarketLoading(true);
    setMarketData(null);
    setBuyError(null);

    fetch("/api/ship/market")
      .then((response) => response.ok ? response.json() : null)
      .then((data: MarketData | null) => {
        if (cancelled) return;
        setMarketData(data);
        setCommodity(data?.tradeCodes[0] ?? "");
      })
      .catch(() => {
        if (!cancelled) setMarketData(null);
      })
      .finally(() => {
        if (!cancelled) setMarketLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const remainingCapacity = marketData?.remainingCapacity ?? 0;
  const tonsNum = parseInt(tons, 10);
  const validTons = !Number.isNaN(tonsNum) && tonsNum >= 1 && tonsNum <= remainingCapacity;
  const totalCost = validTons && marketData ? tonsNum * marketData.pricePerTon : 0;

  const resetBuyError = (value: string) => {
    setTons(value);
    setBuyState("idle");
    setBuyError(null);
  };

  const handleBuy = async () => {
    if (!commodity || !validTons || !marketData) return;
    setBuyState("buying");
    setBuyError(null);

    try {
      const response = await fetch("/api/ship/cargo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, tons: tonsNum }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: string };
        setBuyError(error.error ?? "Purchase failed");
        setBuyState("error");
        return;
      }

      setBuyState("idle");
      setTons("1");
      await onCargoPurchased();
    } catch {
      setBuyError("Purchase failed");
      setBuyState("error");
    }
  };

  return (
    <div className="p-2">
      {marketLoading && (
        <p className="font-mono text-[8px] italic uppercase tracking-wider text-(--hud-text-dim) animate-pulse">
          Loading market...
        </p>
      )}

      {!marketLoading && !marketData && (
        <p className="font-mono text-[8px] italic uppercase tracking-wider text-(--hud-text-dim)">
          Market unavailable
        </p>
      )}

      {marketData && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 font-mono text-[8px]">
            <span className="truncate text-(--hud-text-dim)">{marketData.worldName}</span>
            <span className="shrink-0 text-(--hud-accent)">
              Cr{marketData.pricePerTon.toLocaleString()}/T
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {marketData.tradeCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCommodity(code);
                  setBuyState("idle");
                  setBuyError(null);
                }}
                className={`border px-1 py-px font-mono text-[7px] uppercase tracking-wider transition-colors ${
                  commodity === code
                    ? "border-(--hud-accent) bg-(--hud-accent)/10 text-(--hud-accent)"
                    : "border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent)"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[8px]">
            <input
              type="number"
              value={tons}
              min={1}
              max={remainingCapacity}
              onChange={(event) => resetBuyError(event.target.value)}
              className="h-5 w-12 border border-(--hud-border) bg-(--hud-surface-2) px-1 text-right text-[8px] text-(--hud-text) outline-none focus:border-(--hud-accent)"
            />
            <span className="text-(--hud-text-dim)">/ {remainingCapacity}T</span>
            <button
              type="button"
              onClick={() => resetBuyError(String(remainingCapacity))}
              disabled={remainingCapacity <= 0}
              className="h-5 border border-(--hud-border) px-1 text-[7px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent) disabled:cursor-not-allowed disabled:opacity-40"
            >
              Fill
            </button>
          </div>

          {validTons && (
            <div className="font-mono text-[8px] text-(--hud-text-dim)">
              Total <span className="text-(--hud-text)">Cr{totalCost.toLocaleString()}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleBuy}
            disabled={!validTons || !commodity || buyState === "buying"}
            className="h-6 border border-(--hud-accent) px-2 font-mono text-[8px] uppercase tracking-wider text-(--hud-accent) transition-colors hover:bg-(--hud-accent)/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {buyState === "buying" ? "Buying..." : "Buy Cargo"}
          </button>

          {buyError && (
            <p className="font-mono text-[8px] text-(--hud-error)">{buyError}</p>
          )}
        </div>
      )}
    </div>
  );
};

const SellPanel = ({
  cargo,
  isDocked,
  onCargoSold,
}: {
  cargo: CargoLotSummary[];
  isDocked: boolean;
  onCargoSold: () => void | Promise<void>;
}) => {
  const [sellingLotId, setSellingLotId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  const handleSell = async (lotId: string) => {
    setSellingLotId(lotId);
    setSellError(null);

    try {
      const response = await fetch(`/api/ship/cargo/${lotId}/sell`, { method: "POST" });

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: string };
        setSellError(error.error ?? "Sale failed");
        return;
      }

      await onCargoSold();
    } catch {
      setSellError("Sale failed");
    } finally {
      setSellingLotId(null);
    }
  };

  return (
    <div className="p-2">
      {!isDocked && (
        <p className="font-mono text-[8px] italic uppercase tracking-wider text-(--hud-text-dim)">
          Ship must be docked
        </p>
      )}

      {isDocked && cargo.length === 0 && (
        <p className="font-mono text-[8px] italic uppercase tracking-wider text-(--hud-text-dim)">
          Empty hold
        </p>
      )}

      {isDocked && cargo.length > 0 && (
        <div className="flex flex-col gap-1">
          {cargo.map((lot) => (
            <div
              key={lot.id}
              className="border border-(--hud-border) bg-(--hud-bg)/35 px-1.5 py-1"
            >
              <div className="flex items-center gap-1.5 font-mono text-[8px]">
                <span className="w-8 shrink-0 border border-(--hud-border) px-0.5 text-center text-[7px] text-(--hud-text-dim)">
                  {lot.commodity}
                </span>
                <span className="w-8 shrink-0 text-right text-(--hud-text)">
                  {lot.tons}T
                </span>
                <span className="min-w-0 flex-1 truncate text-(--hud-text-dim)">
                  Cr{lot.purchasePrice.toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleSell(lot.id)}
                  disabled={sellingLotId === lot.id}
                  className="h-4 shrink-0 border border-(--hud-border) px-1 text-[7px] uppercase tracking-wider text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-accent) disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sellingLotId === lot.id ? "..." : "Sell"}
                </button>
              </div>
              {lot.originWorldName && (
                <p className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-(--hud-text-dim)">
                  Origin {lot.originWorldName}
                </p>
              )}
            </div>
          ))}

          {sellError && (
            <p className="font-mono text-[8px] text-(--hud-error)">{sellError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export const TradeSystemHud = ({
  activeWorld,
  activeWorldName,
  activeWorldLocation,
  activeTradeCodes,
  activeWorldCost,
  targetWorld,
  targetWorldName,
  targetWorldLocation,
  targetTradeCodes,
  expectedSalePrice,
  credits,
  cargo,
  isDocked,
  onCargoPurchased,
  onCargoSold,
}: {
  activeWorld: World | null;
  activeWorldName: string | null;
  activeWorldLocation: WorldLocation | null;
  activeTradeCodes: string[];
  activeWorldCost: number | null;
  targetWorld: World | null;
  targetWorldName: string | null;
  targetWorldLocation: WorldLocation | null;
  targetTradeCodes: string[];
  expectedSalePrice: number | null;
  credits?: number | null;
  cargo: CargoLotSummary[];
  isDocked: boolean;
  onCargoPurchased: () => void | Promise<void>;
  onCargoSold: () => void | Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<TradeTab>("speculation");

  return (
    <div className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="flex h-4 items-center justify-between border-b border-(--hud-border) px-1.5">
        <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Credits</span>
        <span className="text-[8px] text-(--hud-accent)">
          {typeof credits === "number" ? `Cr ${credits.toLocaleString()}` : "Cr --"}
        </span>
      </div>
      <div className="flex border-b border-(--hud-border)">
        {TRADE_TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveTab(tab.id)}
              className={`h-3.5 flex-1 border-r border-(--hud-border) px-0.5 text-[7px] leading-none tracking-wider transition-colors last:border-r-0 ${
                selected
                  ? "bg-(--hud-accent)/12 text-(--hud-accent)"
                  : "text-(--hud-text-dim)/75 hover:bg-(--hud-bg)/35 hover:text-(--hud-text)"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="h-40 overflow-y-auto">
        {activeTab === "speculation" && (
          <div className="divide-y divide-(--hud-border)">
            <TradeWorldPanel
              label="Origin"
              world={activeWorld}
              worldName={activeWorldName}
              location={activeWorldLocation}
              tradeCodes={activeTradeCodes}
              price={activeWorldCost}
              priceLabel="Market"
              empty="No world selected"
            />
            <TradeWorldPanel
              label="Destination"
              world={targetWorld}
              worldName={targetWorldName}
              location={targetWorldLocation}
              tradeCodes={targetTradeCodes}
              price={expectedSalePrice}
              priceLabel="Expected Sale"
              empty="Hover a world"
            />
          </div>
        )}

        {activeTab === "buy" && <BuyPanel onCargoPurchased={onCargoPurchased} />}
        {activeTab === "sell" && (
          <SellPanel
            cargo={cargo}
            isDocked={isDocked}
            onCargoSold={onCargoSold}
          />
        )}
      </div>
    </div>
  );
};
