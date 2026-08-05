import type {
  TacticalEnemyType,
  TacticalTerrainPrimitiveType,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectTacticalEditorCircleTerrainType,
  selectTacticalEditorEnemyKind,
  selectTacticalEditorOpenToolGroup,
  selectTacticalEditorPlacementKind,
  selectTacticalEditorPrimaryTool,
} from "@/plugins/characterCombat/editor/redux/selectors";
import {
  editorCircleTerrainTypeChanged,
  editorDrawingToolActivated,
  editorDrawingToolCleared,
  editorEnemyToolActivated,
  editorEnemyToolCleared,
  editorPrimaryToolActivated,
  editorToolGroupClosed,
  editorToolGroupToggled,
  type TacticalEditorPrimaryTool,
  type TacticalEditorToolGroup,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

export const useTacticalEditorToolState = () => {
  const dispatch = useAppDispatch();
  const primaryTool = useAppSelector(selectTacticalEditorPrimaryTool);
  const placementKind = useAppSelector(selectTacticalEditorPlacementKind);
  const enemyKind = useAppSelector(selectTacticalEditorEnemyKind);
  const circleTerrainType = useAppSelector(selectTacticalEditorCircleTerrainType);
  const openToolGroup = useAppSelector(selectTacticalEditorOpenToolGroup);

  const setPlacementKind = (tool: string | null) => dispatch(tool
    ? editorDrawingToolActivated(tool)
    : editorDrawingToolCleared());
  const setEnemyKind = (kind: TacticalEnemyType | null) => dispatch(kind
    ? editorEnemyToolActivated(kind)
    : editorEnemyToolCleared());
  const setPrimaryTool = (tool: TacticalEditorPrimaryTool) => {
    dispatch(editorPrimaryToolActivated(tool));
  };
  const setCircleTerrainType = (terrainType: TacticalTerrainPrimitiveType) => {
    dispatch(editorCircleTerrainTypeChanged(terrainType));
  };
  const toggleToolGroup = (group: TacticalEditorToolGroup) => {
    dispatch(editorToolGroupToggled(group));
  };
  const closeToolGroup = () => dispatch(editorToolGroupClosed());

  return {
    primaryTool,
    placementKind,
    enemyKind,
    circleTerrainType,
    openToolGroup,
    setPlacementKind,
    setEnemyKind,
    setPrimaryTool,
    setCircleTerrainType,
    toggleToolGroup,
    closeToolGroup,
  };
};
