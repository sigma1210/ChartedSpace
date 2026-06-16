"use client";

import { Gauge } from "lucide-react";
import {
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import { setShipJumpRating } from "./actions";
import { setDevelopmentJumpRatingOverride } from "./shipPluginSlice";
import { selectShipPluginJumpRating } from "./selectors";

const jumpRatings = [1, 2, 3, 4, 5, 6] as const;

export const ShipHudContent = () => {
  const dispatch = usePluginDispatch();
  const jumpRating = usePluginSelector(selectShipPluginJumpRating);

  const setJumpRating = (rating: number) => {
    dispatch(setShipJumpRating(rating));
    dispatch(setDevelopmentJumpRatingOverride(rating));
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

export const ShipHudIcon = Gauge;
