"use client";

import type { ComponentProps } from "react";
import TacticalEditorFileMenu from "@/plugins/characterCombat/editor/components/TacticalEditorFileMenu";
import TacticalEditorHeader from "@/plugins/characterCombat/editor/components/TacticalEditorHeader";
import TacticalEditorNewScenarioDialog from "@/plugins/characterCombat/editor/components/TacticalEditorNewScenarioDialog";
import TacticalEditorOpenScenarioDialog from "@/plugins/characterCombat/editor/components/TacticalEditorOpenScenarioDialog";
import TacticalEditorSaveAsDialog from "@/plugins/characterCombat/editor/components/TacticalEditorSaveAsDialog";
import TacticalEditorScenarioMenu from "@/plugins/characterCombat/editor/components/TacticalEditorScenarioMenu";
import TacticalEditorScenarioPropertiesDialog from "@/plugins/characterCombat/editor/components/TacticalEditorScenarioPropertiesDialog";

export type TacticalEditorDocumentControlsProps = {
  header: Omit<ComponentProps<typeof TacticalEditorHeader>, "children">;
  fileMenu: ComponentProps<typeof TacticalEditorFileMenu>;
  scenarioMenu: ComponentProps<typeof TacticalEditorScenarioMenu>;
  openScenarioDialog: ComponentProps<typeof TacticalEditorOpenScenarioDialog>;
  scenarioPropertiesDialog: ComponentProps<typeof TacticalEditorScenarioPropertiesDialog>;
  newScenarioDialog: ComponentProps<typeof TacticalEditorNewScenarioDialog>;
  saveAsDialog: ComponentProps<typeof TacticalEditorSaveAsDialog>;
};

const TacticalEditorDocumentControls = ({
  header,
  fileMenu,
  scenarioMenu,
  openScenarioDialog,
  scenarioPropertiesDialog,
  newScenarioDialog,
  saveAsDialog,
}: TacticalEditorDocumentControlsProps) => <>
  <TacticalEditorHeader {...header}>
    <TacticalEditorFileMenu {...fileMenu} />
    <TacticalEditorScenarioMenu {...scenarioMenu} />
  </TacticalEditorHeader>
  <TacticalEditorOpenScenarioDialog {...openScenarioDialog} />
  <TacticalEditorScenarioPropertiesDialog {...scenarioPropertiesDialog} />
  <TacticalEditorNewScenarioDialog {...newScenarioDialog} />
  <TacticalEditorSaveAsDialog {...saveAsDialog} />
</>;

export default TacticalEditorDocumentControls;
