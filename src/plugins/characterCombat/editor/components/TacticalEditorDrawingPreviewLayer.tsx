import type { TacticalWallPortalPlacementCandidate } from "@/plugins/characterCombat/tacticalWallPortals";
import type {
  CircleDraft,
  EditorWallDraft,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";

export type TacticalEditorRectanglePreview = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TacticalEditorPortalPreview = TacticalWallPortalPlacementCandidate & {
  valid: boolean;
};

export const TacticalEditorRectangleDraftPreview = ({
  preview,
}: {
  preview: TacticalEditorRectanglePreview | null;
}) => preview && <g data-testid="rectangle-area-draft-preview" pointerEvents="none">
  <rect x={preview.x} y={preview.y} width={preview.width} height={preview.height} fill="#22d3ee" fillOpacity="0.16" stroke="#fef08a" strokeWidth="0.24" strokeDasharray="0.5 0.25" />
  <text x={preview.x + preview.width / 2} y={preview.y + preview.height / 2} textAnchor="middle" dominantBaseline="middle" fill="#fef08a" fontSize="0.5" fontWeight="bold">{preview.width.toFixed(1)} × {preview.height.toFixed(1)}</text>
</g>;

export const TacticalEditorCircleDraftPreview = ({
  draft,
}: {
  draft: CircleDraft | null;
}) => draft && draft.radius > 0 && <g data-testid="circle-draft-preview" pointerEvents="none">
  <circle
    cx={draft.center.x}
    cy={draft.center.y}
    r={draft.radius}
    fill="#22d3ee"
    fillOpacity="0.12"
    stroke="#fef08a"
    strokeWidth="0.28"
    strokeDasharray="0.35 0.2"
  />
  <circle cx={draft.center.x} cy={draft.center.y} r="0.2" fill="#22d3ee" />
</g>;

export const TacticalEditorBoundaryDraftPreview = ({
  portal,
  wall,
}: {
  portal: TacticalEditorPortalPreview | null;
  wall: EditorWallDraft | null;
}) => <>
  {portal && <g pointerEvents="none" data-testid="wall-portal-preview">
    <line x1={portal.edge.from.x} y1={portal.edge.from.y} x2={portal.edge.to.x} y2={portal.edge.to.y} stroke={portal.valid ? "#86efac" : "#f87171"} strokeWidth="0.48" />
    {portal.kind === "iris-valve" && <circle cx={portal.center.x} cy={portal.center.y} r="0.3" fill="#334155" stroke={portal.valid ? "#86efac" : "#f87171"} strokeWidth="0.12" />}
  </g>}
  {wall && <g pointerEvents="none" data-testid="wall-draft-preview">
    {wall.curved
      ? <path d={`M ${wall.from.x} ${wall.from.y} Q ${(wall.from.x + wall.to.x) / 2} ${(wall.from.y + wall.to.y) / 2} ${wall.to.x} ${wall.to.y}`} fill="none" stroke="#fef08a" strokeWidth="0.3" strokeDasharray="0.35 0.2" />
      : <line x1={wall.from.x} y1={wall.from.y} x2={wall.to.x} y2={wall.to.y} stroke="#fef08a" strokeWidth="0.3" strokeDasharray="0.35 0.2" />}
    <circle cx={wall.from.x} cy={wall.from.y} r="0.22" fill="#22d3ee" stroke="#cffafe" strokeWidth="0.08" />
    <circle cx={wall.to.x} cy={wall.to.y} r="0.22" fill="#f59e0b" stroke="#fef3c7" strokeWidth="0.08" />
  </g>}
</>;
