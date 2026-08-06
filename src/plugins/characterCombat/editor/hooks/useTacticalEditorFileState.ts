import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectTacticalEditorFileState } from "@/plugins/characterCombat/editor/redux/selectors";
import {
  editorFileDialogClosed,
  editorFileMessageChanged,
  editorHeaderMenuClosed,
  editorHeaderMenuToggled,
  editorNewScenarioDialogOpened,
  editorOpenScenarioDialogOpened,
  editorOpenScenarioSearchChanged,
  editorOpenScenarioSelected,
  editorSaveAsDialogOpened,
  editorScenarioNameChanged,
  editorScenarioPropertiesChanged,
  editorScenarioPropertiesDialogOpened,
  editorScenarioPropertiesRejected,
  type TacticalEditorFileMessage,
  type TacticalEditorScenarioPropertiesDraft,
} from "@/plugins/characterCombat/editor/redux/tacticalEditorSlice";

export const useTacticalEditorFileState = () => {
  const dispatch = useAppDispatch();
  const file = useAppSelector(selectTacticalEditorFileState);
  const currentScenario = file.currentScenario;
  const availableScenarios = file.scenarioIndex.items;
  const scenarioListBusy = file.scenarioIndex.status === "loading";
  const fileBusy = file.operation !== "idle";
  const fileMessage = file.message;
  const openHeaderMenu = file.openHeaderMenu;
  const fileDialog = file.dialog;
  const openScenarioDialog = fileDialog.kind === "open";
  const scenarioPropertiesDraft = fileDialog.kind === "properties" ? fileDialog.draft : null;
  const scenarioPropertiesError = fileDialog.kind === "properties" ? fileDialog.error : null;
  const newScenarioDialogOpen = fileDialog.kind === "new";
  const newScenarioName = fileDialog.kind === "new" ? fileDialog.name : "";
  const saveAsDialogOpen = fileDialog.kind === "save-as";
  const saveAsName = fileDialog.kind === "save-as" ? fileDialog.name : "";
  const scenarioSearchQuery = fileDialog.kind === "open" ? fileDialog.searchQuery : "";
  const scenarioToLoad = fileDialog.kind === "open" ? fileDialog.selectedScenarioId : "";
  const normalizedScenarioSearch = scenarioSearchQuery.trim().toLowerCase();
  const filteredScenarios = normalizedScenarioSearch
    ? availableScenarios.filter((scenario) => (
      scenario.title.toLowerCase().includes(normalizedScenarioSearch)
      || scenario.id.toLowerCase().includes(normalizedScenarioSearch)
    ))
    : availableScenarios;

  return {
    currentScenario,
    availableScenarios,
    scenarioListBusy,
    fileBusy,
    fileMessage,
    openHeaderMenu,
    openScenarioDialog,
    scenarioPropertiesDraft,
    scenarioPropertiesError,
    newScenarioDialogOpen,
    newScenarioName,
    saveAsDialogOpen,
    saveAsName,
    scenarioSearchQuery,
    scenarioToLoad,
    filteredScenarios,
    toggleHeaderMenu: (menu: "file" | "scenario" | "view") => dispatch(editorHeaderMenuToggled(menu)),
    closeHeaderMenu: () => dispatch(editorHeaderMenuClosed()),
    openNewScenarioDialog: () => dispatch(editorNewScenarioDialogOpened()),
    openScenarioFileDialog: () => dispatch(editorOpenScenarioDialogOpened()),
    openSaveAsDialog: () => dispatch(editorSaveAsDialogOpened()),
    openScenarioPropertiesDialog: (draft: TacticalEditorScenarioPropertiesDraft) => (
      dispatch(editorScenarioPropertiesDialogOpened(draft))
    ),
    closeFileDialog: () => dispatch(editorFileDialogClosed()),
    changeScenarioSearch: (value: string) => dispatch(editorOpenScenarioSearchChanged(value)),
    selectScenarioToLoad: (id: string) => dispatch(editorOpenScenarioSelected(id)),
    changeScenarioName: (name: string) => dispatch(editorScenarioNameChanged(name)),
    changeScenarioProperties: (draft: TacticalEditorScenarioPropertiesDraft) => (
      dispatch(editorScenarioPropertiesChanged(draft))
    ),
    rejectScenarioProperties: (message: string) => dispatch(editorScenarioPropertiesRejected(message)),
    changeFileMessage: (message: TacticalEditorFileMessage) => dispatch(editorFileMessageChanged(message)),
  };
};
