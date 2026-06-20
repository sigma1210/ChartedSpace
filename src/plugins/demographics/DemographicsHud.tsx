"use client";

import { ChartNoAxesColumnIncreasing } from "lucide-react";
import {
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import {
  demographicDotModes,
  setDemographicDotMode,
} from "./demographicsSlice";
import {
  selectDemographicModeLabel,
  selectSelectedDemographicDotMode,
  selectVisibleDemographicLegendItems,
} from "./selectors";

export const DemographicsHudContent = () => {
  const dispatch = usePluginDispatch();
  const selectedMode = usePluginSelector(selectSelectedDemographicDotMode);
  const legendItems = usePluginSelector(selectVisibleDemographicLegendItems);

  return (
    <div className="flex max-h-[42vh] w-64 flex-col gap-2 overflow-hidden py-1">
      <div className="grid grid-cols-3 gap-1 border border-(--hud-border) p-1">
        {demographicDotModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => dispatch(setDemographicDotMode(mode))}
            className={`h-7 border px-2 font-mono text-[8px] uppercase tracking-widest transition-colors ${
              selectedMode === mode
                ? "border-(--hud-accent) text-(--hud-text)"
                : "border-(--hud-border) text-(--hud-text-dim) hover:border-(--hud-border-subtle) hover:text-(--hud-text)"
            }`}
          >
            {selectDemographicModeLabel(mode)}
          </button>
        ))}
      </div>

      {legendItems.length > 0 && (
        <div className="min-h-0 overflow-y-auto overscroll-contain border border-(--hud-border) p-1">
          <div className="grid grid-cols-[1rem_3.5rem_1fr] items-center gap-x-2 gap-y-1 font-mono text-[9px]">
            {legendItems.map((item) => (
              <div key={item.key} className="contents">
                <span
                  className="h-2.5 w-2.5 border border-(--hud-border-subtle)"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="truncate uppercase tracking-wider text-(--hud-text)">
                  {item.key}
                </span>
                <span className="truncate text-(--hud-text-dim)" title={item.label}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DemographicsHudIcon = ChartNoAxesColumnIncreasing;
