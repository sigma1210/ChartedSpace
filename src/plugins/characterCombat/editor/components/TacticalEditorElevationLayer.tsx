import type { PointerEvent as ReactPointerEvent } from "react";
import type {
  TacticalElevationEdgeCandidate,
  TacticalRampPlacementPreview,
} from "@/plugins/characterCombat/tacticalElevationTransitions";
import type { ResolvedTacticalScenarioTerrain } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TacticalElevationTransitionKind,
  TacticalLadderMount,
} from "@/plugins/characterCombat/types";
import { cellKey } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorElevationLayerProps = {
  terrain: Pick<ResolvedTacticalScenarioTerrain, "elevationAccessCells" | "elevationTransitions">;
  selectedElevationTransitionId: string | null;
  interactionDisabled: boolean;
  elevationTransitionKind: TacticalElevationTransitionKind | null;
  elevationEdgeCandidates: TacticalElevationEdgeCandidate[];
  elevationEdgePreview: TacticalElevationEdgeCandidate | null;
  ladderMountPreview: { mount: TacticalLadderMount | null; error: string | null } | null;
  rampPreview: TacticalRampPlacementPreview | null;
  onSelectTransition: (id: string) => void;
};

const TacticalEditorElevationLayer = ({
  terrain,
  selectedElevationTransitionId,
  interactionDisabled,
  elevationTransitionKind,
  elevationEdgeCandidates,
  elevationEdgePreview,
  ladderMountPreview,
  rampPreview,
  onSelectTransition,
}: TacticalEditorElevationLayerProps) => <>
  {terrain.elevationAccessCells.map((cell) => <rect key={`stairs:${cell.x}:${cell.y}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#cbd5e1" stroke="#0891b2" strokeWidth="0.12" />)}
  {terrain.elevationTransitions.map((transition) => {
    const selected = transition.id === selectedElevationTransitionId;
    const center = {
      x: (transition.lower.x + transition.upper.x + 1) / 2,
      y: (transition.lower.y + transition.upper.y + 1) / 2,
    };
    const selectTransition = (event: ReactPointerEvent<SVGElement>) => {
      if (interactionDisabled) return;
      event.stopPropagation();
      onSelectTransition(transition.id);
    };
    if (transition.kind === "stairs") {
      return <rect
        key={transition.id}
        data-testid={`elevation-transition-${transition.id}`}
        x={transition.lower.x + 0.1}
        y={transition.lower.y + 0.1}
        width="0.8"
        height="0.8"
        fill="#64748b"
        stroke={selected ? "#fef08a" : "#e2e8f0"}
        strokeWidth={selected ? "0.18" : "0.1"}
        className={interactionDisabled ? undefined : "cursor-pointer"}
        onPointerDown={selectTransition}
      />;
    }
    if (transition.kind === "ladder") {
      const horizontalEdge = transition.lower.x !== transition.upper.x;
      return <g
        key={transition.id}
        data-testid={`elevation-transition-${transition.id}`}
        className={interactionDisabled ? undefined : "cursor-pointer"}
        onPointerDown={selectTransition}
      >
        <line
          x1={center.x + (horizontalEdge ? 0 : -0.32)}
          y1={center.y + (horizontalEdge ? -0.32 : 0)}
          x2={center.x + (horizontalEdge ? 0 : 0.32)}
          y2={center.y + (horizontalEdge ? 0.32 : 0)}
          stroke={selected ? "#fef08a" : "#f59e0b"}
          strokeWidth={selected ? "0.24" : "0.16"}
        />
        <circle cx={center.x} cy={center.y} r="0.14" fill="#0f172a" stroke="#fde68a" strokeWidth="0.06" />
      </g>;
    }
    return <g
      key={transition.id}
      data-testid={`elevation-transition-${transition.id}`}
      className={interactionDisabled ? undefined : "cursor-pointer"}
      onPointerDown={selectTransition}
    >
      <line
        x1={transition.lower.x + 0.5}
        y1={transition.lower.y + 0.5}
        x2={transition.upper.x + 0.5}
        y2={transition.upper.y + 0.5}
        stroke={selected ? "#fef08a" : "#64748b"}
        strokeWidth={selected ? "0.48" : "0.36"}
      />
      <circle cx={transition.lower.x + 0.5} cy={transition.lower.y + 0.5} r="0.13" fill="#22d3ee" />
      <path d={`M ${transition.upper.x + 0.5} ${transition.upper.y + 0.5} l -0.18 0.12 l 0.06 -0.2 z`} fill="#ede9fe" />
    </g>;
  })}
  {elevationTransitionKind && <g data-testid="valid-elevation-edges" pointerEvents="none">
    {elevationEdgeCandidates.map((candidate) => {
      const active = candidate.key === elevationEdgePreview?.key;
      return <line
        key={candidate.key}
        data-testid={`valid-elevation-edge-${candidate.key}`}
        x1={candidate.edge.from.x}
        y1={candidate.edge.from.y}
        x2={candidate.edge.to.x}
        y2={candidate.edge.to.y}
        stroke={active ? "#fef08a" : "#4ade80"}
        strokeWidth={active ? "0.34" : "0.18"}
        strokeDasharray={active ? undefined : "0.22 0.12"}
        opacity={active ? 1 : 0.8}
      />;
    })}
    {elevationEdgePreview && <>
      <circle cx={elevationEdgePreview.lower.x + 0.5} cy={elevationEdgePreview.lower.y + 0.5} r="0.17" fill="#22d3ee" stroke="#cffafe" strokeWidth="0.07" />
      <circle cx={elevationEdgePreview.upper.x + 0.5} cy={elevationEdgePreview.upper.y + 0.5} r="0.17" fill="#a78bfa" stroke="#ede9fe" strokeWidth="0.07" />
      <line
        x1={elevationEdgePreview.lower.x + 0.5}
        y1={elevationEdgePreview.lower.y + 0.5}
        x2={elevationEdgePreview.upper.x + 0.5}
        y2={elevationEdgePreview.upper.y + 0.5}
        stroke="#fef08a"
        strokeWidth="0.1"
        strokeDasharray="0.16 0.1"
      />
      {elevationTransitionKind === "stairs" && <rect
        data-testid="stairs-placement-preview"
        x={elevationEdgePreview.lower.x + 0.1}
        y={elevationEdgePreview.lower.y + 0.1}
        width="0.8"
        height="0.8"
        fill="#64748b"
        fillOpacity="0.72"
        stroke="#fef08a"
        strokeWidth="0.12"
      />}
      {elevationTransitionKind === "ladder" && <g data-testid="ladder-placement-preview">
        <line
          x1={(ladderMountPreview?.mount?.position.x ?? elevationEdgePreview.edge.from.x)
            - (ladderMountPreview?.mount?.tangent.x ?? 0) * 0.27}
          y1={(ladderMountPreview?.mount?.position.y ?? elevationEdgePreview.edge.from.y)
            - (ladderMountPreview?.mount?.tangent.y ?? 0) * 0.27}
          x2={(ladderMountPreview?.mount?.position.x ?? elevationEdgePreview.edge.to.x)
            + (ladderMountPreview?.mount?.tangent.x ?? 0) * 0.27}
          y2={(ladderMountPreview?.mount?.position.y ?? elevationEdgePreview.edge.to.y)
            + (ladderMountPreview?.mount?.tangent.y ?? 0) * 0.27}
          stroke={ladderMountPreview?.error ? "#ef4444" : "#f59e0b"}
          strokeWidth="0.28"
        />
        <circle cx={ladderMountPreview?.mount?.position.x ?? elevationEdgePreview.center.x} cy={ladderMountPreview?.mount?.position.y ?? elevationEdgePreview.center.y} r="0.2" fill="#0f172a" stroke={ladderMountPreview?.error ? "#fecaca" : "#fef08a"} strokeWidth="0.08" />
        <text x={ladderMountPreview?.mount?.position.x ?? elevationEdgePreview.center.x} y={(ladderMountPreview?.mount?.position.y ?? elevationEdgePreview.center.y) + 0.11} textAnchor="middle" fill={ladderMountPreview?.error ? "#fecaca" : "#fef3c7"} fontSize="0.28" fontWeight="bold">L</text>
        {ladderMountPreview?.error && <text x={elevationEdgePreview.center.x} y={elevationEdgePreview.center.y - 0.35} textAnchor="middle" fill="#fecaca" fontSize="0.28" fontWeight="bold">{ladderMountPreview.error}</text>}
      </g>}
      {elevationTransitionKind === "ramp" && rampPreview && <g data-testid="ramp-placement-preview">
        {rampPreview.path.slice(0, -1).map((cell) => <rect
          key={cellKey(cell)}
          x={cell.x + 0.08}
          y={cell.y + 0.08}
          width="0.84"
          height="0.84"
          fill={rampPreview.valid ? "#526875" : "#dc2626"}
          fillOpacity="0.5"
          stroke={rampPreview.valid ? "#9bc4cf" : "#fecaca"}
          strokeWidth="0.1"
        />)}
        <line
          x1={rampPreview.lower.x + 0.5}
          y1={rampPreview.lower.y + 0.5}
          x2={rampPreview.upper.x + 0.5}
          y2={rampPreview.upper.y + 0.5}
          stroke={rampPreview.valid ? "#fef08a" : "#f87171"}
          strokeWidth="0.16"
        />
        <text
          x={rampPreview.lower.x + 0.5}
          y={rampPreview.lower.y + 0.62}
          textAnchor="middle"
          fill={rampPreview.valid ? "#fef08a" : "#fee2e2"}
          fontSize="0.28"
          fontWeight="bold"
        >{Math.max(0, rampPreview.path.length - 1)}</text>
        <text
          data-testid="ramp-placement-preview-status"
          x={rampPreview.edge.center.x}
          y={rampPreview.edge.center.y - 0.35}
          textAnchor="middle"
          fill={rampPreview.valid ? "#d9f99d" : "#fecaca"}
          fontSize="0.3"
          fontWeight="bold"
        >{rampPreview.valid ? "Click to place ramp" : rampPreview.error}</text>
      </g>}
    </>}
  </g>}
</>;

export default TacticalEditorElevationLayer;
