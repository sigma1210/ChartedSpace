"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import TacticalEditorFileMenu from "@/plugins/characterCombat/editor/components/TacticalEditorFileMenu";
import TacticalEditorHeader from "@/plugins/characterCombat/editor/components/TacticalEditorHeader";
import TacticalEditorNewScenarioDialog from "@/plugins/characterCombat/editor/components/TacticalEditorNewScenarioDialog";
import TacticalEditorOpenScenarioDialog from "@/plugins/characterCombat/editor/components/TacticalEditorOpenScenarioDialog";
import TacticalEditorSaveAsDialog from "@/plugins/characterCombat/editor/components/TacticalEditorSaveAsDialog";
import TacticalEditorScenarioMenu from "@/plugins/characterCombat/editor/components/TacticalEditorScenarioMenu";
import TacticalEditorScenarioPropertiesDialog from "@/plugins/characterCombat/editor/components/TacticalEditorScenarioPropertiesDialog";
import TacticalEditorViewMenu from "@/plugins/characterCombat/editor/components/TacticalEditorViewMenu";

export type TacticalEditorDocumentControlsProps = {
  header: Omit<ComponentProps<typeof TacticalEditorHeader>, "children">;
  fileMenu: ComponentProps<typeof TacticalEditorFileMenu>;
  scenarioMenu: ComponentProps<typeof TacticalEditorScenarioMenu>;
  viewMenu: ComponentProps<typeof TacticalEditorViewMenu>;
  openScenarioDialog: ComponentProps<typeof TacticalEditorOpenScenarioDialog>;
  scenarioPropertiesDialog: ComponentProps<typeof TacticalEditorScenarioPropertiesDialog>;
  newScenarioDialog: ComponentProps<typeof TacticalEditorNewScenarioDialog>;
  saveAsDialog: ComponentProps<typeof TacticalEditorSaveAsDialog>;
};

const TacticalEditorDocumentControls = ({
  header,
  fileMenu,
  scenarioMenu,
  viewMenu,
  openScenarioDialog,
  scenarioPropertiesDialog,
  newScenarioDialog,
  saveAsDialog,
}: TacticalEditorDocumentControlsProps) => {
  const menuBarRef = useRef<HTMLDivElement | null>(null);
  const headerMenuOpen = fileMenu.open || scenarioMenu.open || viewMenu.open;
  const closeHeaderMenu = fileMenu.onClose;

  useEffect(() => {
    if (!headerMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuBarRef.current?.contains(event.target as Node)) return;
      closeHeaderMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeHeaderMenu();
      event.preventDefault();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHeaderMenu, headerMenuOpen]);

  return <>
    <TacticalEditorHeader {...header}>
      <div ref={menuBarRef} className="contents">
        <TacticalEditorFileMenu {...fileMenu} />
        <TacticalEditorScenarioMenu {...scenarioMenu} />
        <TacticalEditorViewMenu {...viewMenu} />
      </div>
    </TacticalEditorHeader>
    <TacticalEditorOpenScenarioDialog {...openScenarioDialog} />
    <TacticalEditorScenarioPropertiesDialog {...scenarioPropertiesDialog} />
    <TacticalEditorNewScenarioDialog {...newScenarioDialog} />
    <TacticalEditorSaveAsDialog {...saveAsDialog} />
  </>;
};

export default TacticalEditorDocumentControls;
