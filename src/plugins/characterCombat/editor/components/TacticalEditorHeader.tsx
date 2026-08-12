"use client";

import type { ReactNode } from "react";
import EditorHeader from "@/components/editor/EditorHeader";
import type {
  TacticalEditorFileMessage,
  TacticalEditorScenarioSummary,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";
import type { TacticalEditorIssue } from "@/plugins/characterCombat/editor/lib/tacticalEditorValidation";
import TacticalEditorIssuesMenu from "@/plugins/characterCombat/editor/components/TacticalEditorIssuesMenu";

type TacticalEditorHeaderProps = {
  currentScenario: TacticalEditorScenarioSummary;
  fileMessage: TacticalEditorFileMessage;
  fileDialogOpen: boolean;
  issues: TacticalEditorIssue[];
  dirty: boolean;
  children: ReactNode;
};

const TacticalEditorHeader = ({
  currentScenario,
  fileMessage,
  fileDialogOpen,
  issues,
  dirty,
  children,
}: TacticalEditorHeaderProps) => <EditorHeader
  title="Scenario Editor"
  detail={`${currentScenario.title} · ${currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft`}
  message={fileMessage}
  dialogOpen={fileDialogOpen}
  dirty={dirty}
  menuLabel="Scenario editor menu bar"
  menus={children}
  actions={<TacticalEditorIssuesMenu issues={issues} />}
/>;

export default TacticalEditorHeader;
