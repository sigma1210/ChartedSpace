import type { ResolvedTacticalScenarioTerrain } from "@/plugins/characterCombat/tacticalScenarioDefinitions";

export type TacticalEditorTerrainCellsLayerProps = {
  terrain: Pick<
    ResolvedTacticalScenarioTerrain,
    | "deploymentCells"
    | "interiorCells"
    | "terrainByCell"
    | "elevationLevelByCell"
    | "closeMachineryCells"
    | "liquidHydrogenAreas"
    | "bridges"
  >;
};

const TacticalEditorTerrainCellsLayer = ({ terrain }: TacticalEditorTerrainCellsLayerProps) => <>
  {terrain.deploymentCells.map((cell) => <rect key={`deployment:${cell.x}:${cell.y}`} x={cell.x + 0.05} y={cell.y + 0.05} width="0.9" height="0.9" fill="#22c55e" fillOpacity="0.18" stroke="#86efac" strokeWidth="0.04" pointerEvents="none" />)}
  {terrain.interiorCells.map((cell) => <rect key={`interior:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#164e63" opacity="0.28" />)}
  {Object.entries(terrain.terrainByCell).map(([key, terrainType]) => {
    const [x, y] = key.split(":").map(Number);
    const elevationLevel = terrain.elevationLevelByCell[key] ?? 0;
    const elevatedColor = elevationLevel >= 3 ? "#67e8f9" : elevationLevel === 2 ? "#22d3ee" : "#0e7490";
    const fill = terrainType === "elevated" ? elevatedColor
      : terrainType === "close-machinery" ? "#b45309"
      : terrainType === "grass" ? "#3f7d20"
      : terrainType === "sand" ? "#c2a15a"
      : terrainType === "water" ? "#2563a8"
      : terrainType === "bush" ? "#4d7c0f"
      : "#475569";
    const opacity = terrainType === "elevated"
      ? Math.min(0.42 + elevationLevel * 0.12, 0.78)
      : terrainType === "grass" ? 0.24
      : terrainType === "sand" ? 0.24
      : terrainType === "water" ? 0.42
      : terrainType === "bush" ? 0.2
      : 0.46;
    return <rect key={`terrain:${key}`} x={x} y={y} width="1" height="1" fill={fill} opacity={opacity} />;
  })}
  {terrain.closeMachineryCells.map((cell) => <rect key={`close-machinery:${cell.x}:${cell.y}`} x={cell.x} y={cell.y} width="1" height="1" fill="#b45309" opacity="0.62" />)}
  {terrain.liquidHydrogenAreas.flatMap((area) => area.cells.map((cell) => <rect key={`liquid-hydrogen:${area.id}:${cell.x}:${cell.y}`} x={cell.x + 0.06} y={cell.y + 0.06} width="0.88" height="0.88" fill={area.filled ? "#67e8f9" : "#0f172a"} stroke={area.filled ? "#cffafe" : "#64748b"} strokeWidth="0.08" opacity={area.filled ? 0.7 : 0.85} />))}
  {terrain.bridges.flatMap((bridge) => bridge.cells.map((cell, index) => <rect key={`bridge:${bridge.id}:${index}`} x={cell.x + 0.08} y={cell.y + 0.08} width="0.84" height="0.84" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="0.1" opacity="0.78" />))}
</>;

export default TacticalEditorTerrainCellsLayer;
