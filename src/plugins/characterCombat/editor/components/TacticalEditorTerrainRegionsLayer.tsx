import type { PointerEvent as ReactPointerEvent } from "react";
import type { TacticalDrawnTerrainRegion } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { GridPoint } from "@/plugins/characterCombat/types";
import {
  areaSegmentSvgPath,
  cellKey,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorTerrainRegionsLayerProps = {
  regions: TacticalDrawnTerrainRegion[];
  cellsByRegion: ReadonlyMap<TacticalDrawnTerrainRegion, GridPoint[]>;
  selectedRegionId: string | null;
  interactionDisabled: boolean;
  onSelect: (id: string) => void;
  onBeginControlDrag: (id: string, segmentIndex: number) => void;
};

const TacticalEditorTerrainRegionsLayer = ({
  regions,
  cellsByRegion,
  selectedRegionId,
  interactionDisabled,
  onSelect,
  onBeginControlDrag,
}: TacticalEditorTerrainRegionsLayerProps) => <>
  {regions.map((region) => {
    const selected = region.id === selectedRegionId;
    const fill = region.kind === "close-machinery" ? "#b45309"
      : region.kind === "liquid-hydrogen" ? "#0284c7"
      : region.kind === "grass" ? "#3f7d20"
      : region.kind === "sand" ? "#c2a15a"
      : "#2563a8";
    const outline = region.kind === "close-machinery" ? "#fbbf24"
      : region.kind === "liquid-hydrogen" ? "#7dd3fc"
      : region.kind === "grass" ? "#65a30d"
      : region.kind === "sand" ? "#f2d28b"
      : "#60a5fa";
    const label = region.kind === "close-machinery" ? "Closed machinery"
      : region.kind === "liquid-hydrogen"
        ? `Liquid hydrogen · ${region.settings?.filled === false ? "empty" : "filled"}`
        : region.kind === "grass" ? "Grass" : region.kind === "sand" ? "Sand" : "Water";
    const flatSurface = region.kind === "grass" || region.kind === "sand" || region.kind === "water";
    const cells = cellsByRegion.get(region) ?? [];
    const selectRegion = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onSelect(region.id);
    };
    return <g key={region.id} data-testid={`drawn-terrain-region-${region.id}`}>
      {cells.map((cell) => <rect
        key={cellKey(cell)}
        x={cell.x + (flatSurface ? 0 : 0.04)}
        y={cell.y + (flatSurface ? 0 : 0.04)}
        width={flatSurface ? "1" : "0.92"}
        height={flatSurface ? "1" : "0.92"}
        fill={fill}
        fillOpacity={region.kind === "liquid-hydrogen" && region.settings?.filled === false ? "0.08" : "0.28"}
        stroke={outline}
        strokeWidth={flatSurface ? "0" : "0.04"}
        pointerEvents="none"
      />)}
      {region.segments.map((segment, index) => segment.kind !== "line"
        ? <g key={index}>
          <path data-testid={`drawn-terrain-region-${region.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={selected ? "#fef08a" : outline} strokeWidth={selected ? "0.34" : "0.24"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectRegion} />
          {selected && segment.kind === "quadratic" && <>
            <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
            <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
            <circle
              data-testid={`terrain-region-${region.id}-segment-${index}-control-handle`}
              aria-label={`Reshape ${region.id} curve ${index + 1}`}
              cx={segment.control.x}
              cy={segment.control.y}
              r="0.32"
              fill="#7c3aed"
              stroke="#ede9fe"
              strokeWidth="0.1"
              className="cursor-move"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                onBeginControlDrag(region.id, index);
              }}
            />
          </>}
        </g>
        : <line key={index} data-testid={`drawn-terrain-region-${region.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={selected ? "#fef08a" : outline} strokeWidth={selected ? "0.34" : "0.24"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectRegion} />)}
      {selected && <text x={region.segments[0]?.from.x ?? 0} y={(region.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.42" fontWeight="bold" pointerEvents="none">
        {label}
      </text>}
    </g>;
  })}
</>;

export default TacticalEditorTerrainRegionsLayer;
