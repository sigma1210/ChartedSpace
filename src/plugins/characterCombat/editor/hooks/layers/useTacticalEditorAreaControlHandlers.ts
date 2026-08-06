"use client";

import { useCallback } from "react";
import type { TacticalEditorDraftPreviewProps } from "@/plugins/characterCombat/editor/lib/tacticalEditorDraftPreviewProps";

type AreaControlProps = Pick<TacticalEditorDraftPreviewProps, "beginRaisedAreaControlDrag">;

export const useTacticalEditorAreaControlHandlers = ({
  beginRaisedAreaControlDrag,
}: AreaControlProps) => {
  const handleBeginDrawnAreaControlDrag = useCallback((id: string, segmentIndex: number) => {
    beginRaisedAreaControlDrag({ kind: "area", id }, segmentIndex);
  }, [beginRaisedAreaControlDrag]);

  const handleBeginRaisedAreaControlDrag = useCallback((id: string, segmentIndex: number) => {
    beginRaisedAreaControlDrag({ kind: "raised", id }, segmentIndex);
  }, [beginRaisedAreaControlDrag]);

  const handleBeginTerrainRegionControlDrag = useCallback((id: string, segmentIndex: number) => {
    beginRaisedAreaControlDrag({ kind: "terrain-region", id }, segmentIndex);
  }, [beginRaisedAreaControlDrag]);

  const handleBeginDraftControlDrag = useCallback((segmentIndex: number) => {
    beginRaisedAreaControlDrag({ kind: "draft" }, segmentIndex);
  }, [beginRaisedAreaControlDrag]);

  return {
    handleBeginDrawnAreaControlDrag,
    handleBeginRaisedAreaControlDrag,
    handleBeginTerrainRegionControlDrag,
    handleBeginDraftControlDrag,
  };
};
