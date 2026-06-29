"use client";

import { useEffect } from "react";
import { SystemScene3D, SystemTopDownMap } from "@/components/system-view-v2";
import { SystemLocationLifecycle } from "@/components/world/SystemLocationLifecycle";
import { selectShipLocation } from "@/plugins/ship";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectWorldByCoord } from "@/store/selectors/galaxy.selectors";
import {
  selectCurrentStarSystemViewModel,
  selectSystemStatusByKey,
} from "@/store/selectors/system.selectors";
import { getSystemData } from "@/store/slices/systemSlice";
import type { StarSystemViewModel } from "@/lib/starSystemViewModel";

const SystemHierarchySummary = ({ model }: { model: StarSystemViewModel }) => {
  const bodyById = new Map(model.bodies.map((body) => [body.id, body]));
  const orbitsByParent = new Map<string, typeof model.orbits>();

  for (const orbit of model.orbits) {
    const group = orbitsByParent.get(orbit.parentId) ?? [];
    group.push(orbit);
    orbitsByParent.set(orbit.parentId, group);
  }

  return (
    <div className="mt-5">
      <h2 className="mb-2 text-sm text-slate-100">Hierarchy</h2>
      <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-2">
        {model.stars.map((star) => {
          const childOrbits = orbitsByParent.get(star.id) ?? [];
          return (
            <li key={star.id} className="border-b border-slate-800 pb-2">
              <div className="flex justify-between gap-3 text-slate-200">
                <span>{star.label}</span>
                <span className="text-slate-500">{star.spectral}</span>
              </div>
              {childOrbits.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1">
                  {childOrbits.map((orbit) => {
                    const body = orbit.bodyId ? bodyById.get(orbit.bodyId) : null;
                    return (
                      <li key={orbit.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 text-[10px] text-slate-400">
                        <span className="truncate">{orbit.label}</span>
                        <span className="shrink-0 text-slate-500">{orbit.parentId}</span>
                        <span className="shrink-0 text-slate-500">{body?.label ?? body?.kind ?? "empty"}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const SystemV2PageClient = () => {
  const dispatch = useAppDispatch();
  const shipLocation = useAppSelector(selectShipLocation);
  const sectorAbbr = shipLocation?.sectorAbbr ?? null;
  const hex = shipLocation?.hex ?? null;
  const mainWorld = useAppSelector(selectWorldByCoord(sectorAbbr, hex));
  const model = useAppSelector(selectCurrentStarSystemViewModel);
  const systemStatus = useAppSelector(
    sectorAbbr && hex ? selectSystemStatusByKey(sectorAbbr, hex) : () => "idle",
  );

  useEffect(() => {
    if (!sectorAbbr || !hex) return;
    if (systemStatus === "loading" || systemStatus === "loaded") return;
    dispatch(getSystemData({ sectorAbbr, hex }));
  }, [dispatch, hex, sectorAbbr, systemStatus]);

  return (
    <div className="h-screen overflow-y-auto bg-slate-950 p-4 text-slate-100">
      <SystemLocationLifecycle />
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-4">
        <header className="flex items-end justify-between gap-4 border-b border-slate-700 pb-3">
          <div>
            <h1 className="font-mono text-lg uppercase tracking-widest text-slate-100">
              System View V2
            </h1>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate-400">
              Model-backed top-down prototype
            </p>
          </div>
          <div className="text-right font-mono text-xs uppercase tracking-wider text-slate-400">
            <div>{shipLocation?.worldName ?? "No ship location"}</div>
            <div>{sectorAbbr && hex ? `${sectorAbbr} ${hex}` : "Location unavailable"}</div>
          </div>
        </header>

        {!sectorAbbr || !hex ? (
          <div className="border border-slate-700 bg-slate-900/70 p-4 font-mono text-sm text-slate-300">
            No active ship location is available.
          </div>
        ) : systemStatus === "loading" || !model ? (
          <div className="border border-slate-700 bg-slate-900/70 p-4 font-mono text-sm text-slate-300">
            Loading system model...
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
            <div className="min-h-[360px] overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl shadow-black/30">
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <SystemTopDownMap model={model} width={560} height={560} className="h-full max-h-[min(560px,calc(100vh-120px))] w-auto max-w-full" />
              </div>
            </div>
            <div className="h-[420px] min-h-[360px] overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl shadow-black/30 xl:h-auto">
              <SystemScene3D model={model} mainWorld={mainWorld} className="h-full w-full" />
            </div>
            <aside className="min-h-0 border border-slate-700 bg-slate-900/70 p-4 font-mono text-xs uppercase tracking-wider text-slate-300">
              <h2 className="mb-3 text-sm text-slate-100">Model Summary</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-slate-500">Stars</dt>
                <dd>{model.counts.stars}</dd>
                <dt className="text-slate-500">Orbits</dt>
                <dd>{model.counts.orbits}</dd>
                <dt className="text-slate-500">Bodies</dt>
                <dd>{model.counts.bodies}</dd>
                <dt className="text-slate-500">Worlds</dt>
                <dd>{model.counts.worlds}</dd>
                <dt className="text-slate-500">Gas Giants</dt>
                <dd>{model.counts.gasGiants}</dd>
                <dt className="text-slate-500">Belts</dt>
                <dd>{model.counts.belts}</dd>
                <dt className="text-slate-500">Outermost</dt>
                <dd>{model.scene.outermostOrbitRadius.toFixed(2)}</dd>
              </dl>

              <h2 className="mb-2 mt-5 text-sm text-slate-100">Bodies</h2>
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-2">
                {model.bodies.map((body) => (
                  <li key={body.id} className="flex justify-between gap-3 border-b border-slate-800 py-1">
                    <span className="truncate text-slate-300">{body.label ?? body.id}</span>
                    <span className="shrink-0 text-slate-500">{body.kind}</span>
                  </li>
                ))}
              </ul>
              <SystemHierarchySummary model={model} />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemV2PageClient;
