"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Crosshair,
  Search,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
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

const ProductPlaceholder = ({ kind, large = false }: { kind: MarketItem["kind"]; large?: boolean }) => (
  <div className={[
    "relative flex overflow-hidden rounded-2xl border",
    large ? "aspect-square min-h-64" : "aspect-square",
    kind === "weapon"
      ? "border-cyan-300/25 bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.22),transparent_40%),linear-gradient(145deg,#071629,#0b2132_55%,#08111f)]"
      : "border-violet-300/25 bg-[radial-gradient(circle_at_70%_20%,rgba(167,139,250,0.24),transparent_42%),linear-gradient(145deg,#15112a,#21173a_55%,#0d1323)]",
  ].join(" ")}>
    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:24px_24px]" />
    <div className="absolute -right-8 -bottom-12 h-40 w-40 rounded-full border border-white/10" />
    <div className="relative m-auto flex flex-col items-center gap-3">
      <div className={`rounded-2xl border border-white/15 bg-white/8 p-4 shadow-2xl ${kind === "weapon" ? "text-cyan-200" : "text-violet-200"}`}>
        {kind === "weapon" ? <Crosshair size={large ? 64 : 42} strokeWidth={1.15} /> : <Shield size={large ? 64 : 42} strokeWidth={1.15} />}
      </div>
      <span className="text-[10px] font-semibold tracking-[0.28em] text-white/45">
        {kind === "weapon" ? "WEAPON SYSTEM" : "PROTECTIVE SYSTEM"}
      </span>
    </div>
  </div>
);

const ProductImage = ({ item, large = false }: { item: MarketItem; large?: boolean }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <ProductPlaceholder kind={item.kind} large={large} />;

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-100 ${large ? "aspect-square min-h-64" : "aspect-square"}`}>
      <Image
        src={`/images/billybobs/${item.id}.png`}
        alt={item.name}
        fill
        sizes={large ? "(min-width: 1024px) 42vw, 90vw" : "(min-width: 1280px) 22vw, (min-width: 640px) 42vw, 90vw"}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export const BillyBobsCatalogModal = () => {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector(selectActiveModal);
  const visible = activeModal === "billyBobsCatalog";
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
      if (event.key === "Escape") {
        if (selectedItemId) setSelectedItemId(null);
        else dispatch(closeModal());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [dispatch, selectedItemId, visible]);

  const selectedItem = market?.items.find((item) => item.id === selectedItemId) ?? null;
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (market?.items ?? []).filter((item) => {
      if (department !== "all" && item.kind !== department) return false;
      return !normalizedQuery
        || item.name.toLowerCase().includes(normalizedQuery)
        || item.kind.toLowerCase().includes(normalizedQuery);
    });
  }, [department, market?.items, query]);

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
        "fixed inset-0 z-60 flex items-center justify-center bg-[#02050b]/82 p-3 font-sans text-slate-100 backdrop-blur-xl transition-opacity md:p-6",
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      onClick={() => dispatch(closeModal())}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Billy Bob's equipment store"
        className="flex h-[min(94vh,900px)] w-[min(97vw,1440px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#07101d] shadow-[0_45px_140px_rgba(0,0,0,.75)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-white/8 bg-[#091525]/95">
          <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-cyan-300 to-blue-600 p-2.5 text-[#06101c] shadow-[0_0_28px_rgba(34,211,238,.25)]">
                <Store size={22} strokeWidth={2.2} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xl font-black tracking-tight text-white md:text-2xl">
                  Billy Bob&apos;s
                  <Sparkles size={15} className="text-cyan-300" />
                </div>
                <div className="text-[10px] font-semibold tracking-[0.24em] text-cyan-200/55">FRONTIER EQUIPMENT OUTFITTERS</div>
              </div>
            </div>
            <div className="hidden items-center gap-6 text-xs text-slate-400 lg:flex">
              {market && (
                <>
                  <span>{market.world.name} · TL {market.world.techLevel} · LAW {market.world.lawLevel}</span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1.5 font-semibold text-emerald-200">
                    Cr {market.ownerCredits.toLocaleString()} available
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => dispatch(closeModal())}
              aria-label="Close Billy Bob's"
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-3 px-5 pb-4 md:grid-cols-[1fr_auto_auto] md:px-8">
            <label className="relative block">
              <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Billy Bob's inventory"
                className="h-11 w-full rounded-xl border border-white/10 bg-[#050c17] pr-4 pl-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/10"
              />
            </label>
            <select
              value={market?.purchaser.id ?? purchaserCrewId}
              onChange={(event) => choosePurchaser(event.target.value)}
              aria-label="Purchasing crew member"
              className="h-11 min-w-48 rounded-xl border border-white/10 bg-[#0b1727] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/55"
            >
              {market?.crew.map((member) => (
                <option key={member.id} value={member.id}>
                  Buyer: {member.name} ({member.skillLevel >= 0 ? signed(member.skillLevel) : "untrained -3"})
                </option>
              ))}
            </select>
            <select
              value={priceMultiplier}
              onChange={(event) => chooseMultiplier(Number(event.target.value) as 1 | 2 | 3)}
              aria-label="Offered price"
              className="h-11 min-w-44 rounded-xl border border-white/10 bg-[#0b1727] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/55"
            >
              <option value={1}>Listed price</option>
              <option value={2}>Double price · DM+1</option>
              <option value={3}>Triple price · DM+2</option>
            </select>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-56 shrink-0 border-r border-white/8 bg-[#081321] p-5 md:block">
            <div className="mb-3 text-[10px] font-bold tracking-[0.2em] text-slate-500">DEPARTMENTS</div>
            <nav className="space-y-1.5">
              {([
                ["all", "All products", ShoppingCart],
                ["weapon", "Weapons", Crosshair],
                ["armor", "Armor", Shield],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setDepartment(id);
                    setSelectedItemId(null);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${department === id ? "bg-cyan-300/12 font-semibold text-cyan-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  <span className="ml-auto text-[10px] text-slate-600">
                    {id === "all" ? market?.items.length ?? 0 : market?.items.filter((item) => item.kind === id).length ?? 0}
                  </span>
                </button>
              ))}
            </nav>
            <div className="mt-8 rounded-2xl border border-cyan-300/12 bg-gradient-to-br from-cyan-300/8 to-blue-500/5 p-4">
              <div className="mb-1 text-xs font-bold text-cyan-100">Billy&apos;s Promise</div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Legal-market stock matched to local technology and law.
              </p>
            </div>
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_80%_0%,rgba(34,211,238,.06),transparent_30%),#060e19]">
            <div className="mx-auto max-w-6xl p-5 md:p-8">
              <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
                {(["all", "weapon", "armor"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setDepartment(id);
                      setSelectedItemId(null);
                    }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold capitalize ${department === id ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100" : "border-white/10 text-slate-400"}`}
                  >
                    {id === "all" ? "All products" : id === "weapon" ? "Weapons" : "Armor"}
                  </button>
                ))}
              </div>

              {result && (
                <div className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${result.succeeded ? "border-emerald-300/25 bg-emerald-300/8 text-emerald-100" : "border-rose-300/25 bg-rose-300/8 text-rose-100"}`}>
                  <div className={`mt-0.5 rounded-full p-1 ${result.succeeded ? "bg-emerald-300/15" : "bg-rose-300/15"}`}>
                    {result.succeeded ? <Check size={15} /> : <X size={15} />}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{result.succeeded ? "Purchase complete" : "Item not found"}</div>
                    <div className="mt-0.5 text-xs opacity-75">
                      {result.item.name}
                      {result.availabilityRequired && ` · 2D6 ${result.rawRoll} · DM ${signed(result.totalModifier!)} · total ${result.total}`}
                      {result.succeeded && ` · Cr ${result.price.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              )}
              {error && <div className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-300/8 p-4 text-sm text-rose-100">{error}</div>}

              {status === "loading" && !market ? (
                <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">Loading Billy Bob&apos;s inventory…</div>
              ) : selectedItem ? (
                <section>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(null)}
                    className="mb-5 flex items-center gap-2 text-xs font-semibold text-cyan-200 transition hover:text-white"
                  >
                    <ArrowLeft size={15} />
                    Back to products
                  </button>
                  <div className="grid gap-8 lg:grid-cols-2">
                    <ProductImage key={selectedItem.id} item={selectedItem} large />
                    <div className="flex flex-col">
                      <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/65">{selectedItem.kind}</div>
                      <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">{selectedItem.name}</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">TL {selectedItem.techLevel}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs ${selectedItem.availabilityRequired ? "border-amber-300/20 bg-amber-300/8 text-amber-200" : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200"}`}>
                          {selectedItem.availabilityRequired ? "Availability check required" : "Available locally"}
                        </span>
                      </div>
                      <div className="mt-7 border-y border-white/8 py-5">
                        <div className="text-xs text-slate-500">Your offered price</div>
                        <div className="mt-1 text-3xl font-black text-white">Cr {selectedItem.purchasePrice.toLocaleString()}</div>
                        {selectedItem.purchasePrice !== selectedItem.price && (
                          <div className="mt-1 text-xs text-slate-500">Listed price Cr {selectedItem.price.toLocaleString()}</div>
                        )}
                      </div>
                      {selectedItem.availabilityRequired && (
                        <div className="mt-5 rounded-2xl border border-white/8 bg-white/3 p-4">
                          <div className="mb-2 text-xs font-bold text-slate-300">Availability estimate</div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                            {selectedItem.modifierLines.map((line) => (
                              <span key={line.label} className="rounded-full bg-white/5 px-2.5 py-1">{line.label} {signed(line.value)}</span>
                            ))}
                            <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 font-bold text-cyan-200">Total DM {signed(selectedItem.totalModifier)}</span>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => void purchase(selectedItem)}
                        disabled={status === "buying" || !selectedItem.retryAvailable || (market?.ownerCredits ?? 0) < selectedItem.purchasePrice}
                        className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 px-5 text-sm font-black text-[#04101c] shadow-[0_12px_32px_rgba(34,211,238,.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-45"
                      >
                        <ShoppingCart size={17} />
                        {!selectedItem.retryAvailable
                          ? `Retry on turn ${selectedItem.retryTurn}`
                          : (market?.ownerCredits ?? 0) < selectedItem.purchasePrice
                            ? "Insufficient funds"
                            : selectedItem.availabilityRequired
                              ? `Check availability · Cr ${selectedItem.purchasePrice.toLocaleString()}`
                              : `Buy now · Cr ${selectedItem.purchasePrice.toLocaleString()}`}
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/55">Billy Bob&apos;s inventory</div>
                      <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                        {department === "all" ? "All products" : department === "weapon" ? "Weapons" : "Armor"}
                      </h2>
                    </div>
                    <div className="text-xs text-slate-500">{visibleItems.length} products</div>
                  </div>
                  {visibleItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-sm text-slate-500">
                      No products match your search.
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedItemId(item.id);
                            setResult(null);
                            setError(null);
                          }}
                          className="group overflow-hidden rounded-2xl border border-white/8 bg-[#0a1625] p-3 text-left shadow-[0_18px_50px_rgba(0,0,0,.18)] transition hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-[#0c1a2b]"
                        >
                          <ProductImage item={item} />
                          <div className="p-2 pt-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/55">{item.kind} · TL {item.techLevel}</div>
                                <h3 className="mt-1 text-base font-bold text-white">{item.name}</h3>
                              </div>
                              <ChevronRight size={17} className="mt-1 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                            </div>
                            <div className="flex items-end justify-between gap-3 border-t border-white/6 pt-3">
                              <div>
                                <div className="text-[10px] text-slate-600">From</div>
                                <div className="text-lg font-black text-slate-100">Cr {item.purchasePrice.toLocaleString()}</div>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.retryAvailable ? "bg-emerald-300/8 text-emerald-200" : "bg-rose-300/8 text-rose-200"}`}>
                                {item.retryAvailable ? "Shop now" : `Turn ${item.retryTurn}`}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default BillyBobsCatalogModal;
