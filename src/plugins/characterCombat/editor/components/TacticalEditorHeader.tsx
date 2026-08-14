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
  saveBlockedReason: string | null;
  dirty: boolean;
  children: ReactNode;
};

const TacticalEditorHeader = ({
  currentScenario,
  fileMessage,
  fileDialogOpen,
  issues,
  saveBlockedReason,
  dirty,
  children,
}: TacticalEditorHeaderProps) => <>
  <EditorHeader
    title="Scenario Editor"
    detail={`${currentScenario.title} · ${currentScenario.isDefault ? "immutable source" : "saved scenario"} · editable draft`}
    message={fileMessage}
    dialogOpen={fileDialogOpen}
    dirty={dirty}
    menuLabel="Scenario editor menu bar"
    menus={children}
    actions={<TacticalEditorIssuesMenu issues={issues} />}
  />
  {saveBlockedReason && <div role="alert" className="shrink-0 border-b border-red-700 bg-red-950/80 px-4 py-2 font-mono text-[10px] text-red-100">
    <span className="font-bold uppercase tracking-wider">Cannot save this scenario:</span>{" "}{saveBlockedReason}
  </div>}
</>;

export default TacticalEditorHeader;
