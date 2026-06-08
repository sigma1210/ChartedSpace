import systemSceneReducer, {
  beginSceneReveal,
  beginSceneTransition,
  completeSceneTransition,
  markSceneReady,
  markSceneTransitionCovered,
  setRenderableLocation,
  setSceneMode,
  setWarpExitBlankActive,
  setWarpLayerState,
} from "../slices/systemSceneSlice";

describe("systemSceneSlice reducers", () => {
  it("returns initial state", () => {
    expect(systemSceneReducer(undefined, { type: "@@INIT" })).toEqual({
      sceneMode: "system",
      showWarpLayer: false,
      warpLayerOpacity: 0,
      warpLayerActive: false,
      warpExitBlankActive: false,
      renderableLocation: null,
      transitionPhase: "idle",
      transitionReason: null,
      transitionSceneKey: null,
      sceneReady: true,
    });
  });

  it("updates scene display state", () => {
    let state = systemSceneReducer(undefined, setSceneMode("jump"));
    state = systemSceneReducer(state, setRenderableLocation({ sectorAbbr: "Spin", hex: "1910" }));
    state = systemSceneReducer(state, setWarpLayerState({
      showWarpLayer: true,
      warpLayerOpacity: 0.75,
      warpLayerActive: true,
    }));
    state = systemSceneReducer(state, setWarpExitBlankActive(true));

    expect(state.sceneMode).toBe("jump");
    expect(state.renderableLocation).toEqual({ sectorAbbr: "Spin", hex: "1910" });
    expect(state.showWarpLayer).toBe(true);
    expect(state.warpLayerOpacity).toBe(0.75);
    expect(state.warpLayerActive).toBe(true);
    expect(state.warpExitBlankActive).toBe(true);
  });

  it("tracks scene transition through cover, ready, reveal, and completion", () => {
    let state = systemSceneReducer(
      undefined,
      beginSceneTransition({ reason: "jump-exit", sceneKey: "Spin:1910:system:system" }),
    );

    expect(state.transitionPhase).toBe("covering");
    expect(state.transitionReason).toBe("jump-exit");
    expect(state.transitionSceneKey).toBe("Spin:1910:system:system");
    expect(state.sceneReady).toBe(false);

    state = systemSceneReducer(state, markSceneTransitionCovered("Spin:1910:system:system"));
    expect(state.transitionPhase).toBe("covered");

    state = systemSceneReducer(state, beginSceneReveal("Spin:1910:system:system"));
    expect(state.transitionPhase).toBe("covered");

    state = systemSceneReducer(state, markSceneReady("Spin:1910:system:system"));
    expect(state.sceneReady).toBe(true);

    state = systemSceneReducer(state, beginSceneReveal("Spin:1910:system:system"));
    expect(state.transitionPhase).toBe("revealing");

    state = systemSceneReducer(state, completeSceneTransition("Spin:1910:system:system"));
    expect(state.transitionPhase).toBe("idle");
    expect(state.transitionReason).toBeNull();
    expect(state.transitionSceneKey).toBeNull();
    expect(state.sceneReady).toBe(true);
  });

  it("ignores stale scene transition actions", () => {
    let state = systemSceneReducer(
      undefined,
      beginSceneTransition({ reason: "system-change", sceneKey: "Spin:1910:system:system" }),
    );

    state = systemSceneReducer(state, markSceneTransitionCovered("Spin:1911:system:system"));
    expect(state.transitionPhase).toBe("covering");

    state = systemSceneReducer(state, markSceneReady("Spin:1911:system:system"));
    expect(state.sceneReady).toBe(false);

    state = systemSceneReducer(state, beginSceneReveal("Spin:1911:system:system"));
    expect(state.transitionPhase).toBe("covering");

    state = systemSceneReducer(state, completeSceneTransition("Spin:1911:system:system"));
    expect(state.transitionPhase).toBe("covering");
    expect(state.transitionSceneKey).toBe("Spin:1910:system:system");
  });
});
