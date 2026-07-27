"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleDot, Globe2, Grid3X3, Info, Map as MapIcon, Navigation, Radar } from "lucide-react";
import { GalaxyMiniMapHudContent } from "@/components/map/GalaxyMiniMap";
import { SectorMiniMapHudContent } from "@/components/map/SectorMiniMap";
import { SubsectorMiniMapHudContent } from "@/components/map/SubsectorMiniMap";
import { SystemScene3D, SystemTopDownMap } from "@/components/system-view-v2";
import CurrentWorldMapPanel from "@/components/world/CurrentWorldMapPanel";
import { HudHeader, HudIconButton, HudPanel } from "@/components/world/HudPrimitives";
import { MainWorldHud } from "@/components/world/MainWorldHud";
import { SystemLocationLifecycle } from "@/components/world/SystemLocationLifecycle";
import { registeredPluginHudLayouts } from "@/plugins/hudLayouts";
import { registeredPluginHudRenderers } from "@/plugins/hudRenderers";
import { navigationSelectHudId } from "@/plugins/navigation";
import { NavigationHudContent } from "@/plugins/navigation/NavigationHud";
import { selectActiveShip, selectShipLocation } from "@/plugins/ship";
import type {
  PluginHudRendererRegistration,
  PluginRenderableHudRegistration,
} from "@/plugins/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectWorldByCoord } from "@/store/selectors/galaxy.selectors";
import { selectHudLayout, selectHudVisible } from "@/store/selectors/hud.selectors";
import {
  selectCurrentStarSystemViewModel,
  selectSystemStatusByKey,
} from "@/store/selectors/system.selectors";
import {
  selectShowWarpLayer,
  selectWarpLayerActive,
  selectWarpLayerOpacity,
} from "@/store/selectors/systemScene.selectors";
import { setActiveWorldHex } from "@/store/slices/galaxySlice";
import {
  clampHudOffset,
  setHudOffset,
  setHudPinned,
  setHudVisible,
  type HudId,
  type HudOffset,
} from "@/store/slices/hudSlice";
import { getSystemData } from "@/store/slices/systemSlice";
import { openSystemDetail } from "@/store/slices/uiSlice";

const HUD_SCREEN_MARGIN = 8;
const V2_HUD_VISUAL_SCALE = 1.6;
const subscribeToHydration = () => () => undefined;
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

const pluginHudRenderersById = new globalThis.Map<string, PluginHudRendererRegistration>(
  registeredPluginHudRenderers.map((renderer) => [renderer.id, renderer]),
);

const registeredRenderablePluginHuds = registeredPluginHudLayouts.flatMap((layout) => {
  const renderer = pluginHudRenderersById.get(layout.id);
  return renderer ? [{ ...layout, ...renderer }] : [];
}) satisfies PluginRenderableHudRegistration[];

type HudSize = {
  width: number;
  height: number;
};

type DragState = {
  startX: number;
  startY: number;
  origin: HudOffset;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const JumpNoiseOverlay = ({
  visible,
  active,
  opacity,
}: {
  visible: boolean;
  active: boolean;
  opacity: number;
}) => {
  const targetOpacity = visible || active || opacity > 0 ? clamp01(opacity) * 0.96 : 0;
  const rendered = visible || active || opacity > 0;

  return (
    <AnimatePresence>
      {rendered ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: targetOpacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.45, ease: [0.45, 0, 0.25, 1] }}
        >
          <style>
            {`
              @keyframes charted-space-jump-noise-drift {
                0% { transform: translate3d(-1.5%, -1%, 0) scale(1.04); filter: hue-rotate(0deg) saturate(1.2); }
                50% { transform: translate3d(1%, 1.5%, 0) scale(1.07); filter: hue-rotate(16deg) saturate(1.45); }
                100% { transform: translate3d(-0.5%, 1%, 0) scale(1.05); filter: hue-rotate(-10deg) saturate(1.3); }
              }

              @keyframes charted-space-jump-scan {
                from { transform: translateY(-8%); }
                to { transform: translateY(8%); }
              }

              @keyframes charted-space-jump-static {
                0% { opacity: 0.34; transform: translate3d(0, 0, 0); }
                50% { opacity: 0.46; transform: translate3d(0.25%, -0.2%, 0); }
                100% { opacity: 0.38; transform: translate3d(-0.2%, 0.15%, 0); }
              }
            `}
          </style>
          <svg className="absolute h-0 w-0" focusable="false" aria-hidden="true">
            <filter id="charted-space-jump-noise-filter">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.82"
                numOctaves="3"
                stitchTiles="stitch"
              />
              <feColorMatrix
                type="matrix"
                values="
                  0.35 0.00 0.75 0 0
                  0.00 0.90 0.42 0 0
                  0.72 0.12 0.95 0 0
                  0.00 0.00 0.00 0.62 0"
              />
            </filter>
          </svg>
          <div
            className="absolute -inset-4 mix-blend-screen"
            style={{
              animation: "charted-space-jump-noise-drift 1600ms ease-in-out infinite alternate",
              backgroundImage: [
                "radial-gradient(circle at 22% 28%, rgba(34,211,238,0.42), transparent 30%)",
                "radial-gradient(circle at 76% 62%, rgba(244,114,182,0.32), transparent 34%)",
                "radial-gradient(circle at 44% 76%, rgba(163,230,53,0.22), transparent 28%)",
                "linear-gradient(115deg, rgba(56,189,248,0.16), rgba(232,121,249,0.18) 32%, rgba(250,204,21,0.08) 58%, rgba(45,212,191,0.15))",
              ].join(", "),
              backgroundSize: "100% 100%",
            }}
          />
          <div
            className="absolute -inset-4 mix-blend-screen"
            style={{
              animation: "charted-space-jump-static 900ms ease-in-out infinite alternate",
              background: "rgba(255,255,255,0.42)",
              filter: "url(#charted-space-jump-noise-filter)",
            }}
          />
          <div
            className="absolute -inset-y-8 inset-x-0 opacity-45 mix-blend-screen"
            style={{
              animation: "charted-space-jump-scan 900ms ease-in-out infinite alternate",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 4px)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0_42%,rgba(0,0,0,0.28)_76%,rgba(0,0,0,0.64)_100%)]" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

const sameOffset = (a: HudOffset, b: HudOffset) =>
  Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;

const viewportCenterFromOffset = (offset: HudOffset, viewport: HudSize) => ({
  x: viewport.width / 2 + (offset.x * viewport.width) / 2,
  y: viewport.height / 2 - (offset.y * viewport.height) / 2,
});

const offsetFromViewportCenter = (
  center: { x: number; y: number },
  viewport: HudSize,
): HudOffset => ({
  x: (center.x - viewport.width / 2) / (viewport.width / 2),
  y: -(center.y - viewport.height / 2) / (viewport.height / 2),
});

const clampV2HudOffset = (
  offset: HudOffset,
  viewport: HudSize,
  panel: HudSize,
): HudOffset => {
  const baseOffset = clampHudOffset(offset);
  if (!viewport.width || !viewport.height || !panel.width || !panel.height) {
    return baseOffset;
  }

  const center = viewportCenterFromOffset(baseOffset, viewport);
  const halfWidth = panel.width / 2;
  const halfHeight = panel.height / 2;
  const minCenterX = HUD_SCREEN_MARGIN + halfWidth;
  const maxCenterX = viewport.width - HUD_SCREEN_MARGIN - halfWidth;
  const centerX =
    minCenterX > maxCenterX
      ? viewport.width / 2
      : Math.max(minCenterX, Math.min(maxCenterX, center.x));

  const minCenterY = HUD_SCREEN_MARGIN + halfHeight;
  const centerY = Math.max(minCenterY, center.y);

  return clampHudOffset(offsetFromViewportCenter({ x: centerX, y: centerY }, viewport));
};

const useViewportSize = () => {
  const [viewport, setViewport] = useState<HudSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const updateViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
};

const DraggableSystemHud = ({
  id,
  title,
  actions,
  className = "",
  closeTitle,
  minimizedContent,
  visualScale = V2_HUD_VISUAL_SCALE,
  children,
}: {
  id: HudId;
  title: string;
  actions?: ReactNode;
  className?: string;
  closeTitle?: string;
  minimizedContent?: ReactNode;
  visualScale?: number;
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout(id));
  const viewport = useViewportSize();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const [panelSize, setPanelSize] = useState<HudSize>({ width: 0, height: 0 });
  const [dragOffset, setDragOffset] = useState<HudOffset | null>(null);

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element) return;

    const updatePanelSize = () => {
      setPanelSize({ width: element.offsetWidth, height: element.offsetHeight });
    };

    updatePanelSize();
    const resizeObserver = new ResizeObserver(updatePanelSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const activeOffset = dragOffset ?? layout.offset;
  const scaledPanelSize = useMemo(
    () => ({
      width: panelSize.width * visualScale,
      height: panelSize.height * visualScale,
    }),
    [panelSize, visualScale],
  );
  const safeOffset = useMemo(
    () => clampV2HudOffset(activeOffset, viewport, scaledPanelSize),
    [activeOffset, scaledPanelSize, viewport],
  );

  useEffect(() => {
    if (!layout.visible || dragRef.current) return;
    const clampedOffset = clampV2HudOffset(layout.offset, viewport, scaledPanelSize);
    if (!sameOffset(clampedOffset, layout.offset)) {
      dispatch(setHudOffset({ id, offset: clampedOffset }));
    }
  }, [dispatch, id, layout.offset, layout.visible, scaledPanelSize, viewport]);

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element || !viewport.width || !viewport.height) return;

    const rect = element.getBoundingClientRect();
    if (rect.top >= HUD_SCREEN_MARGIN) return;

    const center = viewportCenterFromOffset(safeOffset, viewport);
    const correctedOffset = clampHudOffset(
      offsetFromViewportCenter(
        { x: center.x, y: center.y + (HUD_SCREEN_MARGIN - rect.top) },
        viewport,
      ),
    );

    if (sameOffset(correctedOffset, safeOffset)) return;

    if (dragRef.current) {
      dragOffsetRef.current = correctedOffset;
      setDragOffset(correctedOffset);
      return;
    }

    dispatch(setHudOffset({ id, offset: correctedOffset }));
  }, [dispatch, id, safeOffset, viewport]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current || layout.pinned) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(viewport.width, 1)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(viewport.height, 1)) * 2;
      const nextOffset = clampV2HudOffset(
        {
          x: dragRef.current.origin.x + dx,
          y: dragRef.current.origin.y + dy,
        },
        viewport,
        scaledPanelSize,
      );
      dragOffsetRef.current = nextOffset;
      setDragOffset(nextOffset);
    };

    const handleUp = () => {
      if (!dragRef.current) return;
      const finalOffset = dragOffsetRef.current;
      dragRef.current = null;
      dragOffsetRef.current = null;
      setDragOffset(null);
      if (finalOffset) {
        dispatch(setHudOffset({ id, offset: finalOffset }));
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dispatch, id, layout.pinned, scaledPanelSize, viewport]);

  const startDrag = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (layout.pinned || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: safeOffset,
      };
      dragOffsetRef.current = safeOffset;
      setDragOffset(safeOffset);
    },
    [layout.pinned, safeOffset],
  );

  if (!layout.visible && !minimizedContent) return null;

  return (
    <div
      ref={panelRef}
      className="pointer-events-none absolute z-20"
      style={{
        left: `${50 + safeOffset.x * 50}%`,
        top: `${50 - safeOffset.y * 50}%`,
        transform: `translate(-50%, -50%) scale(${visualScale})`,
      }}
    >
      {layout.visible ? (
        <HudPanel className={className}>
          <HudHeader
            title={title}
            actions={actions}
            pinned={layout.pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id, pinned: !layout.pinned }))}
            onClose={() => dispatch(setHudVisible({ id, visible: false }))}
            onDragStart={startDrag}
            closeTitle={closeTitle}
          />
          {children}
        </HudPanel>
      ) : (
        minimizedContent
      )}
    </div>
  );
};

const SystemV2HudControls = ({
  worldName,
  locationLabel,
  miniMapVisible,
  systemMapVisible,
  worldMapVisible,
  navigationHudVisible,
  mainWorldVisible,
  pluginHudButtons,
  onOpenMiniMap,
  onOpenSystemMap,
  onOpenWorldMap,
  onOpenNavigationHud,
  onOpenSystemDetail,
  onToggleMainWorld,
}: {
  worldName: string;
  locationLabel: string;
  miniMapVisible: boolean;
  systemMapVisible: boolean;
  worldMapVisible: boolean;
  navigationHudVisible: boolean;
  mainWorldVisible: boolean;
  pluginHudButtons: Array<{
    id: string;
    openTitle: string;
    visibleTitle: string;
    visible: boolean;
    Icon: PluginRenderableHudRegistration["Icon"];
    onOpen: () => void;
  }>;
  onOpenMiniMap: () => void;
  onOpenSystemMap: () => void;
  onOpenWorldMap: () => void;
  onOpenNavigationHud: () => void;
  onOpenSystemDetail: () => void;
  onToggleMainWorld: () => void;
}) => (
  <div className="min-w-44">
    <div className="mb-1 flex items-start justify-between gap-3">
      <div className="min-w-0 pt-0.5">
        <div className="truncate text-[9px] leading-none text-(--hud-text)">{worldName}</div>
        <div className="mt-0.5 truncate text-[8px] leading-none text-(--hud-text-dim)">{locationLabel}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        <HudIconButton
          title={miniMapVisible ? "Mini map visible" : "Open mini map"}
          onClick={onOpenMiniMap}
        >
          <Radar size={8} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={systemMapVisible ? "System map visible" : "Open system map"}
          onClick={onOpenSystemMap}
        >
          <CircleDot size={8} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={worldMapVisible ? "2D map visible" : "Open 2D map"}
          onClick={onOpenWorldMap}
        >
          <MapIcon size={8} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton title="Open system detail" onClick={onOpenSystemDetail}>
          <Info size={8} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={navigationHudVisible ? "Navigation visible" : "Open navigation"}
          onClick={onOpenNavigationHud}
        >
          <Navigation size={8} aria-hidden="true" />
        </HudIconButton>
        <HudIconButton
          title={mainWorldVisible ? "Hide main world" : "Open main world"}
          onClick={onToggleMainWorld}
        >
          <Globe2 size={8} aria-hidden="true" />
        </HudIconButton>
        {pluginHudButtons.map(({ id, openTitle, visibleTitle, visible, Icon, onOpen }) => (
          <HudIconButton
            key={id}
            title={visible ? visibleTitle : openTitle}
            onClick={onOpen}
          >
            <Icon size={8} aria-hidden="true" />
          </HudIconButton>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[8px] leading-none text-(--hud-text-dim)">
      <span>Status</span>
      <span className="text-(--hud-accent)">System View</span>
    </div>
  </div>
);

const SystemPageClient = () => {
  const dispatch = useAppDispatch();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  );
  const ship = useAppSelector(selectActiveShip);
  const shipLocation = useAppSelector(selectShipLocation);
  const sectorAbbr = shipLocation?.sectorAbbr ?? null;
  const hex = shipLocation?.hex ?? null;
  const mainWorld = useAppSelector(selectWorldByCoord(sectorAbbr, hex));
  const model = useAppSelector(selectCurrentStarSystemViewModel);
  const miniMapVisible = useAppSelector(selectHudVisible("subsectorMap"));
  const systemMapVisible = useAppSelector(selectHudVisible("systemMap"));
  const sectorMiniMapVisible = useAppSelector(selectHudVisible("sectorMap"));
  const galaxyMiniMapVisible = useAppSelector(selectHudVisible("galaxyMap"));
  const worldMapVisible = useAppSelector(selectHudVisible("worldMap"));
  const navigationHudVisible = useAppSelector(selectHudVisible(navigationSelectHudId));
  const mainWorldHudVisible = useAppSelector(selectHudVisible("mainWorld"));
  const showWarpLayer = useAppSelector(selectShowWarpLayer);
  const warpLayerActive = useAppSelector(selectWarpLayerActive);
  const warpLayerOpacity = useAppSelector(selectWarpLayerOpacity);
  const pluginHudVisibility = useAppSelector(
    (state) =>
      Object.fromEntries(
        registeredRenderablePluginHuds.map((registration) => [
          registration.id,
          state.hud.layouts[registration.id]?.visible ?? false,
        ]),
      ) as Record<string, boolean>,
  );
  const systemStatus = useAppSelector(
    sectorAbbr && hex ? selectSystemStatusByKey(sectorAbbr, hex) : () => "idle",
  );
  const inJump = ship?.status === "in_jump";
  const renderableSnapshot = model
    ? { model, mainWorld }
    : null;

  useEffect(() => {
    if (!sectorAbbr || !hex) return;
    if (systemStatus === "loading" || systemStatus === "loaded") return;
    dispatch(getSystemData({ sectorAbbr, hex }));
  }, [dispatch, hex, sectorAbbr, systemStatus]);

  return (
    <div className="relative h-screen overflow-hidden bg-[#020617] text-slate-100">
      <SystemLocationLifecycle />
      {!sectorAbbr || !hex ? (
        <div className="flex h-full items-center justify-center p-4">
          <div className="border border-slate-700 bg-slate-900/70 p-4 font-mono text-sm text-slate-300">
            No active ship location is available.
          </div>
        </div>
      ) : !renderableSnapshot ? (
        <div className="h-full" />
      ) : (
        <>
          <SystemScene3D
            model={renderableSnapshot.model}
            mainWorld={renderableSnapshot.mainWorld}
            className="h-full w-full"
          />
          <JumpNoiseOverlay
            visible={showWarpLayer}
            active={warpLayerActive}
            opacity={warpLayerOpacity}
          />
          <DraggableSystemHud
            id="hudControls"
            title="System"
            closeTitle="Hide HUD"
            minimizedContent={(
              <button
                type="button"
                onClick={() => dispatch(setHudVisible({ id: "hudControls", visible: true }))}
                title="Show HUD"
                aria-label="Show HUD"
                className="select-none border border-cyan-100/35 bg-(--hud-bg)/42 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-(--hud-accent) shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(34,211,238,0.10),0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-xl transition-colors [--hud-accent:#c7e8ef] [--hud-bg:#020c14] [--hud-text:#e7f2f4] hover:bg-(--hud-bg)/55 hover:text-(--hud-text)"
                style={{ pointerEvents: "auto" }}
              >
                HUD
              </button>
            )}
          >
            <SystemV2HudControls
              worldName={shipLocation?.worldName ?? renderableSnapshot.model.source.worldName}
              locationLabel={sectorAbbr && hex ? `${sectorAbbr} ${hex}` : "Location unavailable"}
              miniMapVisible={miniMapVisible}
              systemMapVisible={systemMapVisible}
              worldMapVisible={worldMapVisible}
              navigationHudVisible={navigationHudVisible}
              mainWorldVisible={mainWorldHudVisible}
              pluginHudButtons={registeredRenderablePluginHuds
                .filter((registration) => (
                  registration.id !== navigationSelectHudId
                  && registration.showInHudControls !== false
                ))
                .map((registration) => ({
                  id: registration.id,
                  openTitle: registration.openTitle,
                  visibleTitle: registration.visibleTitle,
                  visible: pluginHudVisibility[registration.id] ?? false,
                  Icon: registration.Icon,
                  onOpen: () => dispatch(setHudVisible({ id: registration.id, visible: true })),
                }))}
              onOpenMiniMap={() => dispatch(setHudVisible({ id: "subsectorMap", visible: true }))}
              onOpenSystemMap={() => dispatch(setHudVisible({ id: "systemMap", visible: true }))}
              onOpenWorldMap={() => dispatch(setHudVisible({ id: "worldMap", visible: true }))}
              onOpenNavigationHud={() => dispatch(setHudVisible({ id: navigationSelectHudId, visible: true }))}
              onOpenSystemDetail={() => {
                if (!sectorAbbr || !hex) return;
                dispatch(setActiveWorldHex({ sectorAbbr, hex }));
                dispatch(openSystemDetail(hex));
              }}
              onToggleMainWorld={() => dispatch(setHudVisible({ id: "mainWorld", visible: !mainWorldHudVisible }))}
            />
          </DraggableSystemHud>
          <DraggableSystemHud
            id="mainWorld"
            title="Main World"
            closeTitle="Close main world"
            visualScale={1}
            className="[background:linear-gradient(to_bottom,var(--hud-bg)_0_18px,rgba(2,12,20,0.2)_18px_100%)]"
          >
            <MainWorldHud world={mainWorld} inJump={inJump} />
          </DraggableSystemHud>
          <DraggableSystemHud
            id="systemMap"
            title="System Map"
            closeTitle="Close system map HUD"
            className="flex h-[380px] max-h-[78vh] w-[380px] max-w-[84vw] flex-col"
          >
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <SystemTopDownMap
                model={renderableSnapshot.model}
                width={520}
                height={520}
                className="h-full max-h-full w-auto max-w-full"
              />
            </div>
          </DraggableSystemHud>
          <DraggableSystemHud
            id="worldMap"
            title="World Map"
            closeTitle="Close world map HUD"
            className="flex h-[310px] max-h-[72vh] w-[430px] max-w-[84vw] flex-col"
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <CurrentWorldMapPanel compact mapScale={0.72} />
            </div>
          </DraggableSystemHud>
          <DraggableSystemHud
            id="subsectorMap"
            title="Subsector"
            actions={(
              <HudIconButton
                title={sectorMiniMapVisible ? "Sector map visible" : "Open sector map"}
                onClick={() => dispatch(setHudVisible({ id: "sectorMap", visible: true }))}
              >
                <Grid3X3 size={8} aria-hidden="true" />
              </HudIconButton>
            )}
            closeTitle="Close subsector HUD"
          >
            <SubsectorMiniMapHudContent />
          </DraggableSystemHud>
          <DraggableSystemHud
            id="sectorMap"
            title="Sector"
            actions={(
              <HudIconButton
                title={galaxyMiniMapVisible ? "Galaxy map visible" : "Open galaxy map"}
                onClick={() => dispatch(setHudVisible({ id: "galaxyMap", visible: true }))}
              >
                <Grid3X3 size={8} aria-hidden="true" />
              </HudIconButton>
            )}
            closeTitle="Close sector HUD"
          >
            <SectorMiniMapHudContent />
          </DraggableSystemHud>
          <DraggableSystemHud
            id="galaxyMap"
            title="Galaxy"
            closeTitle="Close galaxy HUD"
          >
            <GalaxyMiniMapHudContent />
          </DraggableSystemHud>
          <DraggableSystemHud
            id={navigationSelectHudId}
            title="Navigation"
            closeTitle="Close navigation HUD"
          >
            <NavigationHudContent />
          </DraggableSystemHud>
        </>
      )}
      {hydrated && registeredRenderablePluginHuds
        .filter((registration) => registration.id !== navigationSelectHudId)
        .map((registration) => {
          const PluginHudContent = registration.Component;
          return (
            <DraggableSystemHud
              key={registration.id}
              id={registration.id}
              title={registration.title}
              closeTitle={`Close ${registration.title} HUD`}
              className={registration.panelClassName}
            >
              {registration.contentClassName ? (
                <div className={registration.contentClassName}>
                  <PluginHudContent />
                </div>
              ) : (
                <PluginHudContent />
              )}
            </DraggableSystemHud>
          );
        })}
    </div>
  );
};

export default SystemPageClient;
