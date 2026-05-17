"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectActiveWorld,
  selectActiveWorldName,
  selectActiveWorldHex,
  selectActiveWorldCost,
  selectActiveWorldLocation,
  selectActiveWorldTradeCodes,
  selectTargetWorld,
  selectTargetWorldName,
  selectTargetWorldLocation,
  selectTargetWorldTradeCodes,
  selectExpectedSalePrice,
  TRADE_CODE_LABELS,
} from "../../store/selectors/galaxy.selectors";
import { openSystemDetail } from "../../store/slices/uiSlice";
import CreditsBadge from "../ui/CreditsBadge";

const Sep = () => <span className="mx-1 text-(--hud-border)">›</span>;

const CodeBadge = ({ code, label, accent = false }: { code: string; label?: string; accent?: boolean }) => (
  <span className="relative group">
    <span className={`border px-1 py-px ${accent ? "border-(--hud-accent) text-(--hud-accent)" : "border-(--hud-border) text-(--hud-text-dim)"}`}>
      {code}
    </span>
    <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap border border-(--hud-border) bg-(--hud-surface-2) px-1.5 py-0.5 text-[8px] text-(--hud-text) opacity-0 group-hover:opacity-100 transition-opacity">
      {label ?? TRADE_CODE_LABELS[code] ?? code}
    </span>
  </span>
);

const TradeValuesCard = () => {
  const dispatch = useAppDispatch();
  const [collapsed, setCollapsed] = useState(false);

  const activeWorld         = useAppSelector(selectActiveWorld);
  const activeWorldHex      = useAppSelector(selectActiveWorldHex);
  const activeWorldName     = useAppSelector(selectActiveWorldName);
  const activeWorldCost     = useAppSelector(selectActiveWorldCost);
  const activeWorldLocation = useAppSelector(selectActiveWorldLocation);
  const activeTradeLabels   = useAppSelector(selectActiveWorldTradeCodes);

  const targetWorld         = useAppSelector(selectTargetWorld);
  const targetWorldName     = useAppSelector(selectTargetWorldName);
  const targetWorldLocation = useAppSelector(selectTargetWorldLocation);
  const targetTradeLabels   = useAppSelector(selectTargetWorldTradeCodes);
  const expectedSalePrice   = useAppSelector(selectExpectedSalePrice);

  const activeTL  = activeWorld  ? parseInt(activeWorld.uwp.techLevel,  16) : null;
  const targetTL  = targetWorld  ? parseInt(targetWorld.uwp.techLevel,  16) : null;

  return (
    <div className="hud-panel w-52 shrink-0">
      <div className="hud-panel-header flex items-center justify-between gap-2">
        <span className="truncate text-[10px]">Trade System</span>
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? "Expand" : "Collapse"}
          className="shrink-0 text-(--hud-text-dim) hover:text-(--hud-text) transition-colors"
        >
          {collapsed ? <ChevronDown size={12} strokeWidth={1.5} /> : <ChevronUp size={12} strokeWidth={1.5} />}
        </button>
      </div>

      {!collapsed && (
        <div className="flex flex-col divide-y divide-(--hud-border)">
          {/* Origin — active world */}
          <div className="p-2">
            <p className="mb-1 text-[9px] uppercase tracking-widest text-(--hud-text-dim)">Origin</p>
            {activeWorldLocation ? (
              <div className="font-mono text-[9px]">
                <div className="flex flex-wrap items-center">
                  <span className="text-(--hud-text-dim)">{activeWorldLocation.sectorName}</span>
                  <Sep />
                  <span className="text-(--hud-text-dim)">{activeWorldLocation.subsectorName}</span>
                  <Sep />
                  <button
                    onClick={() => activeWorldHex && dispatch(openSystemDetail(activeWorldHex))}
                    className="text-(--hud-text) hover:text-white transition-colors"
                  >
                    {activeWorldName}
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-(--hud-text-dim)">
                  {activeTradeLabels.map(l => <CodeBadge key={l} code={l} />)}
                  {activeTL !== null && <CodeBadge code={`TL-${activeTL}`} label="Tech Level" accent />}
                </div>
                {activeWorldCost !== null && (
                  <span className="mt-1 block">
                    <CreditsBadge amount={activeWorldCost} />
                  </span>
                )}
              </div>
            ) : (
              <p className="font-mono text-[9px] text-(--hud-text-dim) italic">No world selected</p>
            )}
          </div>

          {/* Destination — target world */}
          <div className="p-2">
            <p className="mb-1 text-[9px] uppercase tracking-widest text-(--hud-text-dim)">Destination</p>
            {targetWorldLocation && targetWorldName ? (
              <div className="font-mono text-[9px]">
                <div className="flex flex-wrap items-center">
                  <span className="text-(--hud-text-dim)">{targetWorldLocation.sectorName}</span>
                  <Sep />
                  <span className="text-(--hud-text-dim)">{targetWorldLocation.subsectorName}</span>
                  <Sep />
                  <span className="text-(--hud-text)">{targetWorldName}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-(--hud-text-dim)">
                  {targetTradeLabels.map(l => <CodeBadge key={l} code={l} />)}
                  {targetTL !== null && <CodeBadge code={`TL-${targetTL}`} label="Tech Level" accent />}
                </div>
                {expectedSalePrice !== null && (
                  <span className="mt-1 block">
                    <CreditsBadge amount={expectedSalePrice} />
                  </span>
                )}
              </div>
            ) : (
              <p className="font-mono text-[9px] text-(--hud-text-dim) italic">Hover a world</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeValuesCard;
