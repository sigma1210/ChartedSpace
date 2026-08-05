/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { createAppStore } from "@/store";
import {
  editorFileOperationStarted,
  editorScenarioIndexReceived,
  editorScenarioIndexRequested,
} from "../../redux/tacticalEditorSlice";
import { useTacticalEditorFileState } from "../useTacticalEditorFileState";

const renderFileState = () => {
  const store = createAppStore();
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  return {
    ...renderHook(() => useTacticalEditorFileState(), { wrapper }),
    store,
  };
};

const scenarios = [
  { id: "alpha-station", title: "Alpha Station", isDefault: false },
  { id: "beta-moon", title: "Beta Moon", isDefault: false },
  { id: "gamma-port", title: "Gamma Port", isDefault: false },
];

describe("useTacticalEditorFileState", () => {
  it("derives the initial file workflow state", () => {
    const { result } = renderFileState();

    expect(result.current).toMatchObject({
      availableScenarios: [],
      scenarioListBusy: true,
      fileBusy: false,
      fileMessage: null,
      openHeaderMenu: null,
      openScenarioDialog: false,
      scenarioPropertiesDraft: null,
      newScenarioDialogOpen: false,
      saveAsDialogOpen: false,
      scenarioSearchQuery: "",
      scenarioToLoad: "",
      filteredScenarios: [],
    });
  });

  it("toggles and closes header menus", () => {
    const { result } = renderFileState();

    act(() => result.current.toggleHeaderMenu("file"));
    expect(result.current.openHeaderMenu).toBe("file");
    act(() => result.current.toggleHeaderMenu("scenario"));
    expect(result.current.openHeaderMenu).toBe("scenario");
    act(() => result.current.closeHeaderMenu());
    expect(result.current.openHeaderMenu).toBeNull();
  });

  it("opens, searches, filters, and selects scenarios", () => {
    const { result, store } = renderFileState();

    act(() => store.dispatch(editorScenarioIndexReceived(scenarios)));
    act(() => result.current.openScenarioFileDialog());
    expect(result.current.openScenarioDialog).toBe(true);
    expect(result.current.availableScenarios).toEqual(scenarios);
    expect(result.current.filteredScenarios).toEqual(scenarios);
    expect(result.current.scenarioToLoad).toBe("alpha-station");

    act(() => result.current.changeScenarioSearch("  MOON "));
    expect(result.current.scenarioSearchQuery).toBe("  MOON ");
    expect(result.current.filteredScenarios).toEqual([scenarios[1]]);
    expect(result.current.scenarioToLoad).toBe("beta-moon");

    act(() => result.current.changeScenarioSearch("port"));
    act(() => result.current.selectScenarioToLoad("gamma-port"));
    expect(result.current.filteredScenarios).toEqual([scenarios[2]]);
    expect(result.current.scenarioToLoad).toBe("gamma-port");
  });

  it("manages new and Save As scenario names", () => {
    const { result } = renderFileState();

    act(() => result.current.openNewScenarioDialog());
    expect(result.current.newScenarioDialogOpen).toBe(true);
    act(() => result.current.changeScenarioName("New Scenario"));
    expect(result.current.newScenarioName).toBe("New Scenario");
    act(() => result.current.closeFileDialog());
    expect(result.current.newScenarioDialogOpen).toBe(false);

    act(() => result.current.openSaveAsDialog());
    act(() => result.current.changeScenarioName("Saved Copy"));
    expect(result.current.saveAsDialogOpen).toBe(true);
    expect(result.current.saveAsName).toBe("Saved Copy");
  });

  it("manages staged scenario properties and errors", () => {
    const { result } = renderFileState();
    const properties = {
      title: "Scenario",
      briefing: "Briefing",
      objective: "Objective",
      deploymentEdges: ["south" as const],
    };

    act(() => result.current.openScenarioPropertiesDialog(properties));
    expect(result.current.scenarioPropertiesDraft).toEqual(properties);
    act(() => result.current.rejectScenarioProperties("Invalid properties"));
    expect(result.current.scenarioPropertiesError).toBe("Invalid properties");
    act(() => result.current.changeScenarioProperties({ ...properties, title: "Updated" }));
    expect(result.current.scenarioPropertiesDraft?.title).toBe("Updated");
    expect(result.current.scenarioPropertiesError).toBeNull();
  });

  it("derives list and file busy states and updates messages", () => {
    const { result, store } = renderFileState();

    act(() => store.dispatch(editorScenarioIndexRequested()));
    expect(result.current.scenarioListBusy).toBe(true);
    act(() => store.dispatch(editorFileOperationStarted("opening")));
    expect(result.current.fileBusy).toBe(true);
    act(() => result.current.changeFileMessage({ kind: "error", text: "Could not open" }));
    expect(result.current.fileMessage).toEqual({ kind: "error", text: "Could not open" });
  });
});
