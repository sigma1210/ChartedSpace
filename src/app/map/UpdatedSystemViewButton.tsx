"use client";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { openUpdatedSystemDetail } from "../../store/slices/uiSlice";
import { selectActiveWorld } from "../../store/selectors/galaxy.selectors";

const UpdatedSystemViewButton = () => {
  const dispatch = useAppDispatch();
  const world    = useAppSelector(selectActiveWorld);

  return (
    <button
      onClick={() => world && dispatch(openUpdatedSystemDetail(world.hex))}
      disabled={!world}
      className="border border-(--hud-accent) px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-accent) hover:bg-(--hud-accent) hover:text-(--hud-bg) transition-colors disabled:opacity-30 disabled:pointer-events-none"
    >
      Updated System
    </button>
  );
};

export default UpdatedSystemViewButton;
