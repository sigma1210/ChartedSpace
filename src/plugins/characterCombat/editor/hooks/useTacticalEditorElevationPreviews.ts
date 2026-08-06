"use client";

import { useMemo } from "react";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import {
  tacticalElevationEdgeCandidates,
  tacticalLadderMountForEdge,
  tacticalNearestElevationEdgeCandidate,
  tacticalRampPlacementPreview,
} from "@/plugins/characterCombat/tacticalElevationTransitions";
import type {
  EditorMapPoint,
  RampDraft,
} from "@/plugins/characterCombat/editor/lib/tacticalEditorInteractionState";
import { elevationTransitionKindForTool } from "@/plugins/characterCombat/editor/lib/tacticalEditorSupport";

export const useTacticalEditorElevationPreviews = ({
  definition,
  placementKind,
  placementHover,
  rampDraft,
}: {
  definition: TacticalScenarioDefinitionFile;
  placementKind: string | null;
  placementHover: EditorMapPoint | null;
  rampDraft: RampDraft | null;
}) => {
  const elevationTransitionKind = elevationTransitionKindForTool(placementKind);
  const elevationEdgeCandidates = useMemo(() => {
    if (!elevationTransitionKind) return [];
    try {
      return tacticalElevationEdgeCandidates(definition);
    } catch {
      return [];
    }
  }, [definition, elevationTransitionKind]);
  const nearestElevationEdgePreview = placementHover
    ? tacticalNearestElevationEdgeCandidate(elevationEdgeCandidates, placementHover)
    : null;
  const elevationEdgePreview = rampDraft?.edge ?? nearestElevationEdgePreview;
  const rampPreview = rampDraft && placementHover
    ? tacticalRampPlacementPreview(definition, rampDraft.edge, placementHover)
    : null;
  const ladderMountPreview = elevationTransitionKind === "ladder" && elevationEdgePreview
    ? tacticalLadderMountForEdge(definition, elevationEdgePreview)
    : null;

  return {
    elevationTransitionKind,
    elevationEdgeCandidates,
    elevationEdgePreview,
    ladderMountPreview,
    rampPreview,
  };
};
