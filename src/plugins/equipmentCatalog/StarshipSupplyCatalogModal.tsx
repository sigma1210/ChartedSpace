"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Check,
  ChevronRight,
  Crosshair,
  FileSearch,
  Search,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { refreshCharacters } from "@/plugins/characters";
import { refreshShip } from "@/plugins/ship";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveModal } from "@/store/selectors/ui.selectors";
import { closeModal } from "@/store/slices/uiSlice";

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
  totalModifier: number | null;
  total: number | null;
}

type Department = "all" | "weapon" | "armor";

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

const TechnicalPlaceholder = ({ kind }: { kind: MarketItem["kind"] }) => (
  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 text-slate-400">
    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:18px_18px]" />
    <div className="relative rounded-lg border border-slate-300 bg-white/85 p-3 shadow-sm">
      {kind === "weapon" ? <Crosshair size={30} strokeWidth={1.25} /> : <Shield size={30} strokeWidth={1.25} />}
    </div>
  </div>
);

const TechnicalProductImage = ({
  item,
  sizes,
}: {
  item: MarketItem;
  sizes: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <TechnicalPlaceholder kind={item.kind} />;

  return (
    <Image
      src={`/images/ssc/${item.id}.png`}
      alt={item.name}
      fill
      sizes={sizes}
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
};

export const StarshipSupplyCatalogModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const visible = activeModal === "starshipSupplyCatalog";
  const [market, setMarket] = useState<EquipmentMarket | null>(null);
  const [purchaserCrewId, setPurchaserCrewId] = useState("");
  const [priceMultiplier, setPriceMultiplier] = useState<1 | 2 | 3>(1);
  const [status, setStatus] = useState<"loading" | "ready" | "buying" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [department, setDepartment] = useState<Department>("all");
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    const nextMarket = await requestMarket(purchaserCrewId, priceMultiplier);
    setMarket(nextMarket);
    setPurchaserCrewId((current) => current || nextMarket.purchaser.id);
    setStatus("ready");
  }, [priceMultiplier, purchaserCrewId]);

  useEffect(() => {
    if (!visible) return;
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
  }, [priceMultiplier, purchaserCrewId, visible]);

  useEffect(() => {
    if (!visible) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(closeModal());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dispatch, visible]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (market?.items ?? []).filter((item) => {
      if (department !== "all" && item.kind !== department) return false;
      return !normalizedQuery
        || item.name.toLowerCase().includes(normalizedQuery)
        || item.kind.toLowerCase().includes(normalizedQuery)
        || item.id.toLowerCase().includes(normalizedQuery);
    });
  }, [department, market?.items, query]);

  const selectedItem = market?.items.find((item) => item.id === selectedItemId) ?? null;

  const purchase = async (item: MarketItem) => {
    if (!market) return;
    setStatus("buying");
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/catalog/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogItemId: item.id,
          purchaserCrewId: market.purchaser.id,
          priceMultiplier,
        }),
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

  const choosePurchaser = (id: string) => {
    setResult(null);
    setError(null);
    setStatus("loading");
    setPurchaserCrewId(id);
  };

  const chooseMultiplier = (multiplier: 1 | 2 | 3) => {
    setResult(null);
    setError(null);
    setStatus("loading");
    setPriceMultiplier(multiplier);
  };

  return (
    <div
      aria-hidden={!visible}
      className={[
        "fixed inset-0 z-60 flex items-center justify-center bg-slate-950/55 p-3 font-sans text-slate-900 backdrop-blur-md transition-opacity md:p-6",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      onClick={() => dispatch(closeModal())}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Starship Supply Company equipment catalog"
        className="flex h-[min(94vh,900px)] w-[min(98vw,1500px)] flex-col overflow-hidden rounded-md border border-slate-300 bg-slate-100 shadow-[0_35px_100px_rgba(15,23,42,.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-slate-300 bg-white">
          <div className="flex items-center justify-between gap-4 px-5 py-3 md:px-7">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-sm bg-blue-950 text-white">
                <Boxes size={23} strokeWidth={1.6} />
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-[0.06em] text-blue-950">STARSHIP SUPPLY COMPANY</div>
                <div className="text-[10px] font-semibold tracking-[0.22em] text-slate-500">CERTIFIED TECHNICAL PROCUREMENT</div>
              </div>
            </div>
            <div className="hidden items-center gap-5 text-xs text-slate-600 lg:flex">
              {market && (
                <>
                  <div>
                    <span className="font-semibold text-slate-900">{market.world.name}</span>
                    <span className="ml-2">PORT {market.world.starport} · TL {market.world.techLevel} · LL {market.world.lawLevel}</span>
                  </div>
                  <div className="border-l border-slate-300 pl-5">
                    <span className="text-slate-500">AVAILABLE FUNDS</span>
                    <span className="ml-2 font-mono font-bold text-blue-900">Cr {market.ownerCredits.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => dispatch(closeModal())}
              aria-label="Close Starship Supply Company"
              className="rounded-sm border border-slate-300 bg-white p-2 text-slate-500 transition hover:border-blue-700 hover:text-blue-900"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 md:grid-cols-[1fr_auto_auto] md:px-7">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search part name, classification, or stock code"
                className="h-10 w-full rounded-sm border border-slate-300 bg-white pr-3 pl-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <select
              value={market?.purchaser.id ?? purchaserCrewId}
              onChange={(event) => choosePurchaser(event.target.value)}
              aria-label="Procurement officer"
              className="h-10 min-w-52 rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-700"
            >
              {market?.crew.map((member) => (
                <option key={member.id} value={member.id}>
                  Procurement: {member.name} ({member.skillLevel >= 0 ? signed(member.skillLevel) : "untrained -3"})
                </option>
              ))}
            </select>
            <select
              value={priceMultiplier}
              onChange={(event) => chooseMultiplier(Number(event.target.value) as 1 | 2 | 3)}
              aria-label="Procurement offer"
              className="h-10 min-w-44 rounded-sm border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-700"
            >
              <option value={1}>Standard quotation</option>
              <option value={2}>Priority quotation · DM+1</option>
              <option value={3}>Expedited quotation · DM+2</option>
            </select>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-300 bg-white px-5 md:px-7">
            <SlidersHorizontal size={14} className="mr-3 shrink-0 text-slate-400" />
            {([
              ["all", "All stock"],
              ["weapon", "Weapon systems"],
              ["armor", "Protective systems"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setDepartment(id);
                  setSelectedItemId(null);
                }}
                className={`shrink-0 border-b-2 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.1em] transition ${department === id ? "border-blue-800 text-blue-950" : "border-transparent text-slate-500 hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto hidden font-mono text-[11px] text-slate-500 sm:block">{visibleItems.length} RECORDS</span>
          </div>

          {(result || error) && (
            <div className="shrink-0 border-b border-slate-300 bg-white px-5 py-3 md:px-7">
              {result && (
                <div className={`flex items-center gap-2 border-l-4 px-3 py-2 text-xs ${result.succeeded ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-rose-600 bg-rose-50 text-rose-900"}`}>
                  {result.succeeded ? <Check size={15} /> : <X size={15} />}
                  <strong>{result.succeeded ? "PROCUREMENT COMPLETE" : "AVAILABILITY FAILURE"}</strong>
                  <span>{result.item.name}</span>
                  {result.availabilityRequired && <span className="font-mono">2D6 {result.rawRoll} · DM {signed(result.totalModifier!)} · TOTAL {result.total}</span>}
                  {result.succeeded && <span className="font-mono">Cr {result.price.toLocaleString()}</span>}
                </div>
              )}
              {error && <div className="border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-xs text-rose-900">{error}</div>}
            </div>
          )}

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(420px,0.9fr)_minmax(480px,1.1fr)]">
            <section className="min-h-0 overflow-y-auto border-r border-slate-300 bg-white">
              <div className="sticky top-0 z-10 hidden grid-cols-[72px_1fr_72px_100px_24px] gap-3 border-b border-slate-300 bg-slate-100 px-5 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid">
                <span>Image</span>
                <span>Stock item</span>
                <span>Tech</span>
                <span>Quotation</span>
                <span />
              </div>
              {status === "loading" && !market ? (
                <div className="grid min-h-72 place-items-center text-sm text-slate-500">Retrieving certified inventory…</div>
              ) : visibleItems.length === 0 ? (
                <div className="grid min-h-72 place-items-center px-8 text-center text-sm text-slate-500">
                  No inventory records match the current query.
                </div>
              ) : (
                <div>
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setResult(null);
                        setError(null);
                      }}
                      className={`grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 border-b border-slate-200 px-4 py-3 text-left transition sm:grid-cols-[72px_1fr_72px_100px_24px] sm:px-5 ${selectedItemId === item.id ? "bg-blue-50 shadow-[inset_3px_0_0_#1e3a8a]" : "bg-white hover:bg-slate-50"}`}
                    >
                      <div className="relative aspect-square overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
                        <TechnicalProductImage item={item} sizes="72px" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{item.name}</div>
                        <div className="mt-1 truncate font-mono text-[9px] uppercase text-slate-500">{item.id}</div>
                        <div className="mt-1 text-[10px] uppercase text-slate-500 sm:hidden">TL {item.techLevel} · Cr {item.purchasePrice.toLocaleString()}</div>
                      </div>
                      <div className="hidden font-mono text-xs text-slate-700 sm:block">TL-{item.techLevel}</div>
                      <div className="hidden font-mono text-xs font-bold text-blue-950 sm:block">Cr {item.purchasePrice.toLocaleString()}</div>
                      <ChevronRight size={15} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="min-h-0 overflow-y-auto bg-slate-50">
              {!selectedItem ? (
                <div className="grid min-h-full place-items-center p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-sm border border-slate-300 bg-white text-slate-400">
                      <FileSearch size={30} strokeWidth={1.25} />
                    </div>
                    <div className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Select an inventory record</div>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                      Technical specifications, availability assessment, and procurement controls will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl p-5 md:p-7">
                  <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-300 pb-4">
                    <div>
                      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">{selectedItem.id}</div>
                      <h2 className="mt-1 text-2xl font-extrabold text-blue-950">{selectedItem.name}</h2>
                      <div className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">{selectedItem.kind} system</div>
                    </div>
                    <div className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-center">
                      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-blue-700">Tech level</div>
                      <div className="font-mono text-xl font-bold text-blue-950">{selectedItem.techLevel}</div>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1.1fr)]">
                    <div className="relative h-[min(30vh,260px)] overflow-hidden rounded-sm border border-slate-300 bg-white">
                      <TechnicalProductImage key={selectedItem.id} item={selectedItem} sizes="(min-width: 1024px) 28vw, 80vw" />
                    </div>
                    <div>
                      <div className="border border-slate-300 bg-white">
                        <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Procurement specification</div>
                        <dl className="divide-y divide-slate-200 text-xs">
                          <div className="grid grid-cols-2 px-3 py-2.5"><dt className="text-slate-500">Classification</dt><dd className="text-right font-semibold capitalize">{selectedItem.kind}</dd></div>
                          <div className="grid grid-cols-2 px-3 py-2.5"><dt className="text-slate-500">Listed cost</dt><dd className="text-right font-mono font-semibold">Cr {selectedItem.price.toLocaleString()}</dd></div>
                          <div className="grid grid-cols-2 px-3 py-2.5"><dt className="text-slate-500">Current quotation</dt><dd className="text-right font-mono font-bold text-blue-950">Cr {selectedItem.purchasePrice.toLocaleString()}</dd></div>
                          <div className="grid grid-cols-2 px-3 py-2.5"><dt className="text-slate-500">Availability</dt><dd className="text-right font-semibold">{selectedItem.availabilityRequired ? "Assessment required" : "Local stock"}</dd></div>
                          <div className="grid grid-cols-2 px-3 py-2.5"><dt className="text-slate-500">Retry status</dt><dd className={`text-right font-semibold ${selectedItem.retryAvailable ? "text-emerald-700" : "text-rose-700"}`}>{selectedItem.retryAvailable ? "Eligible" : `Turn ${selectedItem.retryTurn}`}</dd></div>
                        </dl>
                      </div>
                    </div>
                  </div>

                  {selectedItem.availabilityRequired && (
                    <div className="mt-5 border border-slate-300 bg-white">
                      <div className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600">Availability calculation</div>
                      <div className="flex flex-wrap gap-2 p-3 text-[10px]">
                        {selectedItem.modifierLines.map((line) => (
                          <span key={line.label} className="border border-slate-300 bg-slate-50 px-2 py-1 text-slate-600">{line.label} <strong>{signed(line.value)}</strong></span>
                        ))}
                        <span className="border border-blue-300 bg-blue-50 px-2 py-1 font-bold text-blue-900">TOTAL DM {signed(selectedItem.totalModifier)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void purchase(selectedItem)}
                    disabled={status === "buying" || !selectedItem.retryAvailable || (market?.ownerCredits ?? 0) < selectedItem.purchasePrice}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-blue-950 px-5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <ShoppingCart size={16} />
                    {!selectedItem.retryAvailable
                      ? `Procurement locked until turn ${selectedItem.retryTurn}`
                      : (market?.ownerCredits ?? 0) < selectedItem.purchasePrice
                        ? "Insufficient available funds"
                        : selectedItem.availabilityRequired
                          ? `Run availability assessment · Cr ${selectedItem.purchasePrice.toLocaleString()}`
                          : `Issue purchase order · Cr ${selectedItem.purchasePrice.toLocaleString()}`}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StarshipSupplyCatalogModal;
