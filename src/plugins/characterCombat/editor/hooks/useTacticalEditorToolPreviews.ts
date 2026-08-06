"use client";

import {
  resolveTacticalScenarioTerrain,
  tacticalTerrainPalette,
  type TacticalNaturalTerrainPlacement,
  type TacticalScenarioDefinitionFile,
  type TacticalTerrainPlacement,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { tacticalNaturalTerrainFootprintCells } from "@/plugins/characterCombat/tacticalNaturalTerrain";
import type { GridPoint } from "@/plugins/characterCombat/types";
import type { TacticalEditorPlacementPreview } from "@/plugins/characterCombat/editor/components/TacticalEditorPlacementPreviewLayer";
import type { TacticalEditorPortalPreview } from "@/plugins/characterCombat/editor/components/TacticalEditorDrawingPreviewLayer";
import type { EditorMapPoint } from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import {
  FIRE_TOOL_ID,
  cellKey,
  defaultNaturalTerrainRadius,
  gridPoint,
  naturalTerrainKindForTool,
  placementCandidates,
  tacticalEditorPortalPlacementCandidate,
  wallPortalKindForTool,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export const useTacticalEditorToolPreviews = ({
  definition,
  placementKind,
  placementHover,
  portalHover,
}: {
  definition: TacticalScenarioDefinitionFile;
  placementKind: string | null;
  placementHover: EditorMapPoint | null;
  portalHover: GridPoint | null;
}) => {
  const placementPreview: TacticalEditorPlacementPreview | null = (() => {
    if (!placementKind || !placementHover) return null;
    if (placementKind === FIRE_TOOL_ID) {
      const valid = placementHover.x >= 0
        && placementHover.y >= 0
        && placementHover.x < definition.map.width
        && placementHover.y < definition.map.height
        && !definition.fireCells.some((cell) => cellKey(cell) === cellKey(placementHover));
      return { kind: "fire", origin: placementHover, cells: [{ x: 0, y: 0 }], valid };
    }
    const naturalKind = naturalTerrainKindForTool(placementKind);
    if (naturalKind) {
      const placement: TacticalNaturalTerrainPlacement = {
        id: "__natural-terrain-preview__",
        kind: naturalKind,
        position: gridPoint(placementHover),
        radius: defaultNaturalTerrainRadius(naturalKind),
      };
      const cells = tacticalNaturalTerrainFootprintCells(
        placement,
        definition.map.width,
        definition.map.height,
      );
      try {
        resolveTacticalScenarioTerrain({
          ...definition,
          naturalTerrainPlacements: [...(definition.naturalTerrainPlacements ?? []), placement],
        });
        if (placement.kind === "tree" && (definition.enemyPlacements ?? [])
          .some((enemy) => cellKey(enemy.position) === cellKey(placement.position))) {
          throw new Error("A tree cannot overlap an enemy.");
        }
        return { kind: "natural", placement, cells, valid: true };
      } catch {
        return { kind: "natural", placement, cells, valid: false };
      }
    }
    const paletteItem = tacticalTerrainPalette.find((item) => item.id === placementKind);
    if (!paletteItem) return null;
    for (const candidate of placementCandidates(placementKind, placementHover)) {
      const previewPlacement: TacticalTerrainPlacement = {
        id: "terrain-placement-preview",
        terrainDefinitionId: placementKind,
        origin: candidate.origin,
        rotation: candidate.rotation,
      };
      try {
        resolveTacticalScenarioTerrain({
          ...definition,
          terrainPlacements: [...definition.terrainPlacements, previewPlacement],
        });
        return { kind: "terrain", origin: candidate.origin, cells: candidate.cells, valid: true };
      } catch {
        // Try the next bridge orientation.
      }
    }
    return { kind: "terrain", origin: placementHover, cells: paletteItem.previewCells, valid: false };
  })();

  const portalPreview: TacticalEditorPortalPreview | null = (() => {
    const portalKind = wallPortalKindForTool(placementKind);
    if (!portalKind || !portalHover) return null;
    const candidate = tacticalEditorPortalPlacementCandidate(definition, portalHover, portalKind);
    if (!candidate || !candidate.available) return candidate ? { ...candidate, valid: false } : null;
    const previewId = "__wall-portal-preview__";
    const circleOwner = (definition.drawnTerrainPrimitives ?? [])
      .some((primitive) => primitive.id === candidate.wallId);
    const areaOwner = (definition.drawnAreas ?? [])
      .some((area) => area.id === candidate.wallId);
    const previewDefinition: TacticalScenarioDefinitionFile = {
      ...definition,
      ...(circleOwner
        ? {
          drawnTerrainPrimitives: (definition.drawnTerrainPrimitives ?? [])
            .map((primitive) => primitive.id === candidate.wallId
              ? { ...primitive, portals: [...(primitive.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
              : primitive),
        }
        : areaOwner
          ? {
            drawnAreas: (definition.drawnAreas ?? []).map((area) => area.id === candidate.wallId
              ? { ...area, portals: [...(area.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
              : area),
          }
          : {
            drawnWalls: (definition.drawnWalls ?? []).map((wall) => wall.id === candidate.wallId
              ? { ...wall, portals: [...(wall.portals ?? []), { id: previewId, kind: portalKind, position: candidate.position }] }
              : wall),
          }),
    };
    try {
      resolveTacticalScenarioTerrain(previewDefinition);
      return { ...candidate, valid: true };
    } catch {
      return { ...candidate, valid: false };
    }
  })();

  return { placementPreview, portalPreview };
};
