import {
  resolveTacticalScenarioTerrain,
  type TacticalScenarioDefinitionFile,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalAreaBoundaryPortalRepositionCandidate } from "@/plugins/characterCombat/tacticalAreaBoundaryPortals";
import { tacticalCirclePortalRepositionCandidate } from "@/plugins/characterCombat/tacticalTerrainPrimitives";
import { tacticalWallPortalRepositionCandidate } from "@/plugins/characterCombat/tacticalWallPortals";
import type { WallPortalDrag } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  tacticalEditorPortalPlacementCandidate,
  wallPortalKindForTool,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

type DraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

type UseTacticalEditorWallPortalsOptions = {
  draft: TacticalScenarioDefinitionFile;
  setDraft: (update: DraftUpdate) => void;
  activeDrawingTool: string | null;
  selectedPortalId: string | null;
  dragWallPortal: WallPortalDrag | null;
  setSelectedPlacementId: (id: string | null) => void;
  setSelectedEnemyId: (id: string | null) => void;
  setSelectedWallId: (id: string | null) => void;
  setSelectedAreaId: (id: string | null) => void;
  setSelectedPrimitiveId: (id: string | null) => void;
  setSelectedPortalId: (id: string | null) => void;
  setSelectedFire: (position: { x: number; y: number } | null) => void;
  setDragWallPortal: (drag: WallPortalDrag | null) => void;
  setPlacementError: (error: string | null) => void;
};

export const useTacticalEditorWallPortals = ({
  draft,
  setDraft,
  activeDrawingTool,
  selectedPortalId,
  dragWallPortal,
  setSelectedPlacementId,
  setSelectedEnemyId,
  setSelectedWallId,
  setSelectedAreaId,
  setSelectedPrimitiveId,
  setSelectedPortalId,
  setSelectedFire,
  setDragWallPortal,
  setPlacementError,
}: UseTacticalEditorWallPortalsOptions) => {
  const selectedPortalWall = (draft.drawnWalls ?? [])
    .find((wall) => (wall.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalCircle = (draft.drawnTerrainPrimitives ?? [])
    .find((circle) => (circle.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalArea = (draft.drawnAreas ?? [])
    .find((area) => (area.portals ?? []).some((portal) => portal.id === selectedPortalId)) ?? null;
  const selectedPortalOwner = selectedPortalWall ?? selectedPortalCircle ?? selectedPortalArea;
  const selectedPortal = selectedPortalOwner?.portals
    ?.find((portal) => portal.id === selectedPortalId) ?? null;

  const placeWallPortal = (point: { x: number; y: number }) => {
    const kind = wallPortalKindForTool(activeDrawingTool);
    if (!kind) return false;
    const placement = tacticalEditorPortalPlacementCandidate(draft, point, kind);
    if (!placement) {
      setPlacementError("Move closer to a drawn wall to place the portal.");
      return false;
    }
    if (!placement.available) {
      setPlacementError("That wall has no open one-square portal position near this point.");
      return false;
    }
    const prefix = kind === "iris-valve" ? "wall-iris-valve" : "wall-door";
    const existingIds = new Set([
      ...(draft.drawnWalls ?? []).flatMap((wall) => (wall.portals ?? []).map((portal) => portal.id)),
      ...(draft.drawnAreas ?? []).flatMap((area) => (area.portals ?? []).map((portal) => portal.id)),
      ...(draft.drawnTerrainPrimitives ?? []).flatMap((circle) => (circle.portals ?? []).map((portal) => portal.id)),
    ]);
    let suffix = 1;
    let id = `${prefix}-${suffix}`;
    while (existingIds.has(id)) {
      suffix += 1;
      id = `${prefix}-${suffix}`;
    }
    const circleOwner = (draft.drawnTerrainPrimitives ?? [])
      .some((circle) => circle.id === placement.wallId);
    const areaOwner = (draft.drawnAreas ?? [])
      .some((area) => area.id === placement.wallId);
    const candidate: TacticalScenarioDefinitionFile = circleOwner
      ? {
        ...draft,
        drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? []).map((circle) => (
          circle.id === placement.wallId
            ? { ...circle, portals: [...(circle.portals ?? []), { id, kind, position: placement.position }] }
            : circle
        )),
      }
      : areaOwner
        ? {
          ...draft,
          drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === placement.wallId
            ? { ...area, portals: [...(area.portals ?? []), { id, kind, position: placement.position }] }
            : area),
        }
        : {
          ...draft,
          drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === placement.wallId
            ? { ...wall, portals: [...(wall.portals ?? []), { id, kind, position: placement.position }] }
            : wall),
        };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPlacementId(null);
      setSelectedEnemyId(null);
      setSelectedWallId(null);
      setSelectedPrimitiveId(null);
      setSelectedPortalId(id);
      setSelectedFire(null);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
      return false;
    }
  };

  const beginWallPortalDrag = (portalId: string) => {
    const wall = (draft.drawnWalls ?? [])
      .find((candidate) => (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const circle = (draft.drawnTerrainPrimitives ?? [])
      .find((candidate) => (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const area = (draft.drawnAreas ?? [])
      .find((candidate) => (candidate.portals ?? []).some((portal) => portal.id === portalId));
    const owner = wall ?? circle ?? area;
    const portal = owner?.portals?.find((candidate) => candidate.id === portalId);
    if (!owner || !portal) return;
    setSelectedWallId(null);
    setSelectedAreaId(null);
    setSelectedPrimitiveId(null);
    setSelectedPortalId(portalId);
    setDragWallPortal({
      ownerKind: wall ? "wall" : circle ? "circle" : "area",
      ownerId: owner.id,
      portalId,
      originalPosition: portal.position,
    });
    setPlacementError(null);
  };

  const moveWallPortal = (point: { x: number; y: number }) => {
    if (!dragWallPortal) return;
    const placement = dragWallPortal.ownerKind === "wall"
      ? tacticalWallPortalRepositionCandidate(
        draft.drawnWalls ?? [],
        dragWallPortal.ownerId,
        dragWallPortal.portalId,
        point,
      )
      : dragWallPortal.ownerKind === "circle"
        ? tacticalCirclePortalRepositionCandidate(
          draft.drawnTerrainPrimitives ?? [],
          dragWallPortal.ownerId,
          dragWallPortal.portalId,
          point,
        )
        : tacticalAreaBoundaryPortalRepositionCandidate(
          draft.drawnAreas ?? [],
          dragWallPortal.ownerId,
          dragWallPortal.portalId,
          point,
        );
    if (!placement || !placement.available) {
      setPlacementError("Keep the portal on an open one-square position on its wall.");
      return;
    }
    const owner = dragWallPortal.ownerKind === "wall"
      ? (draft.drawnWalls ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId)
      : dragWallPortal.ownerKind === "circle"
        ? (draft.drawnTerrainPrimitives ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId)
        : (draft.drawnAreas ?? []).find((candidate) => candidate.id === dragWallPortal.ownerId);
    const portal = owner?.portals?.find((candidate) => candidate.id === dragWallPortal.portalId);
    if (!portal || Math.abs(portal.position - placement.position) < 1e-9) {
      setPlacementError(null);
      return;
    }
    const candidate: TacticalScenarioDefinitionFile = {
      ...draft,
      ...(dragWallPortal.ownerKind === "wall"
        ? {
          drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === dragWallPortal.ownerId
            ? {
              ...wall,
              portals: (wall.portals ?? []).map((item) => item.id === dragWallPortal.portalId
                ? { ...item, position: placement.position }
                : item),
            }
            : wall),
        }
        : dragWallPortal.ownerKind === "circle"
          ? {
            drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? []).map((circle) => (
              circle.id === dragWallPortal.ownerId
                ? {
                  ...circle,
                  portals: (circle.portals ?? []).map((item) => item.id === dragWallPortal.portalId
                    ? { ...item, position: placement.position }
                    : item),
                }
                : circle
            )),
          }
          : {
            drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === dragWallPortal.ownerId
              ? {
                ...area,
                portals: (area.portals ?? []).map((item) => item.id === dragWallPortal.portalId
                  ? { ...item, position: placement.position }
                  : item),
              }
              : area),
          }),
    };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setPlacementError(null);
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal position is not valid.");
    }
  };

  const finishWallPortalDrag = () => setDragWallPortal(null);

  const cancelWallPortalDrag = () => {
    if (!dragWallPortal) return;
    const { ownerKind, ownerId, portalId, originalPosition } = dragWallPortal;
    setDraft((current) => ({
      ...current,
      ...(ownerKind === "wall"
        ? {
          drawnWalls: (current.drawnWalls ?? []).map((wall) => wall.id === ownerId
            ? {
              ...wall,
              portals: (wall.portals ?? []).map((portal) => portal.id === portalId
                ? { ...portal, position: originalPosition }
                : portal),
            }
            : wall),
        }
        : ownerKind === "circle"
          ? {
            drawnTerrainPrimitives: (current.drawnTerrainPrimitives ?? []).map((circle) => (
              circle.id === ownerId
                ? {
                  ...circle,
                  portals: (circle.portals ?? []).map((portal) => portal.id === portalId
                    ? { ...portal, position: originalPosition }
                    : portal),
                }
                : circle
            )),
          }
          : {
            drawnAreas: (current.drawnAreas ?? []).map((area) => area.id === ownerId
              ? {
                ...area,
                portals: (area.portals ?? []).map((portal) => portal.id === portalId
                  ? { ...portal, position: originalPosition }
                  : portal),
              }
              : area),
          }),
    }));
    setDragWallPortal(null);
    setPlacementError(null);
  };

  const deleteSelectedPortal = () => {
    if (!selectedPortal || !selectedPortalOwner) return false;
    const candidate: TacticalScenarioDefinitionFile = selectedPortalWall
      ? {
        ...draft,
        drawnWalls: (draft.drawnWalls ?? []).map((wall) => wall.id === selectedPortalWall.id
          ? { ...wall, portals: (wall.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
          : wall),
      }
      : selectedPortalCircle
        ? {
          ...draft,
          drawnTerrainPrimitives: (draft.drawnTerrainPrimitives ?? []).map((circle) => (
            circle.id === selectedPortalCircle.id
              ? { ...circle, portals: (circle.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
              : circle
          )),
        }
        : {
          ...draft,
          drawnAreas: (draft.drawnAreas ?? []).map((area) => area.id === selectedPortalArea?.id
            ? { ...area, portals: (area.portals ?? []).filter((portal) => portal.id !== selectedPortal.id) }
            : area),
        };
    try {
      resolveTacticalScenarioTerrain(candidate);
      setDraft(candidate);
      setSelectedPortalId(null);
      setDragWallPortal(null);
      setPlacementError(null);
      return true;
    } catch (error) {
      setPlacementError(error instanceof Error ? error.message : "That portal cannot be deleted.");
      return false;
    }
  };

  return {
    selectedPortal,
    placeWallPortal,
    beginWallPortalDrag,
    moveWallPortal,
    finishWallPortalDrag,
    cancelWallPortalDrag,
    deleteSelectedPortal,
  };
};
