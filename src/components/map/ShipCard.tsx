"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchShip, invalidateShip } from "../../store/slices/shipSlice";
import { invalidateCharacters } from "../../store/slices/characterSlice";
import { selectShip, selectShipStatus } from "../../store/selectors/ship.selectors";

const ROLE_LABELS: Record<string, string> = {
  pilot:     "PILOT",
  navigator: "NAV",
  engineer:  "ENG",
  steward:   "STEW",
  gunner:    "GUN",
  medic:     "MED",
};

const SHIP_LABELS: Record<string, { label: string; designation: string }> = {
  free_trader: { label: "Free Trader", designation: "Type A" },
};

interface MarketData {
  worldName:         string;
  tradeCodes:        string[];
  basePricePerTon:   number;
  skillModifier:     number;
  pricePerTon:       number;
  remainingCapacity: number;
}

const ShipCard = () => {
  const dispatch   = useAppDispatch();
  const ship       = useAppSelector(selectShip);
  const shipStatus = useAppSelector(selectShipStatus);

  const [collapsed,     setCollapsed]     = useState(false);
  const [cargoOpen,     setCargoOpen]     = useState(false);
  const [marketOpen,    setMarketOpen]    = useState(false);
  const [marketData,    setMarketData]    = useState<MarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [commodity,     setCommodity]     = useState("");
  const [tons,          setTons]          = useState("1");
  const [buyState,      setBuyState]      = useState<"idle" | "buying" | "error">("idle");
  const [buyError,      setBuyError]      = useState<string | null>(null);

  useEffect(() => { dispatch(fetchShip()); }, [dispatch]);

  // Fetch market data whenever the panel opens
  useEffect(() => {
    if (!marketOpen) return;
    setMarketLoading(true);
    setMarketData(null);
    fetch("/api/ship/market")
      .then(r => r.json())
      .then((d: MarketData) => {
        setMarketData(d);
        setCommodity(d.tradeCodes[0] ?? "General");
      })
      .catch(() => setMarketData(null))
      .finally(() => setMarketLoading(false));
  }, [marketOpen]);

  const typeInfo = ship ? (SHIP_LABELS[ship.type] ?? { label: ship.type, designation: "" }) : null;
  const usedTons = ship?.cargo.reduce((sum, lot) => sum + lot.tons, 0) ?? 0;

  const tonsNum      = parseInt(tons, 10);
  const validTons    = !isNaN(tonsNum) && tonsNum >= 1 && tonsNum <= (marketData?.remainingCapacity ?? 0);
  const totalCost    = validTons && marketData ? tonsNum * marketData.pricePerTon : 0;

  const handleBuy = async () => {
    if (!commodity || !validTons || !marketData) return;
    setBuyState("buying");
    setBuyError(null);
    try {
      const res = await fetch("/api/ship/cargo", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ commodity, tons: tonsNum }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setBuyError(err.error ?? "Purchase failed");
        setBuyState("error");
        return;
      }
      setBuyState("idle");
      setTons("1");
      setMarketData(m => m ? { ...m, remainingCapacity: m.remainingCapacity - tonsNum } : m);
      dispatch(invalidateShip());
      dispatch(fetchShip());
      dispatch(invalidateCharacters());
    } catch {
      setBuyError("Purchase failed");
      setBuyState("error");
    }
  };

  return (
    <div className="hud-panel w-52 shrink-0">
      <div className="hud-panel-header flex items-center justify-between gap-2">
        <span className="truncate text-[10px]">Ship</span>
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="shrink-0 text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
        >
          {collapsed
            ? <ChevronDown size={12} strokeWidth={1.5} />
            : <ChevronUp   size={12} strokeWidth={1.5} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col divide-y divide-(--hud-border)">

          {shipStatus === "loading" && (
            <p className="p-2 font-mono text-[9px] text-(--hud-text-dim) italic animate-pulse">
              Loading…
            </p>
          )}

          {shipStatus === "loaded" && !ship && (
            <p className="p-2 font-mono text-[9px] text-(--hud-text-dim) italic">
              No ship registered
            </p>
          )}

          {ship && (
            <>
              {/* Ship details */}
              <div className="p-2 flex flex-col gap-1 font-mono text-[9px]">
                <span className="text-(--hud-text) font-bold">{ship.name}</span>
                {typeInfo && (
                  <span className="text-(--hud-text-dim)">
                    {typeInfo.label}{typeInfo.designation ? ` · ${typeInfo.designation}` : ""}
                  </span>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={ship.status === "docked" ? "text-(--hud-accent)" : "text-(--hud-text-dim)"}>
                    {ship.status === "docked" ? "Docked" : "In Jump"}
                  </span>
                  <span className="text-(--hud-border)">·</span>
                  <span className="text-(--hud-text-dim)">J-{ship.jumpRating}</span>
                </div>
                {ship.worldName && (
                  <span className="text-(--hud-text-dim)">
                    {ship.worldName}{ship.sectorAbbr ? ` · ${ship.sectorAbbr}` : ""}
                  </span>
                )}
                {ship.isMortgaged && (
                  <span className="text-(--hud-text-dim)">Mortgaged</span>
                )}
              </div>

              {/* Crew */}
              <div className="p-2">
                <p className="mb-1.5 text-[9px] uppercase tracking-widest text-(--hud-text-dim)">Crew</p>
                <div className="flex flex-col gap-0.5">
                  {ship.crew.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 font-mono text-[9px]">
                      <span className="w-9 shrink-0 text-(--hud-text-dim)">
                        {ROLE_LABELS[c.role] ?? c.role.toUpperCase()}
                      </span>
                      <span className={`flex-1 truncate ${c.characterName ? "text-(--hud-text)" : "text-(--hud-text-dim) italic"}`}>
                        {c.characterName ?? "—"}
                      </span>
                      {c.isOwnerOperator && (
                        <span className="text-(--hud-accent)" title="Owner-operator">★</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cargo */}
              <div>
                <button
                  onClick={() => setCargoOpen(o => !o)}
                  className="w-full p-2 flex items-center justify-between text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
                >
                  <span className="font-mono text-[9px] uppercase tracking-widest">
                    Cargo
                    {ship.cargoCapacity > 0 && (
                      <span className="ml-1.5 normal-case tracking-normal">
                        {usedTons} / {ship.cargoCapacity}T
                      </span>
                    )}
                  </span>
                  {cargoOpen
                    ? <ChevronUp   size={10} strokeWidth={1.5} />
                    : <ChevronDown size={10} strokeWidth={1.5} />}
                </button>

                {cargoOpen && (
                  <div className="px-2 pb-2">
                    {ship.cargo.length === 0 ? (
                      <p className="font-mono text-[9px] text-(--hud-text-dim) italic">Empty hold</p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        {ship.cargo.map(lot => (
                          <div key={lot.id} className="flex items-center gap-1.5 font-mono text-[9px]">
                            <span className="w-6 shrink-0 border border-(--hud-border) px-0.5 text-center text-(--hud-text-dim)">
                              {lot.commodity}
                            </span>
                            <span className="w-7 shrink-0 text-right text-(--hud-text)">
                              {lot.tons}T
                            </span>
                            <span className="text-(--hud-text-dim)">
                              Cr{lot.purchasePrice.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Market — only when docked */}
              {ship.status === "docked" && (
                <div>
                  <button
                    onClick={() => setMarketOpen(o => !o)}
                    className="w-full p-2 flex items-center justify-between text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-widest">Market</span>
                    {marketOpen
                      ? <ChevronUp   size={10} strokeWidth={1.5} />
                      : <ChevronDown size={10} strokeWidth={1.5} />}
                  </button>

                  {marketOpen && (
                    <div className="px-2 pb-2 flex flex-col gap-2">

                      {marketLoading && (
                        <p className="font-mono text-[9px] text-(--hud-text-dim) italic animate-pulse">
                          Loading market…
                        </p>
                      )}

                      {!marketLoading && !marketData && (
                        <p className="font-mono text-[9px] text-(--hud-text-dim) italic">
                          Market unavailable
                        </p>
                      )}

                      {marketData && (
                        <>
                          {/* Price per ton */}
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <span className="text-(--hud-text-dim)">{marketData.worldName}</span>
                            <span className="text-(--hud-accent)">
                              Cr{marketData.pricePerTon.toLocaleString()}/T
                            </span>
                          </div>

                          {/* Commodity selector */}
                          <div className="flex flex-wrap gap-1">
                            {[...marketData.tradeCodes, "General"].map(code => (
                              <button
                                key={code}
                                onClick={() => setCommodity(code)}
                                className={[
                                  "font-mono text-[9px] border px-1 py-px transition-colors",
                                  commodity === code
                                    ? "border-(--hud-accent) text-(--hud-accent) bg-(--hud-accent)/5"
                                    : "border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent)",
                                ].join(" ")}
                              >
                                {code}
                              </button>
                            ))}
                          </div>

                          {/* Tonnage input */}
                          <div className="flex items-center gap-1.5 font-mono text-[9px]">
                            <input
                              type="number"
                              value={tons}
                              min={1}
                              max={marketData.remainingCapacity}
                              onChange={e => { setTons(e.target.value); setBuyState("idle"); setBuyError(null); }}
                              className="w-14 bg-(--hud-surface-2) border border-(--hud-border) focus:border-(--hud-accent) text-(--hud-text) px-1.5 py-0.5 outline-none text-right"
                            />
                            <span className="text-(--hud-text-dim)">
                              / {marketData.remainingCapacity}T
                            </span>
                          </div>

                          {/* Total cost */}
                          {validTons && (
                            <div className="font-mono text-[9px] text-(--hud-text-dim)">
                              Total{" "}
                              <span className="text-(--hud-text)">
                                Cr{totalCost.toLocaleString()}
                              </span>
                            </div>
                          )}

                          {/* Buy button */}
                          <button
                            onClick={handleBuy}
                            disabled={!validTons || !commodity || buyState === "buying"}
                            className="font-mono text-[9px] uppercase tracking-widest border border-(--hud-accent) text-(--hud-accent) px-2 py-1 hover:bg-(--hud-accent)/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {buyState === "buying" ? "Buying…" : "Buy Cargo"}
                          </button>

                          {buyError && (
                            <p className="font-mono text-[9px] text-(--hud-error)">{buyError}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShipCard;
