import type { GridPoint } from "@/plugins/characterCombat/types";
import type { TacticalNaturalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { cellKey, naturalTerrainEditorColor } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorPlacementPreview = {
  kind: "terrain" | "fire";
  origin: GridPoint;
  cells: GridPoint[];
  valid: boolean;
} | {
  kind: "natural";
  placement: TacticalNaturalTerrainPlacement;
  cells: GridPoint[];
  valid: boolean;
};

export type TacticalEditorPlacementPreviewLayerProps = {
  preview: TacticalEditorPlacementPreview | null;
};

const TacticalEditorPlacementPreviewLayer = ({ preview }: TacticalEditorPlacementPreviewLayerProps) => <>
  {preview?.kind === "terrain" && preview.cells.map((cell) => <rect
    key={`placement-preview:${cell.x}:${cell.y}`}
    x={preview.origin.x + cell.x}
    y={preview.origin.y + cell.y}
    width="1"
    height="1"
    fill={preview.valid ? "#94a3b8" : "#ef4444"}
    fillOpacity="0.28"
    stroke={preview.valid ? "#e2e8f0" : "#fecaca"}
    strokeWidth="0.12"
    pointerEvents="none"
  />)}
  {preview?.kind === "fire" && <circle
    cx={preview.origin.x + 0.5}
    cy={preview.origin.y + 0.5}
    r="0.34"
    fill={preview.valid ? "#f97316" : "#ef4444"}
    fillOpacity="0.58"
    stroke={preview.valid ? "#fed7aa" : "#fecaca"}
    strokeWidth="0.12"
    pointerEvents="none"
  />}
  {preview?.kind === "natural" && <g data-testid="natural-terrain-placement-preview" pointerEvents="none">
    {preview.cells.map((cell) => <rect
      key={`natural-preview:${cellKey(cell)}`}
      x={cell.x + 0.06}
      y={cell.y + 0.06}
      width="0.88"
      height="0.88"
      fill={preview.valid ? naturalTerrainEditorColor(preview.placement.kind).footprint : "#ef4444"}
      fillOpacity="0.2"
      stroke={preview.valid ? "#bef264" : "#fecaca"}
      strokeWidth="0.08"
    />)}
    <circle
      cx={preview.placement.position.x + 0.5}
      cy={preview.placement.position.y + 0.5}
      r={preview.placement.radius}
      fill={preview.valid ? naturalTerrainEditorColor(preview.placement.kind).fill : "#dc2626"}
      fillOpacity="0.42"
      stroke={preview.valid ? "#fef08a" : "#fecaca"}
      strokeWidth="0.12"
    />
  </g>}
</>;

export default TacticalEditorPlacementPreviewLayer;
