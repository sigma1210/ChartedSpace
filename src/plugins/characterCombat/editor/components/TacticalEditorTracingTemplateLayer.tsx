import type { PointerEvent as ReactPointerEvent } from "react";
import type { TacticalScenarioTracingTemplate } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TracingTemplateCorner } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  rotateOffset,
  tracingTemplateCenter,
  tracingTemplateHandlePoint,
  tracingTemplateRotation,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorTracingTemplateDragKind = "move" | "rotate" | TracingTemplateCorner;

export type TacticalEditorTracingTemplateLayerProps = {
  template: TacticalScenarioTracingTemplate | undefined;
  editing: boolean;
  interactionDisabled: boolean;
  onBeginDrag: (
    kind: TacticalEditorTracingTemplateDragKind,
    event: ReactPointerEvent<SVGElement>,
  ) => void;
};

const TacticalEditorTracingTemplateLayer = ({
  template,
  editing,
  interactionDisabled,
  onBeginDrag,
}: TacticalEditorTracingTemplateLayerProps) => {
  if (!template?.visible) return null;

  const center = tracingTemplateCenter(template);
  const rotation = tracingTemplateRotation(template);
  const corners = (["nw", "ne", "se", "sw"] as const).map((corner) => ({
    corner,
    point: tracingTemplateHandlePoint(template, corner),
  }));
  const topCenterOffset = rotateOffset({ x: 0, y: -template.height / 2 }, rotation);
  const rotationHandleOffset = rotateOffset({ x: 0, y: -template.height / 2 - 1.5 }, rotation);
  const topCenter = { x: center.x + topCenterOffset.x, y: center.y + topCenterOffset.y };
  const rotationHandle = {
    x: center.x + rotationHandleOffset.x,
    y: center.y + rotationHandleOffset.y,
  };
  const beginDrag = (
    kind: TacticalEditorTracingTemplateDragKind,
    event: ReactPointerEvent<SVGElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onBeginDrag(kind, event);
  };

  return <>
    <image
      data-testid="tracing-template-image"
      href={template.imagePath}
      x={template.x}
      y={template.y}
      width={template.width}
      height={template.height}
      opacity={template.opacity}
      preserveAspectRatio={template.lockAspectRatio ? "xMidYMid meet" : "none"}
      transform={`rotate(${template.rotation} ${template.x + template.width / 2} ${template.y + template.height / 2})`}
      pointerEvents="none"
    />
    {editing && !interactionDisabled && <g data-testid="tracing-template-controls">
      <polygon
        data-testid="tracing-template-move-area"
        points={corners.map(({ point }) => `${point.x},${point.y}`).join(" ")}
        fill="#22d3ee"
        fillOpacity="0.04"
        stroke="#67e8f9"
        strokeWidth="0.16"
        strokeDasharray="0.45 0.25"
        className="cursor-move"
        onPointerDown={(event) => beginDrag("move", event)}
      />
      <line x1={topCenter.x} y1={topCenter.y} x2={rotationHandle.x} y2={rotationHandle.y} stroke="#67e8f9" strokeWidth="0.12" pointerEvents="none" />
      <circle
        data-testid="tracing-template-rotation-handle"
        cx={rotationHandle.x}
        cy={rotationHandle.y}
        r="0.34"
        fill="#a855f7"
        stroke="#f3e8ff"
        strokeWidth="0.1"
        className="cursor-grab"
        onPointerDown={(event) => beginDrag("rotate", event)}
      />
      {corners.map(({ corner, point }) => <circle
        key={corner}
        data-testid={`tracing-template-${corner}-handle`}
        aria-label={`Resize tracing template from ${corner}`}
        cx={point.x}
        cy={point.y}
        r="0.3"
        fill="#0e7490"
        stroke="#cffafe"
        strokeWidth="0.1"
        className="cursor-nwse-resize"
        onPointerDown={(event) => beginDrag(corner, event)}
      />)}
    </g>}
  </>;
};

export default TacticalEditorTracingTemplateLayer;
