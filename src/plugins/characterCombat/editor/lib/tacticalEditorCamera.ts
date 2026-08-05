export type TacticalEditorCamera = {
  centerX: number;
  centerY: number;
  zoom: number;
};

export type TacticalEditorMapSize = { width: number; height: number };
export type TacticalEditorViewportPixels = { width: number; height: number };
export type TacticalEditorSnapMode = "grid" | "half-grid" | "quarter-grid" | "freeform";

const MIN_ZOOM = 1;
const MAX_ZOOM = 16;

const SNAP_INCREMENT: Record<Exclude<TacticalEditorSnapMode, "freeform">, number> = {
  grid: 1,
  "half-grid": 0.5,
  "quarter-grid": 0.25,
};

export const snapTacticalEditorPoint = (
  point: { x: number; y: number },
  mode: TacticalEditorSnapMode,
  map: TacticalEditorMapSize,
) => {
  const snap = (value: number, maximum: number) => {
    const bounded = Math.max(0, Math.min(maximum, value));
    if (mode === "freeform") return Number(bounded.toFixed(4));
    const increment = SNAP_INCREMENT[mode];
    return Number((Math.round(bounded / increment) * increment).toFixed(4));
  };
  return { x: snap(point.x, map.width), y: snap(point.y, map.height) };
};

export const fitTacticalEditorCamera = (map: TacticalEditorMapSize): TacticalEditorCamera => ({
  centerX: map.width / 2,
  centerY: map.height / 2,
  zoom: 1,
});

export const clampTacticalEditorCamera = (
  camera: TacticalEditorCamera,
  map: TacticalEditorMapSize,
): TacticalEditorCamera => {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
  const halfWidth = map.width / zoom / 2;
  const halfHeight = map.height / zoom / 2;
  return {
    centerX: Math.max(halfWidth, Math.min(map.width - halfWidth, camera.centerX)),
    centerY: Math.max(halfHeight, Math.min(map.height - halfHeight, camera.centerY)),
    zoom,
  };
};

export const tacticalEditorViewBox = (
  camera: TacticalEditorCamera,
  map: TacticalEditorMapSize,
) => {
  const clamped = clampTacticalEditorCamera(camera, map);
  const width = map.width / clamped.zoom;
  const height = map.height / clamped.zoom;
  return {
    x: clamped.centerX - width / 2,
    y: clamped.centerY - height / 2,
    width,
    height,
  };
};

export const zoomTacticalEditorCameraAt = (
  camera: TacticalEditorCamera,
  anchor: { x: number; y: number },
  factor: number,
  map: TacticalEditorMapSize,
) => {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));
  const ratio = camera.zoom / zoom;
  return clampTacticalEditorCamera({
    centerX: anchor.x - (anchor.x - camera.centerX) * ratio,
    centerY: anchor.y - (anchor.y - camera.centerY) * ratio,
    zoom,
  }, map);
};

export const panTacticalEditorCamera = (
  camera: TacticalEditorCamera,
  screenDelta: { x: number; y: number },
  viewport: TacticalEditorViewportPixels,
  map: TacticalEditorMapSize,
) => {
  if (viewport.width <= 0 || viewport.height <= 0) return camera;
  const visibleMapWidth = map.width / camera.zoom;
  const visibleMapHeight = map.height / camera.zoom;
  // The SVG uses its default `preserveAspectRatio="xMidYMid meet"` behavior,
  // so both axes share one screen-to-map scale. Using each viewport dimension
  // independently makes horizontal panning too slow whenever the map is
  // letterboxed inside a wider editor.
  const mapUnitsPerScreenPixel = Math.max(
    visibleMapWidth / viewport.width,
    visibleMapHeight / viewport.height,
  );
  return clampTacticalEditorCamera({
    ...camera,
    centerX: camera.centerX - screenDelta.x * mapUnitsPerScreenPixel,
    centerY: camera.centerY - screenDelta.y * mapUnitsPerScreenPixel,
  }, map);
};
