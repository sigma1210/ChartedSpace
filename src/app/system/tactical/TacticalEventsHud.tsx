import { FloatingPluginHud } from "@/components/hud/FloatingPluginHud";
import { updateTacticalEventsHud } from "@/plugins/characterCombat/slice";
import type { TacticalMapState } from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

export const TacticalEventsHud = ({
  tacticalMap,
}: {
  tacticalMap: TacticalMapState;
}) => {
  const dispatch = useAppDispatch();

  return (
    <FloatingPluginHud
      title="Events"
      layout={tacticalMap.eventsHudLayout}
      onLayoutChange={(layout) => dispatch(updateTacticalEventsHud(layout))}
      className="w-72 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      {tacticalMap.events.length ? (
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto normal-case tracking-normal">
          {tacticalMap.events.slice(0, 6).map((event, index) => (
            <div key={`${index}:${event}`} className="border-b border-(--hud-border)/50 pb-1 last:border-0">{event}</div>
          ))}
        </div>
      ) : (
        <div className="normal-case tracking-normal text-(--hud-text-dim)">No events.</div>
      )}
    </FloatingPluginHud>
  );
};
