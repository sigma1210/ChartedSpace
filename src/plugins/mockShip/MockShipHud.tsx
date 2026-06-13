"use client";

import { Gauge } from "lucide-react";
import {
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import { setShipJumpRating } from "@/store/slices/shipSlice";
import { recordMockShipJumpRating } from "./mockShipSlice";
import { selectMockShipJumpRating } from "./selectors";

const jumpRatings = [1, 2, 3, 4, 5, 6] as const;

export const MockShipHudContent = () => {
  const dispatch = usePluginDispatch();
  const jumpRating = usePluginSelector(selectMockShipJumpRating);

  const setJumpRating = (rating: number) => {
    dispatch(setShipJumpRating(rating));
    dispatch(recordMockShipJumpRating(rating));
  };

  return (
    <div className="grid w-28 grid-cols-3 gap-1 font-mono text-[9px] uppercase tracking-widest">
      {jumpRatings.map((rating) => {
        const active = jumpRating === rating;
        return (
          <button
            key={rating}
            type="button"
            onClick={() => setJumpRating(rating)}
            className={`h-7 border transition-colors ${
              active
                ? "border-(--hud-accent) bg-(--hud-accent)/15 text-(--hud-accent)"
                : "border-(--hud-border) bg-black/20 text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-text)"
            }`}
          >
            J{rating}
          </button>
        );
      })}
    </div>
  );
};

export const MockShipHudIcon = Gauge;
