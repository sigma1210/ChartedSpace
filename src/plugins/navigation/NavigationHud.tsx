"use client";

import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import {
  usePluginDispatch,
  usePluginSelector,
} from "@/plugin-api";
import { selectSystemStatusByKey } from "@/store/selectors/system.selectors";
import { getSystemData } from "@/store/slices/systemSlice";
import {
  executeNavigationJump,
  replotNavigationDestination,
  resolveNavigationPlot,
  selectNavigationDestination,
  startNavigationPlot,
} from "./navigationSlice";
import {
  buildNavigationGridLayout,
  navigationHexPoints,
} from "./navigationGridGeometry";
import {
  selectNavigationGridCells,
  selectNavigationSelectedDestination,
  selectNavigationSelectedDestinationKey,
  selectNavigationSnapshotStatus,
  selectNavigationState,
} from "./selectors";

export const NavigationHudContent = () => {
  const dispatch = usePluginDispatch();
  const cells = usePluginSelector(selectNavigationGridCells);
  const navigationState = usePluginSelector(selectNavigationState);
  const snapshotStatus = usePluginSelector(selectNavigationSnapshotStatus);
  const selectedDestinationKey = usePluginSelector(selectNavigationSelectedDestinationKey);
  const selectedDestination = usePluginSelector(selectNavigationSelectedDestination);
  const plottedRouteSystemStatus = usePluginSelector((state) => {
    const route = state.plugins.navigation.plottedRoute;
    if (!route) return "idle";
    return selectSystemStatusByKey(route.sectorAbbr, route.hex)(state);
  });
  const layout = buildNavigationGridLayout(cells);
  const plotResolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredWorld, setHoveredWorld] = useState<{
    key: string;
    name: string;
    xPct: number;
    yPct: number;
  } | null>(null);

  useEffect(() => () => {
    if (plotResolveTimer.current) {
      clearTimeout(plotResolveTimer.current);
    }
  }, []);

  const runPlot = (
    destinationKey: string,
    destination: NonNullable<typeof selectedDestination>,
  ) => {
    dispatch(startNavigationPlot(destinationKey));
    if (plotResolveTimer.current) {
      clearTimeout(plotResolveTimer.current);
    }

    plotResolveTimer.current = setTimeout(() => {
      const roll = Math.ceil(Math.random() * 6) + Math.ceil(Math.random() * 6);
      const target = 4;
      const success = roll >= target;
      if (success) {
        void dispatch(getSystemData({
          sectorAbbr: destination.sectorAbbr,
          hex: destination.hex,
        }));
      }
      dispatch(resolveNavigationPlot({
        result: {
          roll,
          target,
          success,
        },
        route: success
          ? {
            destinationKey: destination.key,
            sectorAbbr: destination.sectorAbbr,
            hex: destination.hex,
            worldName: destination.name ?? null,
            jumpDistance: destination.distance,
            fuelCostEstimate: destination.distance * 10000,
          }
          : null,
      }));
    }, 1500);
  };

  const handlePlotClick = () => {
    if (!selectedDestinationKey || !selectedDestination) return;
    if (navigationState.plotStatus === "plotting") return;
    if (navigationState.executeStatus === "executing") return;
    if (navigationState.replotStatus === "advancing") return;
    if (navigationState.plotStatus === "failed") {
      void dispatch(replotNavigationDestination(selectedDestinationKey))
        .unwrap()
        .then((result) => {
          if (result.stopped) return;
          runPlot(selectedDestinationKey, selectedDestination);
        })
        .catch(() => {});
      return;
    }
    if (
      navigationState.plotStatus === "success" &&
      navigationState.plottedRoute?.destinationKey === selectedDestinationKey
    ) {
      if (plottedRouteSystemStatus === "idle") {
        void dispatch(getSystemData({
          sectorAbbr: navigationState.plottedRoute.sectorAbbr,
          hex: navigationState.plottedRoute.hex,
        }));
      }
      void dispatch(executeNavigationJump());
      return;
    }

    runPlot(selectedDestinationKey, selectedDestination);
  };

  const plotSuccess = navigationState.plotStatus === "success";
  const plotFailed = navigationState.plotStatus === "failed";
  const plotAnimating = navigationState.plotStatus === "plotting";
  const executeAnimating = navigationState.executeStatus === "executing";
  const routeAnimating = plotAnimating || executeAnimating;
  const plotColor = plotSuccess
    ? "var(--hud-success)"
    : plotFailed
      ? "var(--hud-error)"
      : selectedDestination
        ? "#60a5fa"
        : "var(--hud-border)";
  const plotButtonTooltip = !selectedDestination
    ? "Select Destination"
    : plotSuccess && navigationState.plottedRoute?.destinationKey === selectedDestinationKey
      ? "Execute Jump"
      : "Plot Course";

  return (
    <div className="flex w-[min(6rem,21vw,17vh)] select-none flex-col gap-1.5 font-mono uppercase tracking-[0.18em] text-(--hud-text)">
      <div className="relative aspect-square w-full">
        {snapshotStatus !== "loading" && cells.length > 0 && (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block h-full w-full"
            role="img"
            aria-label="Navigation grid"
          >
            <style>
              {`
                @keyframes charted-space-nav-grid-contract {
                  from {
                    opacity: 0.9;
                    transform: scale(1);
                  }
                  to {
                    opacity: 0;
                    transform: scale(0.06);
                  }
                }
              `}
            </style>
            {layout.cells.map((cell) => {
              const points = navigationHexPoints(cell.px, cell.py);
              const fill = cell.isCenter ? "rgba(34,211,238,0.16)" : "transparent";
              const hasWorld = cell.inRange && cell.world;
              const hasAnyWorld = !!cell.world;
              const targetKey = cell.inRange && cell.sectorAbbr && cell.hex
                ? `${cell.sectorAbbr}:${cell.hex}`
                : null;
              const selected = targetKey !== null && targetKey === selectedDestinationKey;
              const hovered = hoveredWorld?.key === cell.key;
              const plotEndpoint = cell.isCenter || selected;
              const completedPlotEndpoint =
                plotEndpoint && (navigationState.plotStatus === "success" || navigationState.plotStatus === "failed");
              const plottingEndpoint = routeAnimating && (cell.isCenter || selected);
              const stroke = hovered
                ? "#f87171"
                : completedPlotEndpoint && navigationState.plotStatus === "success"
                  ? "var(--hud-success)"
                : completedPlotEndpoint && navigationState.plotStatus === "failed"
                  ? "var(--hud-error)"
                : selected
                  ? "#60a5fa"
                : cell.isCenter
                  ? "var(--hud-accent)"
                : hasAnyWorld
                  ? "var(--hud-border)"
                : cell.inRange
                  ? "rgba(34,211,238,0.12)"
                  : "transparent";
              const strokeWidth = hovered || selected || completedPlotEndpoint ? 1.45 : cell.isCenter ? 1.4 : hasAnyWorld ? 0.65 : cell.inRange ? 0.35 : 0;

              return (
                <g
                  key={cell.key}
                  onClick={() => {
                    if (!targetKey) return;
                    if (
                      navigationState.plotStatus === "failed" ||
                      (
                        navigationState.plotStatus === "success" &&
                        navigationState.plottedRoute &&
                        navigationState.plottedRoute.destinationKey !== targetKey
                      )
                    ) {
                      dispatch(replotNavigationDestination(targetKey));
                      return;
                    }
                    dispatch(selectNavigationDestination(targetKey));
                  }}
                  onMouseEnter={() => {
                    if (!cell.inRange || !cell.name) return;
                    setHoveredWorld({
                      key: cell.key,
                      name: cell.name,
                      xPct: (cell.px / layout.width) * 100,
                      yPct: (cell.py / layout.height) * 100,
                    });
                  }}
                  onMouseLeave={() => setHoveredWorld(null)}
                  style={{ cursor: targetKey ? "pointer" : "default" }}
                >
                  <polygon
                    points={points}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                  />
                  {hasWorld && (
                    <circle
                      cx={cell.px}
                      cy={cell.py}
                      r={1.35}
                      fill="var(--hud-accent)"
                    />
                  )}
                  {plottingEndpoint && (
                    <polygon
                      points={points}
                      fill="transparent"
                      stroke="var(--hud-accent)"
                      strokeWidth={0.85}
                      style={{
                        animation: "charted-space-nav-grid-contract 500ms ease-in 3 forwards",
                        transformBox: "fill-box",
                        transformOrigin: "center",
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}
        {hoveredWorld && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full border border-(--hud-accent) bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-(--hud-accent) whitespace-nowrap"
            style={{
              left: `${hoveredWorld.xPct}%`,
              top: `${hoveredWorld.yPct}%`,
            }}
          >
            {hoveredWorld.name}
          </div>
        )}
      </div>
      <div className="group/button relative w-full">
        <svg
          viewBox="0 0 120 22"
          preserveAspectRatio="none"
          className="block h-5 w-full"
          onClick={handlePlotClick}
          role="button"
          aria-label={plotButtonTooltip}
          style={{
            cursor: selectedDestination &&
              navigationState.plotStatus !== "plotting" &&
              navigationState.executeStatus !== "executing" &&
              navigationState.replotStatus !== "advancing"
              ? "pointer"
              : "default",
          }}
        >
          <style>
            {`
              @keyframes charted-space-nav-plot-contract {
                from {
                  opacity: 0.9;
                  transform: scale(1);
                }
                to {
                  opacity: 0.2;
                  transform: scale(0.03);
                }
              }
            `}
          </style>
          <polygon
            points="10,1 110,1 119,11 110,21 10,21 1,11"
            fill={selectedDestination ? "rgba(34,211,238,0.10)" : "transparent"}
            stroke={plotColor}
            strokeWidth={0.8}
          />
          {(navigationState.plotStatus === "plotting" || executeAnimating) && (
            <polygon
              points="10,1 110,1 119,11 110,21 10,21 1,11"
              fill="transparent"
              stroke="var(--hud-accent)"
              strokeWidth={1.1}
              style={{
                animation: "charted-space-nav-plot-contract 500ms ease-in 3 forwards",
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          )}
          {selectedDestination && (
            <text
              x="60"
              y="14"
              textAnchor="middle"
              fontSize="7"
              fill="var(--hud-accent)"
              fontFamily="monospace"
              letterSpacing="0.8"
            >
              {selectedDestination.name ?? `${selectedDestination.sectorAbbr} ${selectedDestination.hex}`}
            </text>
          )}
          {plotSuccess && (
            <g
              fill="none"
              stroke="var(--hud-success)"
              strokeWidth={1.2}
              strokeLinecap="round"
            >
              <circle cx="106" cy="11" r="4.4" />
              <line x1="106" y1="5.2" x2="106" y2="16.8" />
              <line x1="100.2" y1="11" x2="111.8" y2="11" />
            </g>
          )}
          {plotFailed && (
            <g
              fill="none"
              stroke="var(--hud-error)"
              strokeWidth={1.2}
              strokeLinecap="round"
            >
              <circle cx="106" cy="11" r="4.4" />
              <line x1="101.9" y1="6.9" x2="110.1" y2="15.1" />
              <line x1="110.1" y1="6.9" x2="101.9" y2="15.1" />
            </g>
          )}
        </svg>
        <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 border border-(--hud-accent) bg-black/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider whitespace-nowrap text-(--hud-accent) opacity-0 transition-opacity group-hover/button:opacity-100">
          {plotButtonTooltip}
        </div>
      </div>
    </div>
  );
};

export const NavigationHudIcon = Compass;
