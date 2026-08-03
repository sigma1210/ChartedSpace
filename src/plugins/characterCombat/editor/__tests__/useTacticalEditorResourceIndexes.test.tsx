/** @jest-environment jsdom */

import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { createAppStore, type AppStore } from "@/store";
import {
  listTacticalScenarios,
  listTacticalTemplates,
} from "../tacticalEditorApi";
import { useTacticalEditorResourceIndexes } from "../useTacticalEditorResourceIndexes";

jest.mock("../tacticalEditorApi", () => ({
  listTacticalScenarios: jest.fn(),
  listTacticalTemplates: jest.fn(),
}));

const listScenariosMock = jest.mocked(listTacticalScenarios);
const listTemplatesMock = jest.mocked(listTacticalTemplates);
const scenario = { id: "boarding-action", title: "Boarding Action", isDefault: false };
const template = {
  id: "deck-plan",
  label: "Deck Plan",
  imagePath: "/templates/deck-plan.png",
  source: "uploaded" as const,
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const renderResourceIndexes = (store: AppStore) => renderHook(
  () => useTacticalEditorResourceIndexes(),
  { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider> },
);

describe("useTacticalEditorResourceIndexes", () => {
  beforeEach(() => {
    listScenariosMock.mockReset();
    listTemplatesMock.mockReset();
  });

  it("loads both resource indexes into the editor store", async () => {
    listScenariosMock.mockResolvedValue([scenario]);
    listTemplatesMock.mockResolvedValue([template]);
    const store = createAppStore();

    renderResourceIndexes(store);

    await waitFor(() => {
      expect(store.getState().tacticalEditor.file.scenarioIndex).toEqual({
        items: [scenario],
        status: "idle",
      });
      expect(store.getState().tacticalEditor.templates).toMatchObject({
        assets: [template],
        indexStatus: "idle",
      });
    });
  });

  it("stores the existing scenario and template loading errors", async () => {
    listScenariosMock.mockRejectedValue(new Error("Could not read scenarios."));
    listTemplatesMock.mockRejectedValue(new Error("Could not read templates."));
    const store = createAppStore();

    renderResourceIndexes(store);

    await waitFor(() => {
      expect(store.getState().tacticalEditor.file.scenarioIndex.status).toBe("failed");
      expect(store.getState().tacticalEditor.file.message).toEqual({
        kind: "error",
        text: "Could not read scenarios.",
      });
      expect(store.getState().tacticalEditor.templates.indexStatus).toBe("failed");
      expect(store.getState().tacticalEditor.templates.message).toEqual({
        kind: "error",
        text: "Could not read templates.",
      });
    });
  });

  it("refreshes the scenario index on demand", async () => {
    listScenariosMock.mockResolvedValueOnce([]).mockResolvedValueOnce([scenario]);
    listTemplatesMock.mockResolvedValue([]);
    const store = createAppStore();
    const { result } = renderResourceIndexes(store);
    await waitFor(() => expect(store.getState().tacticalEditor.file.scenarioIndex.status).toBe("idle"));

    await act(async () => result.current.refreshScenarioList());

    expect(listScenariosMock).toHaveBeenCalledTimes(2);
    expect(store.getState().tacticalEditor.file.scenarioIndex.items).toEqual([scenario]);
  });

  it("marks a failed manual refresh and rethrows its error", async () => {
    listScenariosMock.mockResolvedValueOnce([]);
    listTemplatesMock.mockResolvedValue([]);
    const store = createAppStore();
    const { result } = renderResourceIndexes(store);
    await waitFor(() => expect(store.getState().tacticalEditor.file.scenarioIndex.status).toBe("idle"));
    const error = new Error("Refresh failed.");
    listScenariosMock.mockRejectedValueOnce(error);

    await expect(result.current.refreshScenarioList()).rejects.toBe(error);

    expect(store.getState().tacticalEditor.file.scenarioIndex.status).toBe("failed");
  });

  it("does not commit resource results after unmount", async () => {
    const scenarios = deferred<Awaited<ReturnType<typeof listTacticalScenarios>>>();
    const templates = deferred<Awaited<ReturnType<typeof listTacticalTemplates>>>();
    listScenariosMock.mockReturnValue(scenarios.promise);
    listTemplatesMock.mockReturnValue(templates.promise);
    const store = createAppStore();
    const { unmount } = renderResourceIndexes(store);

    unmount();
    await act(async () => {
      scenarios.resolve([scenario]);
      templates.resolve([template]);
      await Promise.all([scenarios.promise, templates.promise]);
    });

    expect(store.getState().tacticalEditor.file.scenarioIndex).toEqual({
      items: [],
      status: "loading",
    });
    expect(store.getState().tacticalEditor.templates).toMatchObject({
      assets: [],
      indexStatus: "loading",
    });
  });
});
