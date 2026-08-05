import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectTacticalEditorHudLayouts,
  selectTacticalEditorHudLayoutsReady,
} from "@/plugins/characterCombat/editor/state/selectors";
import { editorHudLayoutChanged } from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import {
  defaultTacticalEditorHudLayouts,
  tacticalEditorHudIds,
  type TacticalEditorHudId,
  type TacticalEditorHudLayout,
} from "@/plugins/characterCombat/editor/state/hudLayouts";

type HudLayoutUpdate = TacticalEditorHudLayout
  | ((current: TacticalEditorHudLayout) => TacticalEditorHudLayout);

export const useTacticalEditorHudLayoutState = () => {
  const dispatch = useAppDispatch();
  const hudLayouts = useAppSelector(selectTacticalEditorHudLayouts);
  const hudLayoutsReady = useAppSelector(selectTacticalEditorHudLayoutsReady);
  const changeHudLayout = useCallback((id: TacticalEditorHudId, layout: TacticalEditorHudLayout) => {
    dispatch(editorHudLayoutChanged({ id, layout }));
  }, [dispatch]);
  const persistHudLayout = useMemo(() => Object.fromEntries(tacticalEditorHudIds.map((id) => [
    id,
    (layout: TacticalEditorHudLayout) => changeHudLayout(id, layout),
  ])) as Record<TacticalEditorHudId, (layout: TacticalEditorHudLayout) => void>, [changeHudLayout]);
  const setHudLayout = (id: TacticalEditorHudId, update: HudLayoutUpdate) => {
    const current = hudLayouts[id];
    changeHudLayout(id, typeof update === "function" ? update(current) : update);
  };

  const setCirclePropertiesLayout = (update: HudLayoutUpdate) => setHudLayout("circle-properties", update);
  const setEnemyPaletteLayout = (update: HudLayoutUpdate) => setHudLayout("enemy-palette", update);
  const setConsoleEditorLayout = (update: HudLayoutUpdate) => setHudLayout("console-editor", update);
  const setEnemyEditorLayout = (update: HudLayoutUpdate) => setHudLayout("enemy-editor", update);
  const setNavigationLayout = (update: HudLayoutUpdate) => setHudLayout("navigation", update);
  const setTracingTemplateLayout = (update: HudLayoutUpdate) => setHudLayout("tracing-template", update);
  const setToolsLayout = (update: HudLayoutUpdate) => setHudLayout("tools", update);
  const setLayersLayout = (update: HudLayoutUpdate) => setHudLayout("layers", update);
  const setAreaPropertiesLayout = (update: HudLayoutUpdate) => setHudLayout("area-properties", update);
  const setObjectPropertiesLayout = (update: HudLayoutUpdate) => setHudLayout("object-properties", update);

  const showTracingTemplateHud = () => setTracingTemplateLayout((current) => ({
    ...current,
    visible: true,
    position: { ...defaultTacticalEditorHudLayouts["tracing-template"].position },
  }));
  const showLayersHud = () => setLayersLayout((current) => ({ ...current, visible: true }));
  const restoreHud = useCallback((id: string) => {
    const resolvedId = id === "legacy-circle-properties" ? "circle-properties" : id;
    if (!tacticalEditorHudIds.includes(resolvedId as TacticalEditorHudId)) return;
    const hudId = resolvedId as TacticalEditorHudId;
    changeHudLayout(hudId, { ...hudLayouts[hudId], visible: true });
  }, [changeHudLayout, hudLayouts]);

  return {
    hudLayoutsReady,
    hudLayouts,
    circlePropertiesLayout: hudLayouts["circle-properties"],
    enemyPaletteLayout: hudLayouts["enemy-palette"],
    consoleEditorLayout: hudLayouts["console-editor"],
    enemyEditorLayout: hudLayouts["enemy-editor"],
    navigationLayout: hudLayouts.navigation,
    tracingTemplateLayout: hudLayouts["tracing-template"],
    toolsLayout: hudLayouts.tools,
    layersLayout: hudLayouts.layers,
    areaPropertiesLayout: hudLayouts["area-properties"],
    objectPropertiesLayout: hudLayouts["object-properties"],
    setCirclePropertiesLayout,
    setEnemyPaletteLayout,
    setConsoleEditorLayout,
    setEnemyEditorLayout,
    setNavigationLayout,
    setTracingTemplateLayout,
    setToolsLayout,
    setLayersLayout,
    setAreaPropertiesLayout,
    setObjectPropertiesLayout,
    persistCirclePropertiesLayout: persistHudLayout["circle-properties"],
    persistEnemyPaletteLayout: persistHudLayout["enemy-palette"],
    persistConsoleEditorLayout: persistHudLayout["console-editor"],
    persistEnemyEditorLayout: persistHudLayout["enemy-editor"],
    persistNavigationLayout: persistHudLayout.navigation,
    persistTracingTemplateLayout: persistHudLayout["tracing-template"],
    persistToolsLayout: persistHudLayout.tools,
    persistLayersLayout: persistHudLayout.layers,
    persistAreaPropertiesLayout: persistHudLayout["area-properties"],
    persistObjectPropertiesLayout: persistHudLayout["object-properties"],
    showTracingTemplateHud,
    showLayersHud,
    restoreHud,
  };
};
