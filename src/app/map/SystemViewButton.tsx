"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { openSystemDetail } from "../../store/slices/uiSlice";
import { selectActiveWorld } from "../../store/selectors/galaxy.selectors";

const SystemViewButton = () => {
  const dispatch = useAppDispatch();
  const world    = useAppSelector(selectActiveWorld);

  return (
    <button
      onClick={() => world && dispatch(openSystemDetail(world.hex))}
      disabled={!world}
      className="border border-(--hud-border) px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim) hover:border-(--hud-accent) hover:text-(--hud-accent) transition-colors disabled:opacity-30 disabled:pointer-events-none"
    >
      System
    </button>
  );
};

export default SystemViewButton;
