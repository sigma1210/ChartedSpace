"use client";

import { Search } from "lucide-react";
import HudModal from "./HudModal";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  setSearchQuery,
  setSearchFilter,
  openSystemDetail,
  openCharacterProfile,
} from "../../store/slices/uiSlice";
import { selectSearchQuery, selectSearchFilter } from "../../store/selectors/ui.selectors";
import { SearchFilter } from "../../types";

const FILTER_TABS: { label: string; value: SearchFilter }[] = [
  { label: "All",        value: "all" },
  { label: "Worlds",     value: "worlds" },
  { label: "Characters", value: "characters" },
];

export default function SearchModal() {
  const dispatch = useAppDispatch();
  const query = useAppSelector(selectSearchQuery);
  const filter = useAppSelector(selectSearchFilter);

  return (
    <HudModal title="Search">
      <div className="flex flex-col gap-0">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-(--hud-border) px-3 py-2">
          <Search size={14} strokeWidth={1.5} className="shrink-0 text-(--hud-text-dim)" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="Search worlds and characters…"
            className="flex-1 bg-transparent font-mono text-sm text-(--hud-text) placeholder:text-(--hud-text-dim) focus:outline-none"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-(--hud-border)">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => dispatch(setSearchFilter(tab.value))}
              className={[
                "flex-1 py-1.5 text-[10px] uppercase tracking-wider transition-colors",
                filter === tab.value
                  ? "bg-(--hud-surface-2) text-(--hud-text) border-b border-(--hud-accent)"
                  : "text-(--hud-text-dim) hover:text-(--hud-text)",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2 p-3">
          {query.trim().length === 0 ? (
            <p className="py-6 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
              Enter a search term above
            </p>
          ) : (
            <p className="py-6 text-center text-xs text-(--hud-text-dim) uppercase tracking-wider">
              No results — connect database to search
            </p>
          )}
        </div>
      </div>
    </HudModal>
  );
}
