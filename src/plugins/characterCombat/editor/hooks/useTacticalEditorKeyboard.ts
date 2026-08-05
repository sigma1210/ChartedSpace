import { useEffect } from "react";

type TacticalEditorPrimaryTool = "select" | "node" | "hand";
type TacticalEditorDeletionKey = "Delete" | "Backspace";

export interface TacticalEditorKeyboardOptions {
  onDeleteSelection: (key: TacticalEditorDeletionKey) => boolean;
  areaDraftActive: boolean;
  onCloseArea: () => void;
  onUndoAreaNode: () => void;
  onCancelArea: () => void;
  rampDraftActive: boolean;
  onCancelRamp: () => void;
  circleDraftActive: boolean;
  onCancelCircle: () => void;
  onActivatePrimaryTool: (tool: TacticalEditorPrimaryTool) => void;
  canRotatePlacement: boolean;
  onRotatePlacement: () => void;
}

const isTacticalEditorTextInput = (target: EventTarget | null) => target instanceof HTMLElement
  && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export const useTacticalEditorKeyboard = ({
  onDeleteSelection,
  areaDraftActive,
  onCloseArea,
  onUndoAreaNode,
  onCancelArea,
  rampDraftActive,
  onCancelRamp,
  circleDraftActive,
  onCancelCircle,
  onActivatePrimaryTool,
  canRotatePlacement,
  onRotatePlacement,
}: TacticalEditorKeyboardOptions) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const textInput = isTacticalEditorTextInput(event.target);

      if (!textInput && (event.key === "Delete" || event.key === "Backspace")) {
        if (onDeleteSelection(event.key)) event.preventDefault();
      }

      if (areaDraftActive) {
        if (event.key === "Enter") {
          onCloseArea();
          event.preventDefault();
        } else if (event.key === "Backspace") {
          onUndoAreaNode();
          event.preventDefault();
        } else if (event.key === "Escape") {
          onCancelArea();
          event.preventDefault();
        }
      }

      if (rampDraftActive && event.key === "Escape") {
        onCancelRamp();
        event.preventDefault();
      }

      if (circleDraftActive && event.key === "Escape") {
        onCancelCircle();
        event.preventDefault();
      }

      if (textInput) return;
      const key = event.key.toLowerCase();
      if (key === "v") onActivatePrimaryTool("select");
      else if (key === "n") onActivatePrimaryTool("node");
      else if (key === "h") onActivatePrimaryTool("hand");
      else if (key === "r" && canRotatePlacement) onRotatePlacement();
      else return;
      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    areaDraftActive,
    canRotatePlacement,
    circleDraftActive,
    onActivatePrimaryTool,
    onCancelArea,
    onCancelCircle,
    onCancelRamp,
    onCloseArea,
    onDeleteSelection,
    onRotatePlacement,
    onUndoAreaNode,
    rampDraftActive,
  ]);
};
