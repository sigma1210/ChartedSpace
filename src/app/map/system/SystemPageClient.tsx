"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  clearTargetWorldHex,
  loadSector,
  setActiveLocation,
  setActiveWorldHex,
  setTargetWorldHex,
} from "../../../store/slices/galaxySlice";
import { fetchShip } from "../../../store/slices/shipSlice";
import { fetchTurn, advanceTurn } from "../../../store/slices/turnSlice";
import { fetchCharacters, invalidateCharacters } from "../../../store/slices/characterSlice";
import { setSubsectorMiniMapVisible } from "../../../store/slices/uiSlice";
import {
  selectActiveSectorAbbr,
  selectActiveSubsectorKey,
  selectActiveWorldHex,
  selectAllSectors,
  selectSectorData,
  selectSectorLoadStatus,
  selectWorldByCoord,
} from "../../../store/selectors/galaxy.selectors";
import { selectShip, selectShipColor, selectShipLocation, selectShipStatus } from "../../../store/selectors/ship.selectors";
import { selectCharacters } from "../../../store/selectors/character.selectors";
import StarSystemView from "../../../components/world/StarSystemView";
import NavigationHud from "../../../components/world/NavigationHud";
import { buildNavTargets, SubsectorMiniMapView } from "../../../components/map/SubsectorMiniMap";
import { SubsectorGridView } from "../../../components/map/SubsectorGrid";
import {
  buildJumpRangeCells,
  buildJumpRangeTargets,
  neededJumpSectorAbbrs,
  type JumpRangeTarget,
} from "../../../lib/jumpRange";
import { roll2d6, statDM } from "../../../lib/dice";
import type { World } from "../../../types";

const subsectorFromHex = (hex: string): string => {
  const hexX = parseInt(hex.slice(0, 2), 10);
  const hexY = parseInt(hex.slice(2, 4), 10);
  const subCol = Math.floor((hexX - 1) / 8);
  const subRow = Math.floor((hexY - 1) / 10);
  return "ABCDEFGHIJKLMNOP"[subRow * 4 + subCol] ?? "A";
};

const PLOT_TARGETS = [4, 6, 8] as const;
const JUMP_DESTINATION_STORAGE_KEY = "charted-space:jump-destination";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PlotStatus = "idle" | "plotting" | "plotted" | "failed";
type SceneMode = "system" | "jump";
const CurrentSystemPageClient = () => {
  const dispatch = useAppDispatch();
  const shipStatus = useAppSelector(selectShipStatus);
  const shipLocation = useAppSelector(selectShipLocation);
  const ship = useAppSelector(selectShip);
  const characters = useAppSelector(selectCharacters);
  const shipColor = useAppSelector(selectShipColor);
  const activeSectorAbbr = useAppSelector(selectActiveSectorAbbr);
  const activeSubsectorKey = useAppSelector(selectActiveSubsectorKey);
  const allSectors = useAppSelector(selectAllSectors);
  const activeSector = useAppSelector(selectSectorData(activeSectorAbbr));
  const activeSectorStatus = useAppSelector(selectSectorLoadStatus(activeSectorAbbr));
  const activeWorldHex = useAppSelector(selectActiveWorldHex);
  const miniMapVisible = useAppSelector((state) => state.ui.showSubsectorMiniMap);
  const sectorDataAll = useAppSelector((state) => state.galaxy.sectorData);
  const loadingStatus = useAppSelector((state) => state.galaxy.loadingStatus);
  const [navigationHudVisible, setNavigationHudVisible] = useState(false);
  const [selectedDestinationKey, setSelectedDestinationKey] = useState<string | null>(null);
  const [plotStatus, setPlotStatus] = useState<PlotStatus>("idle");
  const [hasStoredJumpDestination, setHasStoredJumpDestination] = useState(
    () => typeof window !== "undefined" && !!localStorage.getItem(JUMP_DESTINATION_STORAGE_KEY),
  );
  const [renderedSceneMode, setRenderedSceneMode] = useState<SceneMode>("system");
  const [showWarpLayer, setShowWarpLayer] = useState(false);
  const [warpLayerOpacity, setWarpLayerOpacity] = useState(0);
  const [warpLayerActive, setWarpLayerActive] = useState(false);
  const [warpExitBlankActive, setWarpExitBlankActive] = useState(false);
  const resolvingJumpRef = useRef(false);
  const warpExitStartedRef = useRef(false);
  const warpFadeTimerRef = useRef<number | null>(null);
  const lastRenderableLocationRef = useRef<{
    world: World;
    sectorAbbr: string;
  } | null>(null);
  const sectorStatus = useAppSelector(
    shipLocation?.sectorAbbr
      ? selectSectorLoadStatus(shipLocation.sectorAbbr)
      : () => "idle",
  );
  const world = useAppSelector(
    selectWorldByCoord(shipLocation?.sectorAbbr, shipLocation?.hex),
  );
  const jumpRating = ship?.jumpRating ?? 1;

  const neededJumpSectors = useMemo(
    () => neededJumpSectorAbbrs({
      shipHex: shipLocation?.hex,
      shipSectorAbbr: shipLocation?.sectorAbbr,
      jumpRating,
      allSectors,
    }),
    [allSectors, jumpRating, shipLocation?.hex, shipLocation?.sectorAbbr],
  );

  const jumpTargets = useMemo(
    () => buildJumpRangeTargets({
      shipHex: shipLocation?.hex,
      shipSectorAbbr: shipLocation?.sectorAbbr,
      jumpRating,
      allSectors,
      sectorData: sectorDataAll,
    }),
    [allSectors, jumpRating, sectorDataAll, shipLocation?.hex, shipLocation?.sectorAbbr],
  );
  const jumpCells = useMemo(
    () => buildJumpRangeCells({
      shipHex: shipLocation?.hex,
      shipSectorAbbr: shipLocation?.sectorAbbr,
      jumpRating,
      allSectors,
      sectorData: sectorDataAll,
    }),
    [allSectors, jumpRating, sectorDataAll, shipLocation?.hex, shipLocation?.sectorAbbr],
  );

  const jumpTargetsLoading =
    neededJumpSectors.length > 0 &&
    neededJumpSectors.some((abbr) => loadingStatus[abbr] === "loading" || !loadingStatus[abbr]);
  const jumpTargetsError = neededJumpSectors.some((abbr) => loadingStatus[abbr] === "error");
  const effectiveSelectedDestinationKey = jumpTargets.some(
    (target) => target.key === selectedDestinationKey,
  )
    ? selectedDestinationKey
    : null;
  const effectiveSelectedDestination = jumpTargets.find(
    (target) => target.key === effectiveSelectedDestinationKey,
  ) ?? null;
  const effectivePlotStatus = effectiveSelectedDestinationKey ? plotStatus : "idle";
  const navigatorId = ship?.crew.find((member) => member.role === "navigator")?.characterId;
  const navigator = navigatorId
    ? characters.find((character) => character.id === navigatorId) ?? null
    : null;
  const navSkill = navigator?.skills.find((skill) => skill.name === "Navigation")?.level ?? 0;
  const navDM = navSkill + statDM(navigator?.intelligence ?? 7);

  useEffect(() => {
    if (!world || !shipLocation?.sectorAbbr) return;
    if (showWarpLayer) return;
    lastRenderableLocationRef.current = {
      world,
      sectorAbbr: shipLocation.sectorAbbr,
    };
  }, [shipLocation?.sectorAbbr, showWarpLayer, world]);

  useEffect(() => {
    if (warpFadeTimerRef.current !== null) {
      window.clearTimeout(warpFadeTimerRef.current);
      warpFadeTimerRef.current = null;
    }

    if (warpExitBlankActive) {
      setRenderedSceneMode("system");
      setShowWarpLayer(false);
      setWarpLayerActive(false);
      setWarpLayerOpacity(0);
      return;
    }

    if (ship?.status === "in_jump") {
      setRenderedSceneMode("jump");
      setShowWarpLayer(true);
      setWarpLayerActive(true);
      window.requestAnimationFrame(() => setWarpLayerOpacity(1));
      return;
    }

    setRenderedSceneMode("system");

    if (showWarpLayer) {
      setWarpLayerActive(true);
      setWarpLayerOpacity(1);
      warpFadeTimerRef.current = window.setTimeout(() => {
        setShowWarpLayer(false);
        setWarpLayerActive(false);
        setWarpLayerOpacity(0);
        warpFadeTimerRef.current = null;
      }, 700);
      return;
    }

    setWarpLayerActive(false);
    setWarpLayerOpacity(0);
  }, [ship?.status, showWarpLayer, warpExitBlankActive]);

  useEffect(
    () => () => {
      if (warpFadeTimerRef.current !== null) window.clearTimeout(warpFadeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    dispatch(fetchShip());
    dispatch(fetchTurn());
    dispatch(fetchCharacters());
    dispatch(setSubsectorMiniMapVisible(false));
  }, [dispatch]);

  useEffect(() => {
    if (!shipLocation?.sectorAbbr) return;
    if (sectorStatus === "idle" || sectorStatus === "error") {
      dispatch(loadSector(shipLocation.sectorAbbr));
    }
  }, [dispatch, sectorStatus, shipLocation?.sectorAbbr]);

  useEffect(() => {
    if (activeSectorStatus === "idle" || activeSectorStatus === "error") {
      dispatch(loadSector(activeSectorAbbr));
    }
  }, [activeSectorAbbr, activeSectorStatus, dispatch]);

  useEffect(() => {
    if (!navigationHudVisible) return;
    for (const abbr of neededJumpSectors) {
      if (loadingStatus[abbr] === "loaded" || loadingStatus[abbr] === "loading") continue;
      dispatch(loadSector(abbr));
    }
  }, [dispatch, loadingStatus, navigationHudVisible, neededJumpSectors]);

  useEffect(() => {
    if (!shipLocation?.sectorAbbr || !shipLocation.hex) return;
    dispatch(setActiveLocation({
      sectorAbbr: shipLocation.sectorAbbr,
      subsectorKey: subsectorFromHex(shipLocation.hex),
    }));
  }, [dispatch, shipLocation?.hex, shipLocation?.sectorAbbr]);

  const handleSelectDestination = (target: JumpRangeTarget) => {
    setSelectedDestinationKey(target.key);
    setPlotStatus("idle");
    dispatch(setTargetWorldHex({ sectorAbbr: target.sectorAbbr, hex: target.hex }));
  };

  const handlePlotCourse = async () => {
    if (!effectiveSelectedDestinationKey || !ship?.currentWorldId) return;
    setPlotStatus("plotting");

    let plotted = false;
    for (let index = 0; index < PLOT_TARGETS.length; index++) {
      const target = PLOT_TARGETS[index];
      const raw = roll2d6();
      const total = raw + navDM;
      const success = total >= target;
      await delay(600);
      if (success) {
        plotted = true;
        break;
      }
    }

    if (!plotted) {
      await dispatch(
        advanceTurn({
          shipUpdate: { status: "docked", currentWorldId: ship.currentWorldId },
        }),
      );
      await dispatch(fetchShip());
      await dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());
    }

    setPlotStatus(plotted ? "plotted" : "failed");
  };

  const handleExecuteJump = async () => {
    if (!effectiveSelectedDestination || !ship) return;

    localStorage.setItem(
      JUMP_DESTINATION_STORAGE_KEY,
      JSON.stringify({
        sectorAbbr: effectiveSelectedDestination.sectorAbbr,
        hex: effectiveSelectedDestination.hex,
      }),
    );
    setHasStoredJumpDestination(true);

    await dispatch(
      advanceTurn({
        shipUpdate: {
          status: "in_jump",
          destinationWorldHex: effectiveSelectedDestination.hex,
          destinationWorldSectorAbbr: effectiveSelectedDestination.sectorAbbr,
        },
      }),
    );
    await dispatch(fetchShip());
  };

  const handleResolveNormalJump = useCallback(async () => {
    if (!ship?.destinationWorldId || resolvingJumpRef.current) return;
    resolvingJumpRef.current = true;

    try {
      await dispatch(
        advanceTurn({
          shipUpdate: {
            status: "docked",
            currentWorldId: ship.destinationWorldId,
            destinationWorldHex: "",
            jumpArrivesTurn: null,
          },
        }),
      );
      localStorage.removeItem(JUMP_DESTINATION_STORAGE_KEY);
      setHasStoredJumpDestination(false);
      await dispatch(fetchShip());
      await dispatch(invalidateCharacters());
      await dispatch(fetchCharacters());
      setSelectedDestinationKey(null);
      setPlotStatus("idle");
    } finally {
      resolvingJumpRef.current = false;
    }
  }, [dispatch, ship?.destinationWorldId]);

  const handleWarpExitReached = useCallback(async () => {
    if (resolvingJumpRef.current || warpExitStartedRef.current) return;
    warpExitStartedRef.current = true;

    setWarpExitBlankActive(true);
    setRenderedSceneMode("system");
    setShowWarpLayer(false);
    setWarpLayerActive(false);
    setWarpLayerOpacity(0);

    try {
      await delay(120);
      await handleResolveNormalJump();
      await delay(240);
    } finally {
      warpExitStartedRef.current = false;
      setWarpExitBlankActive(false);
    }
  }, [handleResolveNormalJump]);

  const handleResolveFailedJump = useCallback(async () => {
    if (!ship?.currentWorldId || resolvingJumpRef.current) return;
    resolvingJumpRef.current = true;

    try {
      await dispatch(
        advanceTurn({
          shipUpdate: {
            status: "docked",
            currentWorldId: ship.currentWorldId,
            destinationWorldHex: "",
            jumpArrivesTurn: null,
          },
        }),
      );
      localStorage.removeItem(JUMP_DESTINATION_STORAGE_KEY);
      setHasStoredJumpDestination(false);
      await dispatch(fetchShip());
      setSelectedDestinationKey(null);
      setPlotStatus("idle");
    } finally {
      resolvingJumpRef.current = false;
    }
  }, [dispatch, ship?.currentWorldId]);

  const sectorByCoord = new Map(allSectors.map((sector) => [`${sector.X},${sector.Y}`, sector]));
  const nav = buildNavTargets(
    activeSubsectorKey,
    activeSectorAbbr,
    allSectors,
    activeSector,
    sectorByCoord,
  );
  const miniMap = (
    <SubsectorMiniMapView
      visible={miniMapVisible}
      label={activeSector?.subsectors[activeSubsectorKey] ?? activeSubsectorKey}
      nav={nav}
      onToggle={() => dispatch(setSubsectorMiniMapVisible(false))}
      onNavigate={(target) => dispatch(setActiveLocation({
        sectorAbbr: target.sectorAbbr,
        subsectorKey: target.subsectorKey,
      }))}
    >
      <SubsectorGridView
        sectorAbbr={activeSectorAbbr}
        subsectorKey={activeSubsectorKey}
        sector={activeSector}
        status={activeSectorStatus}
        activeWorldHex={activeWorldHex}
        ship={ship}
        shipColor={shipColor}
        showHeader={false}
        scale={0.5}
        onSelectWorld={(id) => dispatch(setActiveWorldHex({ sectorAbbr: activeSectorAbbr, hex: id }))}
        onHoverWorld={(id) => dispatch(setTargetWorldHex({ sectorAbbr: activeSectorAbbr, hex: id }))}
        onLeaveGrid={() => dispatch(clearTargetWorldHex())}
      />
    </SubsectorMiniMapView>
  );
  const navigationHud = (
    <NavigationHud
      cells={jumpCells}
      targets={jumpTargets}
      selectedKey={effectiveSelectedDestinationKey}
      loading={jumpTargetsLoading}
      error={jumpTargetsError}
      plotStatus={effectivePlotStatus}
      onSelect={handleSelectDestination}
      onPlotCourse={handlePlotCourse}
      onExecuteJump={handleExecuteJump}
    />
  );
  const renderableLocation = showWarpLayer
    ? lastRenderableLocationRef.current
    : world && shipLocation?.sectorAbbr
      ? { world, sectorAbbr: shipLocation.sectorAbbr }
      : null;

  return (
    <div className="starfield h-screen w-screen overflow-hidden">
      {warpExitBlankActive ? (
        <div className="h-full w-full bg-black" />
      ) : renderableLocation ? (
        <div className="relative h-full w-full">
          <StarSystemView
            world={renderableLocation.world}
            sectorAbbr={renderableLocation.sectorAbbr}
            sceneMode={renderedSceneMode}
            showWarpLayer={showWarpLayer}
            renderSystemLayer={!showWarpLayer}
            warpLayerOpacity={warpLayerOpacity}
            warpLayerActive={warpLayerActive}
            showHudControls
            miniMapVisible={miniMapVisible}
            onOpenMiniMap={() => dispatch(setSubsectorMiniMapVisible(true))}
            onCloseMiniMap={() => dispatch(setSubsectorMiniMapVisible(false))}
            miniMap={miniMap}
            navigationHudVisible={navigationHudVisible}
            onOpenNavigationHud={() => setNavigationHudVisible(true)}
            onCloseNavigationHud={() => setNavigationHudVisible(false)}
            navigationHud={navigationHud}
            onWarpExitReached={handleWarpExitReached}
          />
          {ship?.status === "in_jump" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
              <div className="hud-panel pointer-events-auto flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-(--hud-text)">
                <span className="text-(--hud-accent)">Jump Space</span>
                {!hasStoredJumpDestination && (
                  <button
                    type="button"
                    onClick={handleResolveFailedJump}
                    className="border border-(--hud-border) px-2 py-1 text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
                  >
                    Return
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
            {shipStatus === "loading" || sectorStatus === "loading"
              ? "Loading current system"
              : "Current ship system unavailable"}
          </span>
        </div>
      )}
    </div>
  );
};

export default CurrentSystemPageClient;
