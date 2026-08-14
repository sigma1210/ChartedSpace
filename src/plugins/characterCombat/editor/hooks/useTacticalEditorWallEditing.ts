import {
  resolveTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  WallControlDrag,
  WallEndpoint,
  WallEndpointDrag,
  WallMoveDrag,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { gridPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorWallEditingOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  selectedWallId: string | null;
  dragWallEndpoint: WallEndpointDrag | null;
  dragWallMove: WallMoveDrag | null;
  dragWallControl: WallControlDrag | null;
  setSelectedWallId: (id: string | null) => void;
  setSelectedPortalId: (id: string | null) => void;
  setDragWallEndpoint: (drag: WallEndpointDrag | null) => void;
  setDragWallMove: (drag: WallMoveDrag | null) => void;
  setDragWallControl: (drag: WallControlDrag | null) => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorWallEditing = ({
  draft,
  setDraft,
  selectedWallId,
  dragWallEndpoint,
  dragWallMove,
  dragWallControl,
  setSelectedWallId,
  setSelectedPortalId,
  setDragWallEndpoint,
  setDragWallMove,
  setDragWallControl,
  setPlacementError,
}: UseTacticalEditorWallEditingOptions) => {
  const selectedWall = (draft.drawnWalls ?? [])
    .find((wall) => wall.id === selectedWallId) ?? null;

  const updateSelectedWall = (update: { elevation?: number }) => {
    if (!selectedWall) return false;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === selectedWall.id
        ? { ...wall, ...update }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall level is not valid.");
      return false;
    }
  };

  const beginWallEndpointDrag = (id: string, endpoint: WallEndpoint) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setDragWallEndpoint({
      id,
      endpoint,
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };

  const resizeWallEndpoint = (point: { x: number; y: number }) => {
    if (!dragWallEndpoint) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallEndpoint.id);
    if (!wall || (
      wall[dragWallEndpoint.endpoint].x === point.x
      && wall[dragWallEndpoint.endpoint].y === point.y
    )) return;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === wall.id
        ? { ...candidateWall, [dragWallEndpoint.endpoint]: gridPoint(point) }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall endpoint is not valid.");
    }
  };

  const finishWallEndpointDrag = () => setDragWallEndpoint(null);

  const cancelWallEndpointDrag = () => {
    if (!dragWallEndpoint) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallEndpoint.id
        ? {
          ...wall,
          from: { ...dragWallEndpoint.original.from },
          to: { ...dragWallEndpoint.original.to },
          ...(dragWallEndpoint.original.control
            ? { control: { ...dragWallEndpoint.original.control } }
            : {}),
        }
        : wall),
    }));
    setDragWallEndpoint(null);
    setPlacementError(null);
  };

  const beginWallMove = (id: string, start: { x: number; y: number }) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall) return;
    setSelectedWallId(id);
    setSelectedPortalId(null);
    setDragWallMove({
      id,
      start: gridPoint(start),
      original: {
        from: { ...wall.from },
        to: { ...wall.to },
        ...(wall.control ? { control: { ...wall.control } } : {}),
      },
    });
    setPlacementError(null);
  };

  const moveWall = (point: { x: number; y: number }) => {
    if (!dragWallMove) return;
    const delta = {
      x: point.x - dragWallMove.start.x,
      y: point.y - dragWallMove.start.y,
    };
    const from = {
      x: dragWallMove.original.from.x + delta.x,
      y: dragWallMove.original.from.y + delta.y,
    };
    const to = {
      x: dragWallMove.original.to.x + delta.x,
      y: dragWallMove.original.to.y + delta.y,
    };
    const control = dragWallMove.original.control ? {
      x: dragWallMove.original.control.x + delta.x,
      y: dragWallMove.original.control.y + delta.y,
    } : undefined;
    const currentWall = (draft.drawnWalls ?? []).find((wall) => wall.id === dragWallMove.id);
    if (!currentWall || (
      currentWall.from.x === from.x
      && currentWall.from.y === from.y
      && currentWall.to.x === to.x
      && currentWall.to.y === to.y
    )) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? { ...wall, from, to, ...(control ? { control } : {}) }
        : wall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall position is not valid.");
    }
  };

  const finishWallMove = () => setDragWallMove(null);

  const cancelWallMove = () => {
    if (!dragWallMove) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallMove.id
        ? {
          ...wall,
          from: { ...dragWallMove.original.from },
          to: { ...dragWallMove.original.to },
          ...(dragWallMove.original.control
            ? { control: { ...dragWallMove.original.control } }
            : {}),
        }
        : wall),
    }));
    setDragWallMove(null);
    setPlacementError(null);
  };

  const beginWallControlDrag = (id: string) => {
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === id);
    if (!wall?.control) return;
    setSelectedWallId(id);
    setDragWallControl({ id, original: { ...wall.control } });
    setPlacementError(null);
  };

  const reshapeWallControl = (point: { x: number; y: number }) => {
    if (!dragWallControl) return;
    const wall = (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallControl.id);
    if (!wall?.control || (wall.control.x === point.x && wall.control.y === point.y)) return;
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).map((candidateWall) => candidateWall.id === dragWallControl.id
        ? { ...candidateWall, control: { x: point.x, y: point.y } }
        : candidateWall),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That curve position is not valid.");
    }
  };

  const finishWallControlDrag = () => setDragWallControl(null);

  const cancelWallControlDrag = () => {
    if (!dragWallControl) return;
    setDraft((current) => ({
      ...current,
      drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === dragWallControl.id
        ? { ...wall, control: { ...dragWallControl.original } }
        : wall),
    }));
    setDragWallControl(null);
    setPlacementError(null);
  };

  const deleteSelectedWall = () => {
    if (!selectedWall) return false;
    const candidate = {
      ...draft,
      drawnWalls: (draft.drawnWalls ?? []).filter((wall) => wall.id !== selectedWall.id),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedWallId(null);
      setDragWallEndpoint(null);
      setDragWallMove(null);
      setDragWallControl(null);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That wall cannot be deleted.");
      return false;
    }
  };

  return {
    selectedWall,
    updateSelectedWall,
    beginWallEndpointDrag,
    resizeWallEndpoint,
    finishWallEndpointDrag,
    cancelWallEndpointDrag,
    beginWallMove,
    moveWall,
    finishWallMove,
    cancelWallMove,
    beginWallControlDrag,
    reshapeWallControl,
    finishWallControlDrag,
    cancelWallControlDrag,
    deleteSelectedWall,
  };
};
