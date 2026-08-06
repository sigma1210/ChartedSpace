import type { PointerEvent as ReactPointerEvent } from "react";
import type { TacticalDrawnRaisedArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { areaSegmentSvgPath } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorRaisedAreasLayerProps = {
  areas: TacticalDrawnRaisedArea[];
  levels: Record<string, number>;
  selectedAreaId: string | null;
  interactionDisabled: boolean;
  onSelect: (id: string) => void;
  onBeginControlDrag: (id: string, segmentIndex: number) => void;
};

const TacticalEditorRaisedAreasLayer = ({
  areas,
  levels,
  selectedAreaId,
  interactionDisabled,
  onSelect,
  onBeginControlDrag,
}: TacticalEditorRaisedAreasLayerProps) => <>
  {areas.map((area) => {
    const selected = area.id === selectedAreaId;
    const level = levels[area.id] ?? 1;
    const outlineColor = level >= 3 ? "#c084fc" : level === 2 ? "#22d3ee" : "#67e8f9";
    const selectArea = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onSelect(area.id);
    };
    return <g key={area.id} data-elevation-level={level}>
      {area.segments.map((segment, index) => segment.kind !== "line"
        ? <g key={index}>
          <path data-testid={`drawn-raised-area-${area.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectArea} />
          {selected && segment.kind === "quadratic" && <>
            <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
            <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
            <circle
              data-testid={`raised-area-${area.id}-segment-${index}-control-handle`}
              aria-label={`Reshape ${area.id} curve ${index + 1}`}
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
                onBeginControlDrag(area.id, index);
              }}
            />
          </>}
        </g>
        : <line key={index} data-testid={`drawn-raised-area-${area.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={selected ? "#fef08a" : outlineColor} strokeWidth={selected ? "0.34" : "0.24"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectArea} />)}
      {selected && <text x={area.segments[0]?.from.x ?? 0} y={(area.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.45" fontWeight="bold" pointerEvents="none">Level {level}</text>}
    </g>;
  })}
</>;

export default TacticalEditorRaisedAreasLayer;
