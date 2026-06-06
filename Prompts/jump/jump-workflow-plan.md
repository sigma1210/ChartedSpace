# Jump Workflow Plan

This document summarizes the intended jump workflow for the system view. It is the implementation-oriented plan derived from the jump transition discussion.

## Core Direction

- The system view is the canonical jump interface.
- The map-page jump flow was a prototype and should not drive the new design.
- Jumping is a lifecycle workflow with phases and event resolution.
- The workflow engine should be independent of Three.js.
- Three.js scenes should respond to workflow phases and events.
- HUDs represent ship UI and should remain continuous across system, jump, and event scenes.
- Resource/style packs may eventually style jump visuals, but the first implementation can hardcode a default tunnel.

## Primary User Flow

1. User opens the Navigation HUD in `/map/system`.
2. Navigation HUD shows reachable jump destinations.
3. User selects an intended destination.
4. User plots the course.
5. If plotting fails, time passes and the turn advances. The ship remains in the current system.
6. If plotting succeeds, the destination is considered plotted for the current session.
7. User executes the jump.
8. The jump drive attempt begins and the visual rupture/tunnel sequence starts.
9. If the drive fails, time passes and the turn advances. The rupture partially forms, collapses, and the ship remains in the current system. Fuel is not consumed.
10. If the drive succeeds, the ship enters jump space.
11. A jump event resolves the jump outcome.
12. Normal jump exits into the intended destination system.
13. Other events may alter, delay, or replace the exit transition.

## Phase Model

Suggested workflow phases:

```text
idle
destinationSelected
prefetchingDestination
plottingCourse
coursePlotted
jumpAttempted
driveCharging
enteringJump
inJump
resolvingJumpEvent
exitingJump
arrived
jumpFailed
```

These names may change during implementation, but the separation matters:

- Plotting happens before a jump can be executed.
- Drive failure happens after a jump is attempted.
- Entering jump and being in jump are separate visual/persistence states.
- Event resolution is a core part of the workflow, not a later add-on.

## Navigation HUD

The Navigation HUD should be the first implementation step.

It should support:

- Showing reachable worlds from the ship's current location.
- Selecting an intended destination.
- Plotting a course to the selected destination.
- Invalidating the plotted course if the destination changes.
- Enabling jump execution only after a successful plot.

Actions should be conceptually separate:

```text
Set Destination
Plot Course
Execute Jump
```

The HUD can reuse the reachable-world logic from `JumpRangeModal`, but should live inside the system view workflow.

## Turn Costs

- Plotting is an expensive task and consumes time.
- Failed plotting advances the turn.
- A failed drive attempt advances the turn.
- A failed drive attempt does not consume fuel.
- Successful jump execution advances the workflow into jump space.
- Existing server validation can remain under the current turn advance mechanism for now.

## Event Resolution

Event resolution is required in phase 1.

Default event handlers should be plain TypeScript objects/functions for now. They will act as prototypes for a future plugin system.

Initial event types:

- `normalJump`: exits into the intended destination system.
- `failedDrive`: collapses the rupture and returns to the current system.
- `misjump`: accounted for in the workflow, but disabled until resolution rules are defined.

Example event output shape:

```ts
type JumpEventResult = {
  type: "normalJump" | "failedDrive" | "misjump";
  transition: "destinationSystem" | "originSystem" | "jumpTunnel" | "eventScene";
  arrivalWorldHex?: string;
  arrivalSectorAbbr?: string;
  message: string;
};
```

Events should receive a shared workflow context, likely including:

- origin system
- intended destination
- ship
- crew
- current turn
- prefetched destination data when available
- style/resource context when added later

Events may later request additional data and may transition to their own scenes.

## Jump Space

While `ship.status === "in_jump"`, `/map/system` should render a generic `JumpSpaceView`.

Jump space should:

- Feel like an external camera view.
- Place the viewer inside or moving through a tunnel/rupture.
- Keep HUDs available unless a HUD cannot send/receive information during jump.
- Allow stale/no-signal HUD states later.
- Loop while waiting for workflow/event resolution.

If the user reloads while in jump, the app can show a generic jump tunnel.

## Persistence

For phase 1:

- The plotted destination can live in Redux while the user is in the system view.
- When the ship enters jump, store the destination key in `localStorage`.
- Remove the local storage destination key when the ship exits jump.
- If the user reloads during jump and the local storage key is missing, dump the user back at the last known location as if the jump failed.

This is intentionally simple and handles the reload edge case without introducing a full persisted jump record yet.

## Data Prefetch

- Prefetch only the selected destination.
- Prefetch as soon as the destination is selected/known.
- If an event later requires a different location, prefetch it when that location becomes known.
- The animation cycle should be long enough to cover ordinary data fetch time.
- The scene should not end early if required data is delayed.

## Scene/Workflow Boundary

The workflow should publish state and events.

Three.js should respond to them.

The workflow should not know about meshes, cameras, or animation details. A scene controller or view component can translate workflow phases into visual states:

- origin system
- partial rupture
- rupture collapse
- jump tunnel
- exit tunnel
- destination system
- event scene

## Phase 1 Build Order

1. Build the Navigation HUD inside `/map/system`.
2. Reuse/rework reachable destination logic from `JumpRangeModal`.
3. Allow destination selection in Redux/local system-view state.
4. Add plot course action and result display.
5. Make destination changes invalidate plotted courses.
6. Add workflow definitions and default event result types.
7. Add jump execution path for plotted courses.
8. Add `JumpSpaceView` for `ship.status === "in_jump"`.
9. Add normal jump event resolution into destination system.
10. Add failed drive event resolution back into origin system.
11. Account for misjump event type, but keep it disabled until rules are defined.
12. Store jump destination key in `localStorage` while in jump and remove it on exit.

## Deferred Work

- Full plugin architecture for events.
- Misjump resolution rules.
- Multiplayer waiting and authority rules.
- Dedicated event scenes such as piracy or unknown-device traps.
- Resource-pack styling for jump tunnel visuals.
- Server-authored workflow state.
- Replacing or deprecating the map-page jump prototype.
- Persisted jump records beyond the simple local storage edge case.
