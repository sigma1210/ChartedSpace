"use client";

import { useState } from "react";
import type { World } from "../../types";
import { buyCargoAndRefresh, sellCargoAndRefresh, type CargoLotSummary } from "../../store/slices/shipSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectActiveWorld,
  selectActiveWorldCost,
  selectActiveWorldLocation,
  selectActiveWorldName,
  selectActiveWorldTechLevel,
  selectActiveWorldTradeCodes,
  selectExpectedSalePrice,
  selectTargetWorld,
  selectTargetWorldLocation,
  selectTargetWorldName,
  selectTargetWorldTechLevel,
  selectTargetWorldTradeCodes,
  TRADE_CODE_LABELS,
  type WorldLocation,
} from "../../store/selectors/galaxy.selectors";
import {
  selectIsShipDocked,
  selectShipCargo,
} from "../../store/selectors/ship.selectors";
import { selectCurrentTurn } from "../../store/selectors/turn.selectors";
import { selectOwnerOperatorCredits } from "../../store/selectors/character.selectors";
import { selectCurrentMarketData, type CurrentMarketData } from "../../store/selectors/trade.selectors";

type TradeTab = "speculation" | "buy" | "sell";

const TRADE_TABS: Array<{ id: TradeTab; label: string }> = [
  { id: "speculation", label: "Spec" },
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
];

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
  techLevel,
  price,
  priceLabel,
  empty,
}: {
  label: string;
  world: World | null;
  worldName: string | null;
  location: WorldLocation | null;
  tradeCodes: string[];
  techLevel: number | null;
  price: number | null;
  priceLabel: string;
  empty: string;
}) => {
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

const SpeculationPanel = ({
  activeWorld,
  activeWorldName,
  activeWorldLocation,
  activeTradeCodes,
  activeWorldTechLevel,
  activeWorldCost,
  targetWorld,
  targetWorldName,
  targetWorldLocation,
  targetTradeCodes,
  targetWorldTechLevel,
  expectedSalePrice,
}: {
  activeWorld: World | null;
  activeWorldName: string | null;
  activeWorldLocation: WorldLocation | null;
  activeTradeCodes: string[];
  activeWorldTechLevel: number | null;
  activeWorldCost: number | null;
  targetWorld: World | null;
  targetWorldName: string | null;
  targetWorldLocation: WorldLocation | null;
  targetTradeCodes: string[];
  targetWorldTechLevel: number | null;
  expectedSalePrice: number | null;
}) => {
  return (
    <div className="divide-y divide-(--hud-border)">
      <TradeWorldPanel
        label="Origin"
        world={activeWorld}
        worldName={activeWorldName}
        location={activeWorldLocation}
        tradeCodes={activeTradeCodes}
        techLevel={activeWorldTechLevel}
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
        techLevel={targetWorldTechLevel}
        price={expectedSalePrice}
        priceLabel="Expected Sale"
        empty="Hover a world"
      />
    </div>
  );
};

const BuyPanel = ({
  marketData,
  onBuyCargo,
}: {
  marketData: CurrentMarketData | null;
  onBuyCargo: (commodity: string, tons: number) => Promise<void>;
}) => {
  const [commodity, setCommodity] = useState("");
  const [tons, setTons] = useState("1");
  const [buyState, setBuyState] = useState<"idle" | "buying" | "error">("idle");
  const [buyError, setBuyError] = useState<string | null>(null);

  const remainingCapacity = marketData?.remainingCapacity ?? 0;
  const defaultCommodity = marketData?.tradeCodes[0] ?? "";
  const selectedCommodity = marketData?.tradeCodes.includes(commodity)
    ? commodity
    : defaultCommodity;
  const tonsNum = parseInt(tons, 10);
  const validTons = !Number.isNaN(tonsNum) && tonsNum >= 1 && tonsNum <= remainingCapacity;
  const totalCost = validTons && marketData ? tonsNum * marketData.pricePerTon : 0;

  const resetBuyError = (value: string) => {
    setTons(value);
    setBuyState("idle");
    setBuyError(null);
  };

  const handleBuy = async () => {
    if (!selectedCommodity || !validTons || !marketData) return;
    setBuyState("buying");
    setBuyError(null);

    try {
      await onBuyCargo(selectedCommodity, tonsNum);
      setBuyState("idle");
      setTons("1");
    } catch (error) {
      setBuyError(error instanceof Error ? error.message : "Purchase failed");
      setBuyState("error");
    }
  };

  return (
    <div className="p-2">
      {!marketData && (
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
                  selectedCommodity === code
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
            disabled={!validTons || !selectedCommodity || buyState === "buying"}
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
  onSellCargo,
}: {
  cargo: CargoLotSummary[];
  isDocked: boolean;
  onSellCargo: (lotId: string) => Promise<void>;
}) => {
  const [sellingLotId, setSellingLotId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  const handleSell = async (lotId: string) => {
    setSellingLotId(lotId);
    setSellError(null);

    try {
      await onSellCargo(lotId);
    } catch (error) {
      setSellError(error instanceof Error ? error.message : "Sale failed");
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
                  Buy Cr{lot.purchasePrice.toLocaleString()}
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
              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[7px] uppercase tracking-wider">
                <span className="text-(--hud-text-dim)">Sell</span>
                <span className="text-right text-(--hud-text)">
                  {lot.saleProceeds === null ? "Cr --" : `Cr${lot.saleProceeds.toLocaleString()}`}
                </span>
                <span className="text-(--hud-text-dim)">Profit</span>
                <span
                  className={`text-right ${
                    lot.profitLoss === null
                      ? "text-(--hud-text-dim)"
                      : lot.profitLoss >= 0
                        ? "text-(--hud-accent)"
                        : "text-(--hud-error)"
                  }`}
                >
                  {lot.profitLoss === null
                    ? "Cr --"
                    : `${lot.profitLoss >= 0 ? "+" : "-"}Cr${Math.abs(lot.profitLoss).toLocaleString()}`}
                </span>
                {lot.salePricePerTon !== null && (
                  <>
                    <span className="text-(--hud-text-dim)">Rate</span>
                    <span className="text-right text-(--hud-text-dim)">
                      Cr{lot.salePricePerTon.toLocaleString()}/T
                    </span>
                  </>
                )}
              </div>
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
  activeWorldTechLevel,
  activeWorldCost,
  targetWorld,
  targetWorldName,
  targetWorldLocation,
  targetTradeCodes,
  targetWorldTechLevel,
  expectedSalePrice,
  credits,
  currentTurn,
  cargo,
  isDocked,
  marketData,
  onBuyCargo,
  onSellCargo,
}: {
  activeWorld: World | null;
  activeWorldName: string | null;
  activeWorldLocation: WorldLocation | null;
  activeTradeCodes: string[];
  activeWorldTechLevel: number | null;
  activeWorldCost: number | null;
  targetWorld: World | null;
  targetWorldName: string | null;
  targetWorldLocation: WorldLocation | null;
  targetTradeCodes: string[];
  targetWorldTechLevel: number | null;
  expectedSalePrice: number | null;
  credits?: number | null;
  currentTurn: number;
  cargo: CargoLotSummary[];
  isDocked: boolean;
  marketData: CurrentMarketData | null;
  onBuyCargo: (commodity: string, tons: number) => Promise<void>;
  onSellCargo: (lotId: string) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<TradeTab>("speculation");

  return (
    <div className="w-56 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)">
      <div className="grid grid-cols-2 gap-x-2 border-b border-(--hud-border) px-1.5 py-0.5 leading-none">
        <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Turn</span>
        <span className="text-right text-[8px] text-(--hud-accent)">
          {currentTurn.toLocaleString()}
        </span>
        <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Owner Credits</span>
        <span className="text-right text-[8px] text-(--hud-accent)">
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
          <SpeculationPanel
            activeWorld={activeWorld}
            activeWorldName={activeWorldName}
            activeWorldLocation={activeWorldLocation}
            activeTradeCodes={activeTradeCodes}
            activeWorldTechLevel={activeWorldTechLevel}
            activeWorldCost={activeWorldCost}
            targetWorld={targetWorld}
            targetWorldName={targetWorldName}
            targetWorldLocation={targetWorldLocation}
            targetTradeCodes={targetTradeCodes}
            targetWorldTechLevel={targetWorldTechLevel}
            expectedSalePrice={expectedSalePrice}
          />
        )}

        {activeTab === "buy" && <BuyPanel marketData={marketData} onBuyCargo={onBuyCargo} />}
        {activeTab === "sell" && (
          <SellPanel
            cargo={cargo}
            isDocked={isDocked}
            onSellCargo={onSellCargo}
          />
        )}
      </div>
    </div>
  );
};

export const TradeSystemHudContent = () => {
  const dispatch = useAppDispatch();
  const activeWorld = useAppSelector(selectActiveWorld);
  const activeWorldName = useAppSelector(selectActiveWorldName);
  const activeWorldLocation = useAppSelector(selectActiveWorldLocation);
  const activeTradeCodes = useAppSelector(selectActiveWorldTradeCodes);
  const activeWorldTechLevel = useAppSelector(selectActiveWorldTechLevel);
  const activeWorldCost = useAppSelector(selectActiveWorldCost);
  const targetWorld = useAppSelector(selectTargetWorld);
  const targetWorldName = useAppSelector(selectTargetWorldName);
  const targetWorldLocation = useAppSelector(selectTargetWorldLocation);
  const targetTradeCodes = useAppSelector(selectTargetWorldTradeCodes);
  const targetWorldTechLevel = useAppSelector(selectTargetWorldTechLevel);
  const expectedSalePrice = useAppSelector(selectExpectedSalePrice);
  const currentTurn = useAppSelector(selectCurrentTurn);
  const cargo = useAppSelector(selectShipCargo);
  const isDocked = useAppSelector(selectIsShipDocked);
  const credits = useAppSelector(selectOwnerOperatorCredits);
  const marketData = useAppSelector(selectCurrentMarketData);

  const handleBuyCargo = async (commodity: string, tons: number) => {
    await dispatch(buyCargoAndRefresh({ commodity, tons })).unwrap();
  };

  const handleSellCargo = async (lotId: string) => {
    await dispatch(sellCargoAndRefresh({ lotId })).unwrap();
  };

  return (
    <TradeSystemHud
      activeWorld={activeWorld}
      activeWorldName={activeWorldName}
      activeWorldLocation={activeWorldLocation}
      activeTradeCodes={activeTradeCodes}
      activeWorldTechLevel={activeWorldTechLevel}
      activeWorldCost={activeWorldCost}
      targetWorld={targetWorld}
      targetWorldName={targetWorldName}
      targetWorldLocation={targetWorldLocation}
      targetTradeCodes={targetTradeCodes}
      targetWorldTechLevel={targetWorldTechLevel}
      expectedSalePrice={expectedSalePrice}
      credits={credits}
      currentTurn={currentTurn}
      cargo={cargo}
      isDocked={isDocked}
      marketData={marketData}
      onBuyCargo={handleBuyCargo}
      onSellCargo={handleSellCargo}
    />
  );
};
