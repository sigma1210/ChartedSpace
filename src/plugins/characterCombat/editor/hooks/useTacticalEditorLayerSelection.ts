import type { TacticalEditorLayerObject } from "@/plugins/characterCombat/editor/lib/tacticalEditorLayers";

type UseTacticalEditorLayerSelectionOptions = {
  lockedLayerKeys: ReadonlySet<string>;
  clearEditorSelection: () => void;
  activateSelectTool: () => void;
  selectTerrainPlacement: (id: string) => void;
  selectEnemy: (id: string) => void;
  selectWall: (id: string) => void;
  selectArea: (id: string) => void;
  selectTerrainRegion: (id: string) => void;
  selectTerrainPrimitive: (id: string) => void;
  selectNaturalTerrain: (id: string) => void;
  selectElevationTransition: (id: string) => void;
  selectPortal: (id: string) => void;
  selectFire: (position: { x: number; y: number }) => void;
  showAreaProperties: () => void;
  showWallProperties: () => void;
  showObjectProperties: () => void;
};

export const useTacticalEditorLayerSelection = ({
  lockedLayerKeys,
  clearEditorSelection,
  activateSelectTool,
  selectTerrainPlacement,
  selectEnemy,
  selectWall,
  selectArea,
  selectTerrainRegion,
  selectTerrainPrimitive,
  selectNaturalTerrain,
  selectElevationTransition,
  selectPortal,
  selectFire,
  showAreaProperties,
  showWallProperties,
  showObjectProperties,
}: UseTacticalEditorLayerSelectionOptions) => {
  const selectEditorLayerObject = (object: TacticalEditorLayerObject) => {
    if (lockedLayerKeys.has(object.key) && object.kind !== "enemy") return false;
    clearEditorSelection();
    activateSelectTool();
    if (object.kind === "terrain-placement") {
      selectTerrainPlacement(object.id);
    } else if (object.kind === "enemy") {
      selectEnemy(object.id);
    } else if (object.kind === "wall") {
      selectWall(object.id);
      showWallProperties();
    } else if (object.kind === "area" || object.kind === "raised-area") {
      selectArea(object.id);
      if (object.kind === "area") showAreaProperties();
    } else if (object.kind === "terrain-region") {
      selectArea(object.id);
      selectTerrainRegion(object.id);
      showObjectProperties();
    } else if (object.kind === "primitive") {
      selectTerrainPrimitive(object.id);
    } else if (object.kind === "natural-terrain") {
      selectNaturalTerrain(object.id);
    } else if (object.kind === "elevation-transition") {
      selectElevationTransition(object.id);
    } else if (object.kind === "portal") {
      selectPortal(object.id);
    } else if (object.kind === "fire") {
      const [x, y] = object.id.split(":").map(Number);
      selectFire({ x, y });
    }
    return true;
  };

  return { selectEditorLayerObject };
};
