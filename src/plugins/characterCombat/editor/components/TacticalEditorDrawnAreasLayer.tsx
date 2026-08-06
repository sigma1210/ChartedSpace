import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { TacticalDrawnArea } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { GridPoint } from "@/plugins/characterCombat/types";
import type {
  AreaCubicControlDrag,
  ConstrainedAreaDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  areaSegmentSvgPath,
  cellKey,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorDrawnAreasLayerProps = {
  areas: TacticalDrawnArea[];
  cellsByArea: ReadonlyMap<TacticalDrawnArea, GridPoint[]>;
  selectedAreaId: string | null;
  selectedAreaAnchor: { areaId: string; anchorIndex: number } | null;
  nodeEditActive: boolean;
  interactionDisabled: boolean;
  onSelect: (id: string) => void;
  onInsertAnchor: (id: string, segmentIndex: number, event: ReactMouseEvent<SVGElement>) => void;
  onBeginQuadraticControlDrag: (id: string, segmentIndex: number) => void;
  onBeginCubicControlDrag: (id: string, segmentIndex: number, control: AreaCubicControlDrag["control"]) => void;
  onSelectAnchor: (selection: { areaId: string; anchorIndex: number }) => void;
  onBeginAnchorDrag: (id: string, anchorIndex: number) => void;
  onBeginConstrainedDrag: (id: string, kind: ConstrainedAreaDrag["kind"], point: GridPoint) => void;
};

const TacticalEditorDrawnAreasLayer = ({
  areas,
  cellsByArea,
  selectedAreaId,
  selectedAreaAnchor,
  nodeEditActive,
  interactionDisabled,
  onSelect,
  onInsertAnchor,
  onBeginQuadraticControlDrag,
  onBeginCubicControlDrag,
  onSelectAnchor,
  onBeginAnchorDrag,
  onBeginConstrainedDrag,
}: TacticalEditorDrawnAreasLayerProps) => <>
  {areas.map((area) => {
    const selected = area.id === selectedAreaId;
    const areaGeometry = area.geometry;
    const fill = area.surface === "grass" ? "#3f7d20"
      : area.surface === "sand" ? "#c2a15a"
      : area.surface === "water" ? "#2563a8"
      : area.surface === "close-machinery" ? "#b45309"
      : area.surface === "liquid-hydrogen" ? "#0284c7"
      : "transparent";
    const outline = selected ? "#fef08a" : area.boundary === "wall" ? "#e2e8f0" : "#67e8f9";
    const cells = cellsByArea.get(area) ?? [];
    const selectArea = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onSelect(area.id);
    };
    const insertAnchor = (event: ReactMouseEvent<SVGElement>, segmentIndex: number) => {
      if (!nodeEditActive || !selected || areaGeometry) return;
      onInsertAnchor(area.id, segmentIndex, event);
    };
    return <g key={area.id} data-testid={`drawn-area-${area.id}`} data-elevation-level={area.elevation} data-boundary={area.boundary} data-deployment={area.deployment ? "crew" : "none"}>
      {area.surface !== "none" && cells.map((cell) => <rect
        key={cellKey(cell)}
        x={cell.x}
        y={cell.y}
        width="1"
        height="1"
        fill={fill}
        fillOpacity={area.surface === "liquid-hydrogen" && area.settings?.filled === false ? "0.08" : "0.3"}
        pointerEvents="none"
      />)}
      {areaGeometry?.kind === "circle" && <circle
        data-testid={`drawn-area-${area.id}-interior-hit-target`}
        cx={areaGeometry.center.x}
        cy={areaGeometry.center.y}
        r={areaGeometry.radius}
        fill="transparent"
        pointerEvents={interactionDisabled ? "none" : "fill"}
        className={interactionDisabled ? undefined : "cursor-pointer"}
        onPointerDown={selectArea}
      />}
      {areaGeometry?.kind === "rectangle" && <rect
        data-testid={`drawn-area-${area.id}-interior-hit-target`}
        x={areaGeometry.x}
        y={areaGeometry.y}
        width={areaGeometry.width}
        height={areaGeometry.height}
        fill="transparent"
        pointerEvents={interactionDisabled ? "none" : "fill"}
        className={interactionDisabled ? undefined : "cursor-pointer"}
        onPointerDown={selectArea}
      />}
      {area.segments.map((segment, index) => segment.kind !== "line"
        ? <g key={index}>
          <path data-testid={`drawn-area-${area.id}-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke={outline} strokeWidth={selected ? "0.38" : area.boundary === "wall" ? "0.32" : "0.2"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectArea} onDoubleClick={(event) => insertAnchor(event, index)} />
          {selected && !areaGeometry && segment.kind === "quadratic" && <circle
            data-testid={`drawn-area-${area.id}-segment-${index}-control-handle`}
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
              onBeginQuadraticControlDrag(area.id, index);
            }}
          />}
          {selected && !areaGeometry && segment.kind === "cubic" && <g>
            <line x1={segment.from.x} y1={segment.from.y} x2={segment.control1.x} y2={segment.control1.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" pointerEvents="none" />
            <line x1={segment.to.x} y1={segment.to.y} x2={segment.control2.x} y2={segment.control2.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" pointerEvents="none" />
            {(["control1", "control2"] as const).map((control) => <circle
              key={control}
              data-testid={`drawn-area-${area.id}-segment-${index}-${control}-handle`}
              aria-label={`Move ${area.id} curve ${index + 1} ${control === "control1" ? "outgoing" : "incoming"} handle`}
              cx={segment[control].x}
              cy={segment[control].y}
              r="0.28"
              fill="#7c3aed"
              stroke="#ede9fe"
              strokeWidth="0.1"
              className="cursor-move"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                onBeginCubicControlDrag(area.id, index, control);
              }}
            />)}
          </g>}
        </g>
        : <line key={index} data-testid={`drawn-area-${area.id}-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke={outline} strokeWidth={selected ? "0.38" : area.boundary === "wall" ? "0.32" : "0.2"} className={interactionDisabled ? undefined : "cursor-pointer"} onPointerDown={selectArea} onDoubleClick={(event) => insertAnchor(event, index)} />)}
      {selected && !areaGeometry && area.segments.map((segment, index) => {
        const anchorSelected = nodeEditActive && selectedAreaAnchor?.areaId === area.id && selectedAreaAnchor.anchorIndex === index;
        return <circle
          key={`anchor:${index}`}
          data-testid={`drawn-area-${area.id}-anchor-${index}`}
          aria-label={`Move ${area.id} point ${index + 1}`}
          cx={segment.from.x}
          cy={segment.from.y}
          r="0.3"
          fill={anchorSelected ? "#f59e0b" : "#0891b2"}
          stroke={anchorSelected ? "#fef3c7" : "#ecfeff"}
          strokeWidth={anchorSelected ? "0.16" : "0.1"}
          className="cursor-move"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            if (nodeEditActive) onSelectAnchor({ areaId: area.id, anchorIndex: index });
            onBeginAnchorDrag(area.id, index);
          }}
        />;
      })}
      {selected && areaGeometry?.kind === "circle" && <>
        <line x1={areaGeometry.center.x} y1={areaGeometry.center.y} x2={areaGeometry.center.x + areaGeometry.radius} y2={areaGeometry.center.y} stroke="#fef08a" strokeWidth="0.1" strokeDasharray="0.3 0.2" pointerEvents="none" />
        <circle
          data-testid={`drawn-area-${area.id}-circle-center-handle`}
          aria-label={`Move ${area.id} circle`}
          cx={areaGeometry.center.x}
          cy={areaGeometry.center.y}
          r="0.32"
          fill="#0891b2"
          stroke="#ecfeff"
          strokeWidth="0.1"
          className="cursor-move"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginConstrainedDrag(area.id, "circle-center", areaGeometry.center);
          }}
        />
        <circle
          data-testid={`drawn-area-${area.id}-circle-radius-handle`}
          aria-label={`Resize ${area.id} circle`}
          cx={areaGeometry.center.x + areaGeometry.radius}
          cy={areaGeometry.center.y}
          r="0.32"
          fill="#d97706"
          stroke="#fef3c7"
          strokeWidth="0.1"
          className="cursor-ew-resize"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginConstrainedDrag(area.id, "circle-radius", { x: areaGeometry.center.x + areaGeometry.radius, y: areaGeometry.center.y });
          }}
        />
      </>}
      {selected && areaGeometry?.kind === "rectangle" && <>
        <circle
          data-testid={`drawn-area-${area.id}-rectangle-center-handle`}
          aria-label={`Move ${area.id} rectangle`}
          cx={areaGeometry.x + areaGeometry.width / 2}
          cy={areaGeometry.y + areaGeometry.height / 2}
          r="0.32"
          fill="#0891b2"
          stroke="#ecfeff"
          strokeWidth="0.1"
          className="cursor-move"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginConstrainedDrag(area.id, "rectangle-center", { x: areaGeometry.x + areaGeometry.width / 2, y: areaGeometry.y + areaGeometry.height / 2 });
          }}
        />
        {([
          ["top-left", areaGeometry.x, areaGeometry.y],
          ["top-right", areaGeometry.x + areaGeometry.width, areaGeometry.y],
          ["bottom-right", areaGeometry.x + areaGeometry.width, areaGeometry.y + areaGeometry.height],
          ["bottom-left", areaGeometry.x, areaGeometry.y + areaGeometry.height],
        ] as const).map(([corner, x, y]) => <rect
          key={corner}
          data-testid={`drawn-area-${area.id}-rectangle-${corner}-handle`}
          aria-label={`Resize ${area.id} rectangle ${corner}`}
          x={x - 0.28}
          y={y - 0.28}
          width="0.56"
          height="0.56"
          fill="#d97706"
          stroke="#fef3c7"
          strokeWidth="0.1"
          className="cursor-nwse-resize"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            onBeginConstrainedDrag(area.id, `rectangle-${corner}` as ConstrainedAreaDrag["kind"], { x, y });
          }}
        />)}
      </>}
      {selected && <text x={area.segments[0]?.from.x ?? 0} y={(area.segments[0]?.from.y ?? 0) - 0.45} fill="#fef08a" fontSize="0.42" fontWeight="bold" pointerEvents="none">{area.surface} · level {area.elevation} · {area.boundary}</text>}
    </g>;
  })}
</>;

export default TacticalEditorDrawnAreasLayer;
