"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type {
  TacticalScenarioDefinitionFile,
  TacticalScenarioTracingTemplate,
} from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TracingTemplateCorner,
  TracingTemplateTransformDrag,
} from "@/plugins/characterCombat/editor/tacticalEditorInteractionState";
import { uploadTacticalTemplate } from "@/plugins/characterCombat/editor/tacticalEditorApi";
import {
  selectTacticalEditorDocument,
  selectTacticalEditorTemplates,
} from "@/plugins/characterCombat/editor/state/selectors";
import {
  editorDraftChanged,
  editorTemplateOperationFailed,
  editorTemplateOperationStarted,
  editorTemplateOperationSucceeded,
  editorTemplateUploadSucceeded,
} from "@/plugins/characterCombat/editor/state/tacticalEditorSlice";
import {
  fitTacticalTracingTemplate,
  loadImageDimensions,
  resizeTacticalTracingTemplate,
  tracingTemplateCenter,
} from "@/plugins/characterCombat/editor/tacticalEditorSupport";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";

type TacticalEditorTracingTemplateOptions = {
  dragTracingTemplate: TracingTemplateTransformDrag | null;
  setDragTracingTemplate: Dispatch<SetStateAction<TracingTemplateTransformDrag | null>>;
  tracingTemplateEditing: boolean;
  setTracingTemplateEditing: Dispatch<SetStateAction<boolean>>;
  setPlacementError: Dispatch<SetStateAction<string | null>>;
  clearDrawingTool: () => void;
  clearEnemyTool: () => void;
  clearWallDraft: () => void;
  clearPlacementHover: () => void;
  clearEnemyHover: () => void;
};

type TacticalEditorDraftUpdate = TacticalScenarioDefinitionFile
  | ((current: TacticalScenarioDefinitionFile) => TacticalScenarioDefinitionFile);

export const useTacticalEditorTracingTemplate = ({
  dragTracingTemplate,
  setDragTracingTemplate,
  tracingTemplateEditing,
  setTracingTemplateEditing,
  setPlacementError,
  clearDrawingTool,
  clearEnemyTool,
  clearWallDraft,
  clearPlacementHover,
  clearEnemyHover,
}: TacticalEditorTracingTemplateOptions) => {
  const dispatch = useAppDispatch();
  const editorStore = useAppStore();
  const { draft } = useAppSelector(selectTacticalEditorDocument);
  const templateBusy = useAppSelector(selectTacticalEditorTemplates).operation !== "idle";
  const setDraft = useCallback((update: TacticalEditorDraftUpdate) => {
    const current = editorStore.getState().tacticalEditor.document.draft;
    dispatch(editorDraftChanged(typeof update === "function" ? update(current) : update));
  }, [dispatch, editorStore]);

  const applyTracingTemplateImage = async (imagePath: string) => {
    const naturalSize = await loadImageDimensions(imagePath);
    setDraft((current) => ({
      ...current,
      tracingTemplate: fitTacticalTracingTemplate(imagePath, naturalSize, current.map),
    }));
  };

  const selectTracingTemplate = async (imagePath: string) => {
    if (!imagePath || templateBusy) return;
    dispatch(editorTemplateOperationStarted("applying"));
    try {
      await applyTracingTemplateImage(imagePath);
      dispatch(editorTemplateOperationSucceeded("Tracing template fitted to the map."));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(
        error instanceof Error ? error.message : "Could not load the tracing template.",
      ));
    }
  };

  const uploadTracingTemplate = async (file: File) => {
    if (templateBusy) return;
    dispatch(editorTemplateOperationStarted("uploading"));
    try {
      const template = await uploadTacticalTemplate(file);
      await applyTracingTemplateImage(template.imagePath);
      dispatch(editorTemplateUploadSucceeded({
        asset: template,
        message: `${template.label} uploaded and fitted to the map.`,
      }));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(
        error instanceof Error ? error.message : "Could not upload the tracing template.",
      ));
    }
  };

  const updateTracingTemplate = (update: Partial<TacticalScenarioTracingTemplate>) => {
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...current.tracingTemplate, ...update } }
      : current);
  };

  const toggleTracingTemplateEditing = () => {
    setTracingTemplateEditing(!tracingTemplateEditing);
    clearDrawingTool();
    clearEnemyTool();
    clearWallDraft();
    clearPlacementHover();
    clearEnemyHover();
  };

  const updateTracingTemplateFromHud = (
    update: Partial<TacticalScenarioTracingTemplate>,
  ) => {
    updateTracingTemplate(update);
    if (update.visible === false) setTracingTemplateEditing(false);
  };

  const removeTracingTemplate = () => {
    setDraft((current) => ({ ...current, tracingTemplate: undefined }));
    setTracingTemplateEditing(false);
  };

  const updateTracingTemplateNumber = (
    field: "x" | "y" | "width" | "height" | "rotation",
    value: number,
  ) => {
    if (
      !Number.isFinite(value)
      || ((field === "width" || field === "height") && value <= 0)
    ) return;
    setDraft((current) => {
      const template = current.tracingTemplate;
      if (!template) return current;
      let tracingTemplate = { ...template, [field]: value };
      if (template.lockAspectRatio && field === "width") {
        tracingTemplate = {
          ...tracingTemplate,
          height: template.height * value / template.width,
        };
      }
      if (template.lockAspectRatio && field === "height") {
        tracingTemplate = {
          ...tracingTemplate,
          width: template.width * value / template.height,
        };
      }
      return { ...current, tracingTemplate };
    });
  };

  const resetTracingTemplateFit = async () => {
    if (!draft.tracingTemplate || templateBusy) return;
    dispatch(editorTemplateOperationStarted("applying"));
    try {
      await applyTracingTemplateImage(draft.tracingTemplate.imagePath);
      dispatch(editorTemplateOperationSucceeded("Tracing template reset and fitted to the map."));
    } catch (error) {
      dispatch(editorTemplateOperationFailed(
        error instanceof Error ? error.message : "Could not reset the tracing template.",
      ));
    }
  };

  const beginTracingTemplateDrag = (
    kind: "move" | "rotate" | TracingTemplateCorner,
    point: { x: number; y: number },
  ) => {
    const template = draft.tracingTemplate;
    if (!template) return;
    if (kind === "move") {
      setDragTracingTemplate({ kind, start: point, original: { ...template } });
    } else if (kind === "rotate") {
      const center = tracingTemplateCenter(template);
      setDragTracingTemplate({
        kind,
        center,
        startAngle: Math.atan2(point.y - center.y, point.x - center.x),
        original: { ...template },
      });
    } else {
      setDragTracingTemplate({ kind: "resize", corner: kind, original: { ...template } });
    }
    setPlacementError(null);
  };

  const transformTracingTemplate = (point: { x: number; y: number }) => {
    if (!dragTracingTemplate) return;
    let tracingTemplate: TacticalScenarioTracingTemplate;
    if (dragTracingTemplate.kind === "move") {
      tracingTemplate = {
        ...dragTracingTemplate.original,
        x: dragTracingTemplate.original.x + point.x - dragTracingTemplate.start.x,
        y: dragTracingTemplate.original.y + point.y - dragTracingTemplate.start.y,
      };
    } else if (dragTracingTemplate.kind === "resize") {
      tracingTemplate = resizeTacticalTracingTemplate(
        dragTracingTemplate.original,
        dragTracingTemplate.corner,
        point,
      );
    } else {
      const angle = Math.atan2(
        point.y - dragTracingTemplate.center.y,
        point.x - dragTracingTemplate.center.x,
      );
      const rotation = dragTracingTemplate.original.rotation
        + (angle - dragTracingTemplate.startAngle) * 180 / Math.PI;
      tracingTemplate = {
        ...dragTracingTemplate.original,
        rotation: ((rotation + 180) % 360 + 360) % 360 - 180,
      };
    }
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate }
      : current);
  };

  const finishTracingTemplateDrag = () => setDragTracingTemplate(null);

  const cancelTracingTemplateDrag = () => {
    if (!dragTracingTemplate) return;
    setDraft((current) => current.tracingTemplate
      ? { ...current, tracingTemplate: { ...dragTracingTemplate.original } }
      : current);
    setDragTracingTemplate(null);
  };

  return {
    selectTracingTemplate,
    uploadTracingTemplate,
    updateTracingTemplate,
    toggleTracingTemplateEditing,
    updateTracingTemplateFromHud,
    removeTracingTemplate,
    updateTracingTemplateNumber,
    resetTracingTemplateFit,
    beginTracingTemplateDrag,
    transformTracingTemplate,
    finishTracingTemplateDrag,
    cancelTracingTemplateDrag,
  };
};
