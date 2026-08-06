import type { TacticalAreaOutlineSegment } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { RaisedAreaDraft } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  areaSegmentSvgPath,
  cellKey,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorAreaDraftPreview = {
  segment: TacticalAreaOutlineSegment | null;
  cells: { x: number; y: number }[];
};

export type TacticalEditorPenNodeDragPreview = {
  anchor: { x: number; y: number };
  handle: { x: number; y: number };
};

const TacticalEditorAreaDraftLayer = ({
  draft,
  preview,
  penNodeDrag,
  onBeginControlDrag,
}: {
  draft: RaisedAreaDraft | null;
  preview: TacticalEditorAreaDraftPreview;
  penNodeDrag: TacticalEditorPenNodeDragPreview | null;
  onBeginControlDrag: (segmentIndex: number) => void;
}) => draft && <g data-testid="raised-area-draft-preview">
  {preview.cells.map((cell) => <rect key={cellKey(cell)} x={cell.x + 0.04} y={cell.y + 0.04} width="0.92" height="0.92" fill="#06b6d4" fillOpacity="0.34" stroke="#67e8f9" strokeWidth="0.06" pointerEvents="none" />)}
  {draft.segments.map((segment, index) => segment.kind === "cubic"
    ? <g key={index}>
      <path data-testid={`raised-area-draft-segment-${index}`} d={areaSegmentSvgPath(segment)} fill="none" stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />
      <line x1={segment.from.x} y1={segment.from.y} x2={segment.control1.x} y2={segment.control1.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
      <line x1={segment.control2.x} y1={segment.control2.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
      <circle cx={segment.control1.x} cy={segment.control1.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" pointerEvents="none" />
      <circle cx={segment.control2.x} cy={segment.control2.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" pointerEvents="none" />
    </g>
    : segment.kind === "quadratic" ? <g key={index}>
      <path data-testid={`raised-area-draft-segment-${index}`} d={`M ${segment.from.x} ${segment.from.y} Q ${segment.control.x} ${segment.control.y} ${segment.to.x} ${segment.to.y}`} fill="none" stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />
      <line x1={segment.from.x} y1={segment.from.y} x2={segment.control.x} y2={segment.control.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
      <line x1={segment.control.x} y1={segment.control.y} x2={segment.to.x} y2={segment.to.y} stroke="#a78bfa" strokeWidth="0.08" strokeDasharray="0.3 0.2" pointerEvents="none" />
      <circle
        data-testid={`raised-area-draft-segment-${index}-control-handle`}
        aria-label={`Reshape raised-area curve ${index + 1}`}
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
          onBeginControlDrag(index);
        }}
      />
    </g>
    : <line key={index} data-testid={`raised-area-draft-segment-${index}`} x1={segment.from.x} y1={segment.from.y} x2={segment.to.x} y2={segment.to.y} stroke="#fef08a" strokeWidth="0.28" pointerEvents="none" />)}
  {preview.segment && (preview.segment.kind !== "line"
    ? <path data-testid="raised-area-draft-closing-segment" d={areaSegmentSvgPath(preview.segment)} fill="none" stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />
    : <line data-testid="raised-area-draft-closing-segment" x1={preview.segment.from.x} y1={preview.segment.from.y} x2={preview.segment.to.x} y2={preview.segment.to.y} stroke="#fef08a" strokeWidth="0.28" strokeDasharray="0.35 0.2" pointerEvents="none" />)}
  {penNodeDrag && Math.hypot(penNodeDrag.handle.x - penNodeDrag.anchor.x, penNodeDrag.handle.y - penNodeDrag.anchor.y) >= 0.1 && <g data-testid="raised-area-draft-tangent-guide" pointerEvents="none">
    <line x1={penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x} y1={penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y} x2={penNodeDrag.handle.x} y2={penNodeDrag.handle.y} stroke="#a78bfa" strokeWidth="0.1" strokeDasharray="0.3 0.2" />
    <circle cx={penNodeDrag.handle.x} cy={penNodeDrag.handle.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" />
    <circle cx={penNodeDrag.anchor.x * 2 - penNodeDrag.handle.x} cy={penNodeDrag.anchor.y * 2 - penNodeDrag.handle.y} r="0.22" fill="#7c3aed" stroke="#ede9fe" strokeWidth="0.08" />
  </g>}
  <circle cx={draft.start.x} cy={draft.start.y} r="0.3" fill="#22d3ee" stroke="#ecfeff" strokeWidth="0.1" pointerEvents="none" />
  <circle cx={draft.current.x} cy={draft.current.y} r="0.22" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.08" pointerEvents="none" />
</g>;

export default TacticalEditorAreaDraftLayer;
