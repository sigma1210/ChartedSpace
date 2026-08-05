/** @jest-environment jsdom */

import {
  createTacticalScenario,
  deleteTacticalScenario,
  listTacticalScenarios,
  listTacticalTemplates,
  loadTacticalScenario,
  updateTacticalScenario,
  uploadTacticalTemplate,
} from "../tacticalEditorApi";
import { defaultTacticalConsoleVictoryDefinition } from "@/plugins/characterCombat/tacticalConsoleVictory";
import { defaultTacticalScenarioDefinition } from "@/plugins/characterCombat/tacticalScenarioDefinitions";

const response = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
}) as Response;

describe("tacticalEditorApi", () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
  const scenario = { id: "test-scenario", title: "Test Scenario", isDefault: false };
  const document = {
    definition: defaultTacticalScenarioDefinition,
    consoleVictory: defaultTacticalConsoleVictoryDefinition,
  };
  const savedScenario = { scenario, ...document };
  const template = {
    id: "deck-plan",
    label: "Deck Plan",
    imagePath: "/templates/deck-plan.png",
    source: "uploaded" as const,
  };

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    Reflect.deleteProperty(global, "fetch");
  });

  it("lists scenarios and templates without caching", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ scenarios: [scenario] }))
      .mockResolvedValueOnce(response({ templates: [template] }));

    await expect(listTacticalScenarios()).resolves.toEqual([scenario]);
    await expect(listTacticalTemplates()).resolves.toEqual([template]);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/tactical/scenarios", { cache: "no-store" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/tactical/templates", { cache: "no-store" });
  });

  it("loads an encoded scenario id", async () => {
    fetchMock.mockResolvedValue(response(document));

    await expect(loadTacticalScenario("deck plan/1")).resolves.toEqual(document);
    expect(fetchMock).toHaveBeenCalledWith("/api/tactical/scenarios/deck%20plan%2F1", { cache: "no-store" });
  });

  it("creates and updates scenario bundles with JSON bodies", async () => {
    fetchMock
      .mockResolvedValueOnce(response(savedScenario))
      .mockResolvedValueOnce(response(savedScenario));

    await expect(createTacticalScenario(
      "Test Scenario",
      document.definition,
      document.consoleVictory,
    )).resolves.toEqual(savedScenario);
    await expect(updateTacticalScenario(
      "test scenario",
      document.definition,
      document.consoleVictory,
    )).resolves.toEqual(savedScenario);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/tactical/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Scenario", ...document }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/tactical/scenarios/test%20scenario", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document),
    });
  });

  it("deletes an encoded scenario id", async () => {
    fetchMock.mockResolvedValue(response({ deleted: { id: scenario.id, title: scenario.title } }));

    await expect(deleteTacticalScenario("test scenario")).resolves.toEqual({
      id: scenario.id,
      title: scenario.title,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/tactical/scenarios/test%20scenario", { method: "DELETE" });
  });

  it("uploads templates as multipart form data", async () => {
    fetchMock.mockResolvedValue(response({ template }));
    const file = new File(["image"], "deck-plan.png", { type: "image/png" });

    await expect(uploadTacticalTemplate(file)).resolves.toEqual(template);
    expect(fetchMock).toHaveBeenCalledWith("/api/tactical/templates", {
      method: "POST",
      body: expect.any(FormData),
    });
    const request = fetchMock.mock.calls[0]?.[1];
    expect((request?.body as FormData).get("image")).toBe(file);
  });

  it("uses server-provided API errors", async () => {
    fetchMock.mockResolvedValue(response({ error: "Scenario storage is unavailable." }, false));

    await expect(listTacticalScenarios()).rejects.toThrow("Scenario storage is unavailable.");
  });

  it("rejects incomplete successful responses with the operation fallback", async () => {
    fetchMock.mockResolvedValue(response({}));

    await expect(loadTacticalScenario("missing")).rejects.toThrow("Could not load the scenario.");
  });
});
