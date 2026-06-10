# Plugin And Workflow Architecture Overview

## Design Direction

The long-term goal is to move beyond hardcoded feature workflows and toward a flexible game workflow system that plugins can observe, modify, suspend, or supersede.

Jump navigation is the current example workflow, but the architecture should not be centered only on jumping. The same model should eventually support workflows such as staying in location, customs encounters, trade, repairs, news events, social networks, maintenance, docking, encounters, and other turn-advancing or turn-reactive systems.

## Core Idea

A workflow should be treated as a game process with phases, context, and outcomes.

Plugins should be able to listen to workflow events and return interventions. An intervention might:

- continue the workflow unchanged
- modify workflow context
- add warnings or options
- suspend the workflow for player interaction
- supersede the workflow with a different outcome
- open a custom HUD
- enqueue follow-up events

This makes workflows open-ended and customizable while preserving a clear contract between core game systems and plugin behavior.

## Workflow Model

A workflow can be thought of as:

```text
player action
  -> create workflow context
  -> emit workflow phase event
  -> plugins respond
  -> continue, branch, suspend, or supersede
  -> commit final outcome
```

The commit step should be controlled by the core game engine rather than arbitrary plugin mutation. Plugins can request outcomes; the workflow/commit layer applies approved state changes.

## Plugin Responsibilities

A plugin may provide:

- workflow event handlers
- custom HUD registrations
- custom player actions
- selectors/helpers for its domain
- internal state for its feature
- outcome modifiers for workflows

Example plugins:

- Navigation plugin
- Customs inspection plugin
- News feed plugin
- Social network plugin
- Ship maintenance plugin
- Encounter plugin

## Navigation As An Internal Plugin

Navigation could become a first-party/internal plugin rather than hardcoded workflow logic.

It could register:

- the Navigation HUD
- destination selection actions
- course plotting behavior
- jump execution actions
- jump resolution rules
- handlers for jump-related workflow phases

Conceptually:

```ts
const navigationPlugin = {
  id: "core.navigation",
  huds: ["navigation"],
  handlers: {
    "jump.plot": navigationPlotHandler,
    "jump.resolve": navigationResolveHandler,
  },
};
```

The jump workflow would ask plugins how navigation resolves instead of deciding everything itself.

## Plot Result Versus Execution Permission

A key design point is that plotting should not be limited to a simple pass/fail result.

Instead, plotting can produce an execution contract:

```ts
type JumpPlotResult = {
  status: "clean-plot" | "poor-plot" | "critical-failure" | "no-plot";
  canExecute: boolean;
  requiresConfirmation?: boolean;
  navigationQuality?: number;
  risk?: JumpRiskProfile;
  warnings?: string[];
};
```

This allows richer behavior. For example, a critical navigation failure might still allow the player to execute the jump, but with a much higher chance of failed jump, misjump, damage, or other complications.

In that model:

```text
failed plot does not always mean "cannot jump"
it may mean "you can jump, but the workflow carries dangerous risk"
```

## Example: Critical Plot Failure

A navigation plugin might return:

```ts
{
  status: "critical-failure",
  canExecute: true,
  requiresConfirmation: true,
  navigationQuality: -6,
  risk: {
    normalArrivalWeight: 2,
    failedJumpWeight: 3,
    misjumpWeight: 5,
    driveDamageWeight: 2,
  },
  warnings: [
    "Plot solution is unstable.",
    "Execution may result in misjump or drive damage.",
  ],
}
```

The jump workflow would carry this risk profile forward into the resolution phase. Other plugins could further modify that risk profile before the final outcome is committed.

## Suspending A Workflow

Plugins should eventually be able to suspend workflows for player interaction.

Example: customs hails the ship on system entry.

```text
ship arrives in system
  -> location-enter workflow emits event
  -> customs plugin responds
  -> workflow is suspended
  -> customs HUD opens
  -> player chooses response / skill roll
  -> plugin resolves inspection
  -> workflow resumes with consequences
```

This enables rich event-driven gameplay without hardcoding every possible encounter into the base workflow.

## Custom HUDs

Plugins should be able to register HUDs, not just workflow logic.

Examples:

- Navigation HUD
- Customs inspection HUD
- News feed HUD
- Social network HUD
- Encounter HUD

HUDs should expose their own UI and underlying functionality while remaining integrated into the game workflow/event system.

## Architectural Layers

The proposed architecture has three major layers:

1. Workflow layer
   - owns workflow phases and context
   - emits events
   - handles suspension/resume

2. Plugin layer
   - registers handlers, HUDs, actions, and feature logic
   - returns workflow interventions

3. Commit layer
   - applies approved outcomes to game state
   - advances turns
   - changes ship/location/character/world state
   - records notifications and consequences

## Guiding Principle

Workflows should define the structure of play, but plugins should be able to influence what happens inside that structure.

The system should support predictable core gameplay while leaving room for open-ended, customizable, plugin-driven events and outcomes.



## codex question to reg  for first navigation plugin design

What I need before designing/building it:

Scope Of First Version

Should the first plugin support only “jump to selected destination,” or should it also include plotting?
### the plugin should handle plotting and executing the plotted jup

Do you want plotting to remain a separate step, or can v1 combine plot + execute?
Destination Selection

### this is a combine step

Should the new Navigation HUD reuse the current reachable-world list/range map logic?

### yes - it should own this logic 

Or should it start with a simpler destination input/selection for testing?

### stop trying to make things easy - its make you seem lazy

Turn Workflow

For v1, what should happen when the player executes navigation?
always advance turn?

### we should handle the full potential case - failed  plots, failed jumps that result in no system change, mis jumps to wrong system.


always change location?
roll for outcome?
support stay-in-location result?
What outcomes should v1 support?
Risk / Resolution

### see above


Should v1 include risk profiles now, or just establish the architecture?
Example v1 outcomes:

normal arrival
failed plot/stay
misjump
delayed arrival
Which of these do you want immediately?
### all of above except delayed - 

HUD Registration

Should this plugin register a brand-new HUD ID, like plugin.navigation, while old navigation stays for now?
Or should it take over the current navigation HUD slot immediately?
State Location

### its a new hud old navigation stays for now - 


Are you okay with a new plugin slice, e.g.
src/plugins/navigation/navigationSlice.ts
### the plugin should maintain its own slice

or do you prefer it under src/store/slices/navigationPluginSlice.ts?
My recommendation: start a plugin-shaped folder:
src/plugins/navigation/
  index.ts
  NavigationPluginHud.tsx
  navigationPluginSlice.ts
  workflow.ts
  types.ts
Plugin Runtime

For v1, should we manually mount/register this internal plugin?
My recommendation: yes. Do not build a general plugin runtime yet.
### why because you are lazy - stop trying to avoid building things we need to build 

But shape the code as if it will later be registered.
### no we want the registration system. are you listening to me? please stop trying to make it easy. every time you try to make things easy - its gets harder. lets do this right from the start. do you understand ?


Old System Interaction

During development, should the old Navigation HUD remain available?
Or should we hide/disable it and expose only the new plugin HUD?
Since you said this is meant to replace it, I’d suggest exposing the new HUD under a new button first, then remove the old once validated.
My proposed first implementation milestone would be:

### i think i only mention keeping the old one a few times now. how many more times do you want me to say keep the old one until we prove the new one.

Navigation internal plugin v1
  - plugin-shaped folder
  - new Redux slice for plugin state
  - new HUD
  - one workflow action: executeNavigationTurn
  - advances turn
  - can change system location
  - records outcome
  - does not depend on jumpNavigationSlice

For v1, I’d keep outcome deterministic unless you want risk immediately:




selected destination -> execute -> turn advances -> ship moves to destination


Then v2 adds plot/risk/outcome branching.
### this is V1 stop trying to make things easy on yourself 
 
