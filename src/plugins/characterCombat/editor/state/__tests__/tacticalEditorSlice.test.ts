import tacticalEditorReducer, {
  editorAreaAnchorSelected,
  editorCircleTerrainTypeChanged,
  editorConsoleVictoryChanged,
  editorDocumentDiscarded,
  editorDocumentSaved,
  editorDraftChanged,
  editorDrawingToolActivated,
  editorDrawingToolCleared,
  editorEnemyToolActivated,
  editorFileOperationFailed,
  editorFileOperationStarted,
  editorFileOperationSucceeded,
  editorHiddenLayerToggled,
  editorHudLayoutChanged,
  editorHudLayoutsHydrated,
  editorHudLayoutsReset,
  editorLayerUnlocked,
  editorLockedLayerToggled,
  editorNewScenarioDialogOpened,
  editorOpenScenarioDialogOpened,
  editorOpenScenarioSearchChanged,
  editorOperationSelected,
  editorPrimaryToolActivated,
  editorScenarioActivated,
  editorScenarioIndexReceived,
  editorScenarioNameChanged,
  editorScenarioPropertiesDialogOpened,
  editorSelectionChanged,
  editorSelectionCleared,
  editorSelectionKindCleared,
  editorSessionReset,
  editorTemplateIndexFailed,
  editorTemplateIndexReceived,
  editorTemplateIndexRequested,
  editorTemplateOperationStarted,
  editorTemplateUploadSucceeded,
  editorToolGroupToggled,
  initialTacticalEditorState,
} from "../tacticalEditorSlice";
import { createAppStore } from "@/store";
import { selectTacticalEditorDocumentDirty } from "@/plugins/characterCombat/editor/state/selectors";

const editorDraftWithWalls = (ids: string[]) => ({
  ...initialTacticalEditorState.document.draft,
  drawnWalls: ids.map((id, index) => ({
    id,
    from: { x: index * 3 + 1, y: 1 },
    to: { x: index * 3 + 2, y: 1 },
  })),
});

describe("tactical editor selection state", () => {
  it("keeps exactly one selected map object", () => {
    const area = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "area", id: "area-1" }));
    const portal = tacticalEditorReducer(area, editorSelectionChanged({ kind: "portal", id: "door-1" }));

    expect(portal.selection.object).toEqual({ kind: "portal", id: "door-1" });
    expect(portal.selection.areaAnchor).toBeNull();
    expect(portal.selection.operationId).toBeNull();
  });

  it("accepts an area anchor only for the selected area", () => {
    const selected = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "area", id: "area-1" }));
    const anchored = tacticalEditorReducer(selected, editorAreaAnchorSelected({ areaId: "area-1", anchorIndex: 2 }));
    const rejected = tacticalEditorReducer(anchored, editorAreaAnchorSelected({ areaId: "area-2", anchorIndex: 1 }));

    expect(anchored.selection.areaAnchor).toEqual({ areaId: "area-1", anchorIndex: 2 });
    expect(rejected.selection.areaAnchor).toBeNull();
  });

  it("accepts a console operation only for a terrain placement", () => {
    const placement = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "terrain-placement", id: "console-1" }));
    const withOperation = tacticalEditorReducer(placement, editorOperationSelected("operation-1"));
    const enemy = tacticalEditorReducer(withOperation, editorSelectionChanged({ kind: "enemy", id: "enemy-1" }));

    expect(withOperation.selection.operationId).toBe("operation-1");
    expect(enemy.selection.operationId).toBeNull();
  });

  it("clears only the requested selection kind for compatibility transitions", () => {
    const wall = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "wall", id: "wall-1" }));
    const unchanged = tacticalEditorReducer(wall, editorSelectionKindCleared("enemy"));
    const cleared = tacticalEditorReducer(unchanged, editorSelectionKindCleared("wall"));

    expect(unchanged.selection.object).toEqual({ kind: "wall", id: "wall-1" });
    expect(cleared.selection.object).toBeNull();
  });

  it("clears the complete selection for explicit clear and session reset", () => {
    const selected = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "fire", position: { x: 3, y: 4 } }));
    expect(tacticalEditorReducer(selected, editorSelectionCleared())).toEqual(initialTacticalEditorState);
    expect(tacticalEditorReducer(selected, editorSessionReset())).toEqual(initialTacticalEditorState);
  });

  it("represents primary, drawing, and enemy tools as mutually exclusive modes", () => {
    const drawing = tacticalEditorReducer(initialTacticalEditorState, editorDrawingToolActivated("scenario-wall"));
    const enemy = tacticalEditorReducer(drawing, editorEnemyToolActivated("gang-member"));
    const primary = tacticalEditorReducer(enemy, editorPrimaryToolActivated("hand"));

    expect(drawing.tools.mode).toEqual({ kind: "drawing", toolId: "scenario-wall" });
    expect(enemy.tools.mode).toEqual({ kind: "enemy", enemyType: "gang-member" });
    expect(primary.tools.mode).toEqual({ kind: "primary", tool: "hand" });
  });

  it("clears object selection when a placement mode is activated", () => {
    const selected = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "wall", id: "wall-1" }));
    const drawing = tacticalEditorReducer(selected, editorDrawingToolActivated("scenario-wall-door"));
    const enemy = tacticalEditorReducer(selected, editorEnemyToolActivated("gang-leader"));

    expect(drawing.selection).toEqual(initialTacticalEditorState.selection);
    expect(enemy.selection).toEqual(initialTacticalEditorState.selection);
  });

  it("clears only an active drawing mode after a completed drawing", () => {
    const drawing = tacticalEditorReducer(initialTacticalEditorState, editorDrawingToolActivated("scenario-circle-area"));
    const cleared = tacticalEditorReducer(drawing, editorDrawingToolCleared());
    const enemy = tacticalEditorReducer(cleared, editorEnemyToolActivated("gang-member"));
    const unchanged = tacticalEditorReducer(enemy, editorDrawingToolCleared());

    expect(cleared.tools.mode).toEqual({ kind: "primary", tool: "select" });
    expect(unchanged.tools.mode).toEqual({ kind: "enemy", enemyType: "gang-member" });
  });

  it("stores circle compatibility type and toggles one expanded tool group", () => {
    const circle = tacticalEditorReducer(initialTacticalEditorState, editorCircleTerrainTypeChanged("liquid-hydrogen"));
    const opened = tacticalEditorReducer(circle, editorToolGroupToggled("boundaries"));
    const switched = tacticalEditorReducer(opened, editorToolGroupToggled("areas"));
    const closed = tacticalEditorReducer(switched, editorToolGroupToggled("areas"));

    expect(circle.tools.circleTerrainType).toBe("liquid-hydrogen");
    expect(opened.tools.openGroup).toBe("boundaries");
    expect(switched.tools.openGroup).toBe("areas");
    expect(closed.tools.openGroup).toBeNull();
  });

  it("keeps exactly one file dialog with its own form state", () => {
    const opened = tacticalEditorReducer(initialTacticalEditorState, editorNewScenarioDialogOpened());
    const named = tacticalEditorReducer(opened, editorScenarioNameChanged("Boarding Action"));
    const properties = tacticalEditorReducer(named, editorScenarioPropertiesDialogOpened({
      title: "Control Room",
      briefing: "Secure the bridge.",
      objective: "Take control.",
      deploymentEdges: ["south"],
    }));

    expect(named.file.dialog).toEqual({ kind: "new", name: "Boarding Action" });
    expect(properties.file.dialog).toEqual({
      kind: "properties",
      draft: {
        title: "Control Room",
        briefing: "Secure the bridge.",
        objective: "Take control.",
        deploymentEdges: ["south"],
      },
      error: null,
    });
  });

  it("selects the first matching scenario when open-dialog search changes", () => {
    const indexed = tacticalEditorReducer(initialTacticalEditorState, editorScenarioIndexReceived([
      { id: "control-room-assault", title: "Control Room Assault", isDefault: true },
      { id: "boarding-action", title: "Boarding Action", isDefault: false },
    ]));
    const opened = tacticalEditorReducer(indexed, editorOpenScenarioDialogOpened());
    const searched = tacticalEditorReducer(opened, editorOpenScenarioSearchChanged("boarding"));

    expect(searched.file.dialog).toEqual({
      kind: "open",
      searchQuery: "boarding",
      selectedScenarioId: "boarding-action",
    });
  });

  it("tracks one file operation and its success or failure message", () => {
    const saving = tacticalEditorReducer(initialTacticalEditorState, editorFileOperationStarted("saving"));
    const saved = tacticalEditorReducer(saving, editorFileOperationSucceeded({
      message: "Saved boarding-action.json.",
      currentScenario: { id: "boarding-action", title: "Boarding Action", isDefault: false },
      closeDialog: true,
    }));
    const failed = tacticalEditorReducer(saving, editorFileOperationFailed("Could not save the scenario."));

    expect(saving.file.operation).toBe("saving");
    expect(saved.file.currentScenario.id).toBe("boarding-action");
    expect(saved.file.message).toEqual({ kind: "success", text: "Saved boarding-action.json." });
    expect(failed.file).toMatchObject({ operation: "idle", message: { kind: "error", text: "Could not save the scenario." } });
  });

  it("resets selection and tools atomically when another scenario becomes active", () => {
    const selected = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "wall", id: "wall-1" }));
    const drawing = tacticalEditorReducer(selected, editorDrawingToolActivated("scenario-wall"));
    const locked = tacticalEditorReducer(drawing, editorLockedLayerToggled("enemy:enemy-1"));
    const activated = tacticalEditorReducer(locked, editorScenarioActivated({
      scenario: { id: "boarding-action", title: "Boarding Action", isDefault: false },
      message: "Loaded Boarding Action.",
    }));

    expect(activated.selection).toEqual(initialTacticalEditorState.selection);
    expect(activated.tools).toEqual(initialTacticalEditorState.tools);
    expect(activated.layers).toEqual(initialTacticalEditorState.layers);
    expect(activated.file.currentScenario.id).toBe("boarding-action");
    expect(activated.file.dialog).toEqual({ kind: "closed" });
  });

  it("hydrates persisted HUD pin and position without replacing visibility", () => {
    const hidden = tacticalEditorReducer(initialTacticalEditorState, editorHudLayoutChanged({
      id: "tools",
      layout: { visible: false, pinned: false, position: { x: 300, y: 12 } },
    }));
    const hydrated = tacticalEditorReducer(hidden, editorHudLayoutsHydrated({
      tools: { pinned: true, position: { x: 118, y: 74 } },
    }));

    expect(hydrated.hudLayouts.tools).toEqual({
      visible: false,
      pinned: true,
      position: { x: 118, y: 74 },
    });
    expect(hydrated.hudLayoutsReady).toBe(true);
    expect(tacticalEditorReducer(initialTacticalEditorState, editorHudLayoutsHydrated({})).hudLayoutsReady)
      .toBe(true);
  });

  it("retains HUD layout through scenario activation and session reset", () => {
    const moved = tacticalEditorReducer(initialTacticalEditorState, editorHudLayoutChanged({
      id: "layers",
      layout: { visible: false, pinned: true, position: { x: 640, y: 88 } },
    }));
    const activated = tacticalEditorReducer(moved, editorScenarioActivated({
      scenario: { id: "boarding-action", title: "Boarding Action", isDefault: false },
      message: "Loaded Boarding Action.",
    }));
    const resetSession = tacticalEditorReducer(activated, editorSessionReset());

    expect(activated.hudLayouts.layers).toEqual(moved.hudLayouts.layers);
    expect(resetSession.hudLayouts.layers).toEqual(moved.hudLayouts.layers);
    expect(tacticalEditorReducer(resetSession, editorHudLayoutsReset()).hudLayouts)
      .toEqual(initialTacticalEditorState.hudLayouts);
  });

  it("tracks document edits separately from their saved baselines", () => {
    const editedDraft = {
      ...initialTacticalEditorState.document.draft,
      title: "Edited Scenario",
    };
    const editedConsoleVictory = {
      ...initialTacticalEditorState.document.consoleVictory,
      id: "edited-console-victory",
    };
    const draftChanged = tacticalEditorReducer(initialTacticalEditorState, editorDraftChanged(editedDraft));
    const consoleChanged = tacticalEditorReducer(draftChanged, editorConsoleVictoryChanged(editedConsoleVictory));

    expect(consoleChanged.document.draft.title).toBe("Edited Scenario");
    expect(consoleChanged.document.baseline.title).toBe(initialTacticalEditorState.document.baseline.title);
    expect(consoleChanged.document.consoleVictory.id).toBe("edited-console-victory");
    expect(consoleChanged.document.consoleVictoryBaseline.id)
      .toBe(initialTacticalEditorState.document.consoleVictoryBaseline.id);
  });

  it("establishes saved baselines and discards later scenario and console edits together", () => {
    const savedDraft = { ...initialTacticalEditorState.document.draft, title: "Saved Scenario" };
    const savedConsoleVictory = { ...initialTacticalEditorState.document.consoleVictory, id: "saved-victory" };
    const saved = tacticalEditorReducer(initialTacticalEditorState, editorDocumentSaved({
      draft: savedDraft,
      consoleVictory: savedConsoleVictory,
    }));
    const edited = tacticalEditorReducer(saved, editorDraftChanged({ ...savedDraft, title: "Unsaved Edit" }));
    const editedBoth = tacticalEditorReducer(edited, editorConsoleVictoryChanged({
      ...savedConsoleVictory,
      id: "unsaved-victory-edit",
    }));
    const discarded = tacticalEditorReducer(editedBoth, editorDocumentDiscarded());

    expect(saved.document.draft).toEqual(saved.document.baseline);
    expect(saved.document.consoleVictory).toEqual(saved.document.consoleVictoryBaseline);
    expect(discarded.document.draft.title).toBe("Saved Scenario");
    expect(discarded.document.consoleVictory.id).toBe("saved-victory");
  });

  it("derives dirty state from either document and clears it after save", () => {
    const editorStore = createAppStore();
    expect(selectTacticalEditorDocumentDirty(editorStore.getState())).toBe(false);

    editorStore.dispatch(editorDraftChanged({
      ...editorStore.getState().tacticalEditor.document.draft,
      title: "Dirty Scenario",
    }));
    expect(selectTacticalEditorDocumentDirty(editorStore.getState())).toBe(true);

    const document = editorStore.getState().tacticalEditor.document;
    editorStore.dispatch(editorDocumentSaved({
      draft: document.draft,
      consoleVictory: document.consoleVictory,
    }));
    expect(selectTacticalEditorDocumentDirty(editorStore.getState())).toBe(false);
  });

  it("activates a scenario and its two document baselines atomically", () => {
    const loadedDraft = { ...initialTacticalEditorState.document.draft, id: "loaded", title: "Loaded" };
    const loadedConsoleVictory = {
      ...initialTacticalEditorState.document.consoleVictory,
      id: "loaded-victory",
      scenarioId: "loaded",
    };
    const activated = tacticalEditorReducer(initialTacticalEditorState, editorScenarioActivated({
      scenario: { id: "loaded", title: "Loaded", isDefault: false },
      message: "Loaded Loaded.",
      document: { draft: loadedDraft, consoleVictory: loadedConsoleVictory },
    }));

    expect(activated.file.currentScenario.id).toBe("loaded");
    expect(activated.document.draft).toEqual(activated.document.baseline);
    expect(activated.document.consoleVictory).toEqual(activated.document.consoleVictoryBaseline);
    expect(activated.document.draft.title).toBe("Loaded");
  });

  it("tracks template indexing independently from template operations", () => {
    const requested = tacticalEditorReducer(initialTacticalEditorState, editorTemplateIndexRequested());
    const applying = tacticalEditorReducer(requested, editorTemplateOperationStarted("applying"));
    const failedIndex = tacticalEditorReducer(applying, editorTemplateIndexFailed("Could not list templates."));
    const received = tacticalEditorReducer(failedIndex, editorTemplateIndexReceived([{
      id: "built-in:deck-plan",
      label: "Deck Plan",
      imagePath: "/images/deck-plan.jpg",
      source: "built-in",
    }]));

    expect(requested.templates.indexStatus).toBe("loading");
    expect(applying.templates.operation).toBe("applying");
    expect(failedIndex.templates).toMatchObject({
      indexStatus: "failed",
      operation: "applying",
      message: { kind: "error", text: "Could not list templates." },
    });
    expect(received.templates.indexStatus).toBe("idle");
    expect(received.templates.operation).toBe("applying");
    expect(received.templates.assets).toHaveLength(1);
  });

  it("adds an uploaded template once and completes its operation with a message", () => {
    const asset = {
      id: "uploaded:deck-plan",
      label: "Uploaded Deck Plan",
      imagePath: "/uploads/deck-plan.jpg",
      source: "uploaded" as const,
    };
    const uploading = tacticalEditorReducer(initialTacticalEditorState, editorTemplateOperationStarted("uploading"));
    const uploaded = tacticalEditorReducer(uploading, editorTemplateUploadSucceeded({
      asset,
      message: "Uploaded Deck Plan uploaded and fitted to the map.",
    }));
    const duplicate = tacticalEditorReducer(uploaded, editorTemplateUploadSucceeded({
      asset,
      message: "Uploaded Deck Plan uploaded and fitted to the map.",
    }));

    expect(uploading.templates).toMatchObject({ operation: "uploading", message: null });
    expect(uploaded.templates).toMatchObject({
      operation: "idle",
      message: { kind: "success", text: "Uploaded Deck Plan uploaded and fitted to the map." },
    });
    expect(duplicate.templates.assets).toEqual([asset]);
  });

  it("stores hidden and locked layer overrides as serializable key records", () => {
    const hidden = tacticalEditorReducer(initialTacticalEditorState, editorHiddenLayerToggled("wall:wall-1"));
    const locked = tacticalEditorReducer(hidden, editorLockedLayerToggled("enemy:enemy-1"));
    const shown = tacticalEditorReducer(locked, editorHiddenLayerToggled("wall:wall-1"));

    expect(hidden.layers.hiddenByKey).toEqual({ "wall:wall-1": true });
    expect(locked.layers.lockedByKey).toEqual({ "enemy:enemy-1": true });
    expect(shown.layers.hiddenByKey).toEqual({});
  });

  it("clears a selection when its layer visibility or lock is toggled", () => {
    const selectedWall = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "wall", id: "wall-1" }));
    const hidden = tacticalEditorReducer(selectedWall, editorHiddenLayerToggled("wall:wall-1"));
    const selectedEnemy = tacticalEditorReducer(initialTacticalEditorState, editorSelectionChanged({ kind: "enemy", id: "enemy-1" }));
    const locked = tacticalEditorReducer(selectedEnemy, editorLockedLayerToggled("enemy:enemy-1"));

    expect(hidden.selection.object).toBeNull();
    expect(locked.selection.object).toBeNull();
  });

  it("unlocks an enemy without discarding the Enemy Editor selection", () => {
    const locked = tacticalEditorReducer(initialTacticalEditorState, editorLockedLayerToggled("enemy:enemy-1"));
    const selected = tacticalEditorReducer(locked, editorSelectionChanged({ kind: "enemy", id: "enemy-1" }));
    const unlocked = tacticalEditorReducer(selected, editorLayerUnlocked("enemy:enemy-1"));

    expect(unlocked.layers.lockedByKey).toEqual({});
    expect(unlocked.selection.object).toEqual({ kind: "enemy", id: "enemy-1" });
  });

  it("prunes stale layer state when the draft changes", () => {
    const withWalls = tacticalEditorReducer(initialTacticalEditorState, editorDraftChanged(
      editorDraftWithWalls(["removed-wall", "kept-wall"]),
    ));
    const hidden = tacticalEditorReducer(withWalls, editorHiddenLayerToggled("wall:removed-wall"));
    const locked = tacticalEditorReducer(hidden, editorLockedLayerToggled("wall:kept-wall"));
    const selected = tacticalEditorReducer(locked, editorSelectionChanged({ kind: "wall", id: "removed-wall" }));
    const pruned = tacticalEditorReducer(selected, editorDraftChanged(editorDraftWithWalls(["kept-wall"])));

    expect(pruned.layers.hiddenByKey).toEqual({});
    expect(pruned.layers.lockedByKey).toEqual({ "wall:kept-wall": true });
    expect(pruned.selection.object).toBeNull();
  });

  it("prunes stale layer state when a saved document replaces the draft", () => {
    const withWalls = tacticalEditorReducer(initialTacticalEditorState, editorDraftChanged(
      editorDraftWithWalls(["removed-wall", "kept-wall"]),
    ));
    const hidden = tacticalEditorReducer(withWalls, editorHiddenLayerToggled("wall:kept-wall"));
    const locked = tacticalEditorReducer(hidden, editorLockedLayerToggled("wall:removed-wall"));
    const selected = tacticalEditorReducer(locked, editorSelectionChanged({ kind: "wall", id: "removed-wall" }));
    const saved = tacticalEditorReducer(selected, editorDocumentSaved({
      draft: editorDraftWithWalls(["kept-wall"]),
      consoleVictory: selected.document.consoleVictory,
    }));

    expect(saved.layers.hiddenByKey).toEqual({ "wall:kept-wall": true });
    expect(saved.layers.lockedByKey).toEqual({});
    expect(saved.selection.object).toBeNull();
  });

  it("prunes layer state for unsaved objects when document changes are discarded", () => {
    const baseline = tacticalEditorReducer(initialTacticalEditorState, editorDocumentSaved({
      draft: editorDraftWithWalls(["kept-wall"]),
      consoleVictory: initialTacticalEditorState.document.consoleVictory,
    }));
    const edited = tacticalEditorReducer(baseline, editorDraftChanged(
      editorDraftWithWalls(["kept-wall", "temporary-wall"]),
    ));
    const hidden = tacticalEditorReducer(edited, editorHiddenLayerToggled("wall:temporary-wall"));
    const locked = tacticalEditorReducer(hidden, editorLockedLayerToggled("wall:temporary-wall"));
    const selected = tacticalEditorReducer(locked, editorSelectionChanged({ kind: "wall", id: "temporary-wall" }));
    const discarded = tacticalEditorReducer(selected, editorDocumentDiscarded());

    expect(discarded.layers).toEqual({ hiddenByKey: {}, lockedByKey: {} });
    expect(discarded.selection.object).toBeNull();
  });
});
