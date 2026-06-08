"use client";

import WorldMap from "../../components/world/WorldMap";
import { useAppSelector } from "../../store/hooks";
import {
  deriveTradeClassifications,
  selectSectorData,
  selectWorldByCoord,
} from "../../store/selectors/galaxy.selectors";
import { selectShipLocation } from "../../store/selectors/ship.selectors";

const CurrentWorldMapPanel = () => {
  const shipLocation = useAppSelector(selectShipLocation);
  const world = useAppSelector(
    selectWorldByCoord(shipLocation?.sectorAbbr, shipLocation?.hex),
  );
  const sectorData = useAppSelector(
    selectSectorData(shipLocation?.sectorAbbr ?? ""),
  );
  const tradeCodes = world ? deriveTradeClassifications(world) : [];
  const locationLabel =
    shipLocation?.sectorAbbr && shipLocation.hex
      ? [
          sectorData?.sector ?? shipLocation.sectorAbbr,
          shipLocation.worldName,
          shipLocation.hex,
          shipLocation.status === "in_jump" ? "In Jump" : null,
        ]
          .filter(Boolean)
          .join(" / ")
      : null;

  return (
    <section className="hud-panel flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="hud-panel-header flex shrink-0 items-center justify-between gap-4 px-4 py-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-widest text-(--hud-text-dim)">
            Current Ship World 2D Map
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="truncate font-mono text-sm font-bold uppercase tracking-widest text-(--hud-text)">
              {world?.name ?? shipLocation?.worldName ?? "No current world"}
            </span>
            {locationLabel && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-(--hud-text-dim)">
                {locationLabel}
              </span>
            )}
          </div>
        </div>

        {tradeCodes.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {tradeCodes.map((code) => (
              <span
                key={code}
                className="border border-(--hud-border) bg-(--hud-surface-2) px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-(--hud-text-dim)"
              >
                {code}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {world ? (
          <WorldMap world={world} />
        ) : (
          <div className="grid h-full min-h-80 place-items-center border border-(--hud-border) bg-(--hud-bg)/45 p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
              {shipLocation?.sectorAbbr && shipLocation.hex
                ? "Loading current ship world map"
                : "Ship has no current world"}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CurrentWorldMapPanel;
