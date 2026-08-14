/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import TacticalEditorDocumentControls, {
  type TacticalEditorDocumentControlsProps,
} from "../TacticalEditorDocumentControls";

const scenarios = [
  { id: "default", title: "Default Scenario", isDefault: true },
  { id: "boarding", title: "Boarding Action", isDefault: false },
];

const documentControls = () => {
  const callbacks = {
    toggleFileMenu: jest.fn(),
    toggleScenarioMenu: jest.fn(),
    toggleViewMenu: jest.fn(),
    toggleToolbar: jest.fn(),
    closeHeaderMenu: jest.fn(),
    openNewScenario: jest.fn(),
    openScenario: jest.fn(),
    saveScenario: jest.fn(),
    openSaveAs: jest.fn(),
    deleteScenario: jest.fn(),
    openProperties: jest.fn(),
    beginPlaytest: jest.fn(),
    discardDraft: jest.fn(),
    closeOpenDialog: jest.fn(),
    changeSearch: jest.fn(),
    selectScenario: jest.fn(),
    loadScenario: jest.fn(),
    changeProperties: jest.fn(),
    applyProperties: jest.fn(),
    closeProperties: jest.fn(),
    changeNewName: jest.fn(),
    createScenario: jest.fn(),
    closeNewDialog: jest.fn(),
    changeSaveAsName: jest.fn(),
    saveScenarioAs: jest.fn(),
    closeSaveAsDialog: jest.fn(),
  };
  const props: TacticalEditorDocumentControlsProps = {
    header: {
      currentScenario: scenarios[0],
      fileMessage: null,
      fileDialogOpen: false,
      issues: [],
      saveBlockedReason: null,
      dirty: true,
    },
    fileMenu: {
      open: true,
      fileBusy: false,
      mapValid: true,
      currentScenarioIsDefault: false,
      dirty: true,
      draftBlocked: false,
      draftBlockedReason: null,
      onToggle: callbacks.toggleFileMenu,
      onClose: callbacks.closeHeaderMenu,
      onNewScenario: callbacks.openNewScenario,
      onOpenScenario: callbacks.openScenario,
      onSave: callbacks.saveScenario,
      onSaveAs: callbacks.openSaveAs,
      onDelete: callbacks.deleteScenario,
    },
    scenarioMenu: {
      open: false,
      draft: defaultTacticalScenarioDefinition,
      canBeginPlaytest: true,
      dirty: true,
      onToggle: callbacks.toggleScenarioMenu,
      onClose: callbacks.closeHeaderMenu,
      onOpenProperties: callbacks.openProperties,
      onBeginPlaytest: callbacks.beginPlaytest,
      onDiscardDraft: callbacks.discardDraft,
    },
    viewMenu: {
      open: false,
      toolbarVisible: true,
      onToggle: callbacks.toggleViewMenu,
      onClose: callbacks.closeHeaderMenu,
      onToggleToolbar: callbacks.toggleToolbar,
    },
    openScenarioDialog: {
      open: false,
      fileBusy: false,
      scenarioListBusy: false,
      fileMessage: null,
      currentScenarioId: "default",
      availableScenarios: scenarios,
      filteredScenarios: scenarios,
      searchQuery: "",
      selectedScenarioId: "default",
      onClose: callbacks.closeOpenDialog,
      onSearchChange: callbacks.changeSearch,
      onSelectScenario: callbacks.selectScenario,
      onLoadScenario: callbacks.loadScenario,
    },
    scenarioPropertiesDialog: {
      draft: null,
      error: null,
      onChange: callbacks.changeProperties,
      onApply: callbacks.applyProperties,
      onClose: callbacks.closeProperties,
    },
    newScenarioDialog: {
      open: false,
      name: "New Scenario",
      map: defaultTacticalScenarioDefinition.map,
      fileBusy: false,
      fileMessage: null,
      onNameChange: callbacks.changeNewName,
      onCreate: callbacks.createScenario,
      onClose: callbacks.closeNewDialog,
    },
    saveAsDialog: {
      open: false,
      name: "Saved Scenario",
      fileBusy: false,
      draftBlocked: false,
      draftBlockedReason: null,
      fileMessage: null,
      onNameChange: callbacks.changeSaveAsName,
      onSave: callbacks.saveScenarioAs,
      onClose: callbacks.closeSaveAsDialog,
    },
  };
  return { callbacks, props };
};

describe("TacticalEditorDocumentControls", () => {
  it("places File, Scenario, and View in that order in the editor header", () => {
    const { callbacks, props } = documentControls();
    render(<TacticalEditorDocumentControls {...props} />);

    const menuBar = screen.getByRole("navigation", { name: "Scenario editor menu bar" });
    expect(within(menuBar).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "File",
      "Scenario",
      "View",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Open Scenario…" }));
    fireEvent.click(screen.getByRole("button", { name: "Scenario menu" }));
    fireEvent.click(screen.getByRole("button", { name: "View menu" }));

    expect(callbacks.openScenario).toHaveBeenCalledTimes(1);
    expect(callbacks.toggleScenarioMenu).toHaveBeenCalledTimes(1);
    expect(callbacks.toggleViewMenu).toHaveBeenCalledTimes(1);
  });

  it("puts Toolbar first in View and forwards its visibility toggle", () => {
    const { callbacks, props } = documentControls();
    props.fileMenu.open = false;
    props.viewMenu.open = true;
    render(<TacticalEditorDocumentControls {...props} />);

    const viewMenu = screen.getByRole("menu", { name: "View" });
    const items = within(viewMenu).getAllByRole("menuitemcheckbox");
    expect(items[0].textContent).toContain("Toolbar");
    expect(items[0].getAttribute("aria-checked")).toBe("true");
    fireEvent.click(items[0]);

    expect(callbacks.closeHeaderMenu).toHaveBeenCalledTimes(1);
    expect(callbacks.toggleToolbar).toHaveBeenCalledTimes(1);
  });

  it("dismisses an open header menu on outside pointer-down or Escape but not inside pointer-down", () => {
    const { callbacks, props } = documentControls();
    render(<TacticalEditorDocumentControls {...props} />);

    fireEvent.pointerDown(screen.getByRole("menu", { name: "File" }));
    expect(callbacks.closeHeaderMenu).not.toHaveBeenCalled();

    fireEvent.pointerDown(document.body);
    expect(callbacks.closeHeaderMenu).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(callbacks.closeHeaderMenu).toHaveBeenCalledTimes(2);
  });

  it("forwards open-scenario dialog interactions", () => {
    const { callbacks, props } = documentControls();
    props.openScenarioDialog.open = true;
    render(<TacticalEditorDocumentControls {...props} />);

    fireEvent.change(screen.getByLabelText("Search scenarios"), {
      target: { value: "boarding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close Open Scenario" }));

    expect(callbacks.changeSearch).toHaveBeenCalledWith("boarding");
    expect(callbacks.closeOpenDialog).toHaveBeenCalledTimes(1);
  });

  it("forwards properties, new-scenario, and save-as dialog commands", () => {
    const { callbacks, props } = documentControls();
    props.scenarioPropertiesDialog.draft = {
      title: "Boarding Action",
      briefing: "Board the ship.",
      objective: "Secure engineering.",
      deploymentEdges: ["south"],
    };
    props.newScenarioDialog.open = true;
    props.saveAsDialog.open = true;
    render(<TacticalEditorDocumentControls {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "Save As" }));

    expect(callbacks.applyProperties).toHaveBeenCalledTimes(1);
    expect(callbacks.createScenario).toHaveBeenCalledTimes(1);
    expect(callbacks.saveScenarioAs).toHaveBeenCalledTimes(1);
  });
});
