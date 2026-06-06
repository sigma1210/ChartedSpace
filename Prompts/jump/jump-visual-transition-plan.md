# Jump Visual Transition Plan

This document defines the deliberate visual architecture for jump transitions in `/map/system`.

It replaces the failed shortcut attempts:

- direct mesh crossfades
- shared-camera fade tricks
- whiteout/cover hacks inside the same scene
- exit burst overlays that still share the tunnel/system camera lifecycle

## Root Problem

The normal system view and the warp tunnel are different camera worlds.

The system view wants:

- a camera reset outside the star system
- orbit controls
- orbital geometry centered around stars/worlds
- HUDs pinned to the user view

The warp view wants:

- a camera moving through a tunnel path
- no orbit controls
- tunnel geometry surrounding the camera
- continuous forward motion

The failed implementations tried to make one default React Three Fiber camera do both jobs during the exit transition.

That created repeated artifacts:

- tunnel motion visibly stopping
- tunnel geometry flashing after the destination camera reset
- warp lines appearing through a burst/cover
- the destination system appearing only after a reload or camera reset
- effects feeling like page switches instead of travel

The issue is architectural, not only timing.

## Direction

Stop treating the exit as an opacity tweak inside one scene.

Treat it as a deliberate render composition problem:

```text
warp camera renders warp
system camera renders system
transition controls how the two rendered views are composed
```

The workflow/game state remains separate from rendering.

## Recommended First Implementation: Layered Canvases

Use two visual layers during jump exit:

```text
top layer:    warp tunnel canvas, warp camera, continuous tunnel motion
bottom layer: destination system canvas, system camera, ready before reveal
```

The top warp layer fades out with CSS opacity.

The destination system is already rendered underneath with its own camera, so there is no moment where tunnel geometry is shown through the system camera.

### Why This Is The Best First Deliberate Approach

- It directly solves the shared-camera problem.
- Each layer keeps its own camera lifecycle.
- The warp tunnel can keep moving until the top layer is fully transparent.
- The destination system can be prepared and camera-reset underneath.
- CSS opacity handles the visual fade without modifying Three.js materials.
- It is easier to reason about than custom render-target compositing.

### Tradeoffs

- Two Canvas instances are briefly active.
- We must ensure HUDs remain above both visual layers.
- We must manage pointer-events so the fading warp layer does not block interaction after arrival.
- There may be a small performance cost during the transition.

This cost is acceptable for a short transition.

## Alternate Implementation: Single Canvas, Multiple Cameras

This is also possible and may become desirable later.

One R3F Canvas can contain:

- a system scene group
- a warp scene group
- a system camera
- a warp camera
- a custom render loop that renders selected scene/layer passes in order

Conceptually:

```ts
gl.autoClear = true;
gl.render(systemScene, systemCamera);
gl.autoClear = false;
gl.clearDepth();
gl.render(warpScene, warpCamera);
```

Or use render targets:

```text
render system camera to texture
render warp camera to texture
blend textures in fullscreen shader
```

### Why Not First

This is more elegant but more complex:

- R3F normally owns the render loop.
- We would need to take over render order.
- We need careful depth clearing.
- Pointer events and controls become more complicated.
- Debugging is harder.

Use this if layered canvases become too limiting.

## Alternate Implementation: True Continuous World Transition

Another possible direction is to place the destination system visually at the end of the tunnel in the warp world.

Then the camera flies out of the tunnel into a temporary staged version of the system, followed by handoff to normal system controls.

This could look excellent, but it requires restructuring how system geometry is staged and scaled for transition. It is not the next step.

## Retired Shortcut Approaches

Do not continue tuning these:

- fading tunnel mesh opacity while switching to the system camera
- rendering tunnel and system geometry in the same default camera context
- using a full-screen cover while the tunnel/system scene still shares camera state
- trying to hide the finite tube end with timing alone
- slowing/stopping tunnel movement before scene swap

These attempts were useful as experiments, but they do not provide the desired smooth exit.

## Layered Canvas Exit Flow

The desired exit behavior:

1. User is in `jumpTunnel`.
2. Tunnel continues moving.
3. Destination system data is resolved or resolving.
4. Destination system layer mounts underneath the warp layer.
5. Destination system camera resets normally.
6. Warp layer remains on top and keeps animating.
7. Warp layer fades out over a short duration.
8. When warp opacity reaches zero:
   - remove/unmount warp layer
   - set normal system mode active
   - keep HUDs mounted

The user should perceive:

```text
still moving through warp
warp view becomes transparent
destination system is already there beneath it
warp disappears
```

No tunnel should ever render from the system camera.

## Layered Canvas Enter Flow

The enter transition can remain simpler at first because it currently feels acceptable.

Longer term:

1. System view remains visible.
2. Warp layer mounts above it with opacity 0.
3. Warp layer starts moving.
4. Warp layer fades in or aperture grows over the system.
5. Once warp is visually dominant, system layer can remain underneath or be hidden.

This uses the same two-layer idea in reverse.

## HUD Rules

HUDs are ship UI, not scene content.

HUDs should:

- remain mounted above visual layers
- keep user-defined positions
- avoid being unmounted by jump/system scene swaps
- optionally enter no-signal/stale states later

HUDs should not be duplicated in both canvases.

## Suggested Component Direction

Current `StarSystemView` mixes:

- system scene
- jump scene
- HUDs
- scene transition logic

For deliberate transitions, split responsibilities:

```text
SystemPageClient
  owns gameplay state and visual phase

SystemSceneCanvas
  renders star system with system camera

WarpSceneCanvas
  renders tunnel with warp camera

SystemHudLayer
  renders HUDs above visual layers

JumpVisualLayerController
  decides which canvases are mounted and their opacity
```

The exact names can change, but the separation matters.

## State Model

Suggested visual phases:

```ts
type JumpVisualPhase =
  | "system"
  | "enteringWarp"
  | "warp"
  | "exitingWarp"
  | "systemReveal";
```

Suggested layer state:

```ts
type VisualLayers = {
  showSystemLayer: boolean;
  showWarpLayer: boolean;
  warpOpacity: number;
  systemOpacity: number;
  warpInteractive: boolean;
};
```

For phase one, system opacity can stay `1`; only warp opacity changes.

## First Implementation Slice

Focus on exit.

1. Back out the failed exit-cover/burst logic.
2. Keep the existing working tunnel scene as a dedicated warp layer.
3. Create a separate system canvas/layer underneath for destination rendering.
4. Keep HUDs outside both canvases or ensure they visually sit above both.
5. When jump exit begins:
   - resolve the jump destination
   - render the destination system underneath
   - keep warp moving on top
   - fade warp layer opacity to zero
6. When opacity reaches zero:
   - mark jump visual phase complete
   - unmount/hide warp layer
   - leave system layer active

## Acceptance Criteria

The exit transition is acceptable when:

- tunnel motion never visibly stops
- no tunnel geometry appears after the system camera reset
- no burst/cover effect has to hide a camera artifact
- the destination system is visible underneath as the warp layer fades
- HUDs remain mounted and stable
- reload is not required for the destination system to appear
- the transition feels intentional even if disorienting

## Deferred Work

- Single-canvas multi-camera renderer.
- Render-target compositor.
- Postprocessing bloom/distortion.
- Resource-pack-defined jump visuals.
- Event-specific transition layers.
- Enter transition using the same layer architecture.
