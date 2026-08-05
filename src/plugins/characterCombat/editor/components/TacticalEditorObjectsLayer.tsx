import type { ResolvedTacticalScenarioTerrain } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { facingName, facingVector } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export type TacticalEditorObjectsLayerProps = {
  objects: ResolvedTacticalScenarioTerrain["terrainObjects"];
};

const TacticalEditorObjectsLayer = ({ objects }: TacticalEditorObjectsLayerProps) => <>
  {objects.filter((object) => object.kind === "hatch").map((hatch) => <g key={hatch.id}>
    <rect x={hatch.position.x + 0.12} y={hatch.position.y + 0.12} width="0.76" height="0.76" rx="0.08" fill="#334155" stroke="#fbbf24" strokeWidth="0.1" />
    <line x1={hatch.position.x + 0.2} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.8} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
    <line x1={hatch.position.x + 0.8} y1={hatch.position.y + 0.2} x2={hatch.position.x + 0.2} y2={hatch.position.y + 0.8} stroke="#94a3b8" strokeWidth="0.045" />
  </g>)}
  {objects.filter((object) => object.kind === "terminal").map((object) => {
    if (object.visualKind !== "human") return <g key={object.id} aria-label={object.label}>
      <rect x={object.position.x + 0.15} y={object.position.y + 0.15} width="0.7" height="0.7" fill="#22d3ee" />
    </g>;
    const direction = facingVector(object.facing);
    return <g key={object.id} aria-label={`${object.label} · facing ${facingName(object.facing)}`}>
      <circle cx={object.position.x + 0.5} cy={object.position.y + 0.31} r="0.16" fill="#c084fc" stroke="#f3e8ff" strokeWidth="0.06" />
      <path d={`M ${object.position.x + 0.28} ${object.position.y + 0.8} Q ${object.position.x + 0.5} ${object.position.y + 0.44} ${object.position.x + 0.72} ${object.position.y + 0.8}`} fill="#a855f7" stroke="#f3e8ff" strokeWidth="0.06" />
      <line x1={object.position.x + 0.5} y1={object.position.y + 0.5} x2={object.position.x + 0.5 + direction.x * 0.4} y2={object.position.y + 0.5 + direction.y * 0.4} stroke="#fef08a" strokeWidth="0.1" />
      <circle cx={object.position.x + 0.5 + direction.x * 0.4} cy={object.position.y + 0.5 + direction.y * 0.4} r="0.08" fill="#fef08a" />
    </g>;
  })}
</>;

export default TacticalEditorObjectsLayer;
