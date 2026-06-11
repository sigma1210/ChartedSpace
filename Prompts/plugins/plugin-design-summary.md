# Plugin Design Summary

## Current Direction

The plugin system should become part of the game engine, not just a folder shape for feature code.

The first practical test is the stay-in-location plugin. It exposes a HUD action that advances time without changing location. This is useful because it tests the plugin/core boundary with a simple workflow before moving on to navigation, misjumps, customs, trading, and other richer systems.

The current implementation works, but it also reveals an important design concern: plugin code should not directly depend on core Redux slices, raw `RootState`, or core store internals. Even internal plugins should work through a stable bridge.

## Core Versus Plugin Responsibility

Core should own stable engine responsibilities:

- time authority
- canonical location authority
- player/session context
- workflow runtime
- plugin registry
- event ordering
- commit authority
- persistence boundaries
- stable plugin bridge

Core should not own every game-domain rule.

Systems such as expenses, monthly costs, crew wages, ship maintenance, news, customs, trade, and navigation are better treated as internal plugins. They may be first-party plugins, but they should still use the same bridge and event model that other plugins use.

This means "advance turn" is core, while "what happens when a turn advances" belongs to plugins.

## Plugin Bridge

Plugins should not reach into core slices directly.

Instead, core should expose a stable plugin API. Plugins ask for semantic facts and submit workflow intents or effects.

Example shape:

```ts
interface PluginCoreApi {
  getPlayerContext(): PlayerContext;
  getCurrentTurn(): number;
  getCurrentLocation(): LocationRef | null;
  getActiveShipRef(): EntityRef | null;

  dispatchWorkflow(intent: WorkflowIntent): Promise<WorkflowResult>;
  registerHud(hud: HudRegistration): void;
  subscribe(event: CoreEventName, handler: PluginEventHandler): Unsubscribe;
}
```

The plugin should not know whether core stores turn state in Redux, a database, a server action, or a workflow runtime. It should depend on the bridge.

For stay-in-location, the plugin should eventually request:

```ts
await core.dispatchWorkflow({
  type: "turn.advance",
  source: "plugin.stayInLocation",
  effects: [
    { type: "preserveLocation" },
    { type: "advanceTime", turns: 1 },
  ],
});
```

Core would then validate and commit the turn change, emit lifecycle events, and refresh or invalidate core state as needed.

## Expenses As A Plugin

Expenses should not be hardcoded as a core concern.

The expenses system should be an internal plugin that listens to turn events.

Example:

```ts
on("turn.afterAdvance", async (event, api) => {
  if (event.currentTurn % 4 !== 0) return;

  const ship = await api.entities.getActiveShip();
  const owner = await api.entities.getOwnerOperator(ship.id);
  const costs = calculateMonthlyCosts(ship, owner);

  return {
    type: "credits.decrement",
    characterId: owner.id,
    amount: costs.total,
    reason: "monthly-costs",
  };
});
```

This means stay-in-location does not know expenses exist. Navigation does not know expenses exist. Any workflow that advances time gives the expenses plugin a chance to react.

## Workflow And Event Model

A workflow should be treated as a structured engine process:

```text
player/plugin requests workflow
  -> core creates workflow context
  -> core emits ordered workflow events
  -> plugins inspect, validate, modify, suspend, or propose effects
  -> core resolves interventions
  -> core commits approved effects
  -> core emits completion events
```

Plugins should generally return proposals rather than mutating core state directly.

Core is the commit authority. It applies approved state changes, persists them, and decides when a workflow has actually advanced time, changed location, or completed.

## Deterministic Plugin Execution

Plugin execution order must be explicit and deterministic. It should not rely on import order.

A good model is phased priority execution.

For an event such as `turn.afterAdvance`, handlers are sorted by:

1. phase order
2. priority
3. plugin id as a stable tie-breaker

Example:

```ts
{
  pluginId: "core.expenses",
  event: "turn.afterAdvance",
  phase: "settlement",
  priority: 100,
  handler,
}
```

Suggested priority bands:

```text
0     core guards
100   major first-party domain plugins
500   normal plugins
900   UI and notification plugins
```

Lower priority numbers run earlier.

The engine sorting rule can be:

```ts
handlers.sort((a, b) =>
  a.phaseOrder - b.phaseOrder ||
  a.priority - b.priority ||
  a.pluginId.localeCompare(b.pluginId)
);
```

## Handler Capabilities

Ordering is not enough. Plugins also need clear limits on what they can do in each phase.

Two broad categories:

- Observers inspect events and emit notifications or HUD updates.
- Interceptors can propose changes, suspend workflows, veto, or supersede outcomes.

Interceptors should only be allowed in specific workflow phases, such as validation or before-commit phases.

Example phase rules:

```text
turn.beforeAdvance
  plugins may validate, warn, suspend, or add requirements

turn.commit
  core only; plugins do not mutate here

turn.afterAdvance
  plugins may propose follow-up effects such as expenses, encounters, news, maintenance

turn.complete
  mostly observers, notifications, HUD updates
```

## Effect Resolution

Plugins should return explicit effects.

Example:

```ts
[
  { type: "credits.decrement", source: "core.expenses", amount: 10000 },
  { type: "credits.decrement", source: "core.berthing", amount: 500 },
  { type: "workflow.suspend", source: "core.customs", reason: "inspection" },
]
```

Core then resolves effects by type and phase rules before committing them.

This keeps plugin behavior consistent. Plugins can be ordered, but they should not depend on hidden side effects from earlier plugins. They should depend on explicit context, explicit proposals, and explicit committed effects.

## Stay-In-Location Example

Target workflow:

```text
stayInLocation plugin requests turn.advance

core emits turn.beforeAdvance
  plugins validate or suspend if needed

core commits turn +1 and preserves location

core emits turn.afterAdvance
  expenses plugin checks whether costs are due
  maintenance plugin checks wear or damage
  news plugin publishes updates
  encounter plugins may schedule events

core resolves approved follow-up effects

core emits turn.complete
  HUDs and notifications update
```

The stay-in-location plugin should own:

- its HUD
- its private plugin state
- its player action
- the request to advance time while preserving location

It should not own:

- turn persistence
- direct character refreshes
- direct ship refreshes
- expenses
- lifecycle event dispatch internals
- core Redux slice access

## Navigation Plugin Implication

Navigation should follow the same model, but with a richer workflow.

Instead of directly changing the ship location, navigation should propose a workflow that may:

- advance time
- change location
- preserve location on failed jump
- misjump to another location
- apply risk outcomes
- suspend for confirmation or events

The same plugin bridge, event ordering, and effect resolution should apply.

## Guiding Principle

Core runs the workflow and owns the final commit.

Plugins define domain behavior inside the workflow windows.

Internal plugins should use the same bridge as future plugins so that first-party systems do not become hidden special cases.

## Internal Plugins As Reference Implementations

Internal plugins should also serve as guides for future plugin development.

They are not allowed to be lower-quality shortcuts simply because they are first-party code. They should model the standards expected of any plugin author.

Internal plugins should:

- use the public plugin bridge rather than private core internals
- keep private state inside their own plugin boundary
- register HUDs, handlers, actions, and effects through the standard registry
- return explicit workflow proposals and effects instead of mutating core state directly
- document the events they listen to and the effects they may emit
- follow current code, test, UI, and workflow best practices
- include focused tests for their workflow behavior
- avoid hidden dependencies on import order or global side effects

When plugin standards evolve, internal plugins should be reviewed and updated so they continue to represent the best available pattern.

This makes internal plugins both production features and living examples of plugin best practice.

## Current Handler Runtime

The first implementation pass has introduced a plugin handler surface and a conservative runtime integration for the turn workflow.

Plugin manifests now declare:

```ts
handlers: readonly PluginEventHandler[];
```

The initial handler shape is:

```ts
interface PluginEventHandler<Event = unknown> {
  id: string;
  pluginId: string;
  phase: PluginWorkflowPhase;
  order: number;
  handle(
    event: Event,
    context: PluginWorkflowContext,
  ): PluginWorkflowResult | Promise<PluginWorkflowResult>;
}
```

The first supported phases are:

- `beforeTurnAdvance`
- `turnAdvance`
- `afterTurnAdvance`

`src/plugins/handlerRegistry.ts` derives registered handlers from the manifest catalog and sorts them deterministically by phase, order, and handler id. The stay-in-location plugin currently registers no handlers; its empty handler list is intentional and establishes the manifest shape before behavior is migrated.

The turn workflow now invokes handlers through an installed phase runner rather than importing the plugin registry directly. This avoids circular imports between the stay-in-location plugin and the workflow it requests.

Current behavior:

- `beforeTurnAdvance` handlers run before the turn is committed.
- if a `beforeTurnAdvance` handler returns `{ disposition: "stop" }`, the workflow stops before advancing the turn.
- `afterTurnAdvance` handlers run after the turn has advanced and after the existing legacy turn lifecycle completes.
- handler discovery, handler start, handler completion, and handler stop events are emitted to the debug trace when debug mode is enabled.

The current handler result remains intentionally small:

```ts
{
  disposition: "continue" | "stop";
  reason?: string;
}
```

This proves ordering, tracing, stop-before-commit behavior, and human-readable stop reasons. It does not yet model effect proposals, suspensions, alternate outcomes, or follow-up workflow actions.

The stay-in-location plugin includes a debug-only `beforeTurnAdvance` handler that demonstrates stop-before-commit behavior. The HUD can enable a blocker toggle, the plugin action passes an explicit workflow metadata flag, and the handler returns `{ disposition: "stop", reason }` when that flag is present.

This keeps the handler from reading Redux state directly while still proving that plugin-private UI state can influence a workflow through an explicit workflow request.

## Trace-Only Effect Proposals

Handlers can now return trace-only effect proposals:

```ts
{
  disposition: "continue",
  effects: [
    {
      type: "debug.note",
      source: "core.somePlugin",
      description: "Observed a workflow condition",
      payload: { ... }
    }
  ]
}
```

The turn workflow collects these proposals and emits them into the debug trace with `pluginEffectsProposed`.

These effects are not committed yet. No reducer, persistence call, credit update, ship update, or location change is performed from these proposals. This pass only proves that plugins can propose explicit workflow effects and that the engine can surface those proposals deterministically.

The next effect step is to define allowed effect types and a resolver/commit phase. Expenses should wait for that resolver model rather than mutating character credits directly from a handler.

## Effect Ownership And Economy

Resource domains should be plugin-owned, not core-owned.

Core should not know the business rules for credits, cargo, fuel, maintenance, trade goods, or other resources unless they become true engine primitives. Core owns workflow orchestration and routing. Domain plugins own resource validation and eventual commits.

The first resource owner is `core.economy`.

The economy plugin is being shaped as a simple general ledger owner. Its first effect namespace is:

```ts
economy.ledger.post
```

The ledger post effect uses balanced account changes:

```ts
{
  type: "economy.ledger.post",
  source: "core.expenses",
  payload: {
    memo: "Monthly ship expenses",
    entries: [
      { accountId: "character:owner:credits", change: -10000 },
      { accountId: "sink:monthly-expenses", change: 10000 }
    ]
  }
}
```

The economy resolver validates:

- at least two entries
- non-empty account ids
- finite nonzero changes
- sum of changes equals zero

For now, the resolver is trace-only. It accepts or rejects proposed ledger effects and reports the resolution to the workflow trace. It does not mutate account balances, character credits, or ledger state yet.

This proves the ownership model:

```text
handler proposes effect
  -> workflow collects effect
  -> core routes effect by type
  -> owning plugin resolver validates it
  -> workflow trace records accepted/rejected/unresolved
```

The next economy step is a commit phase where accepted ledger posts are written into economy plugin state and, later, mirrored to the current character/ship credit data through an explicit bridge.

## Current Economy Logging Pass

The economy plugin now has a HUD and records resolver-approved ledger requests in plugin-private state.

Current behavior:

- the old monthly-cost handler still performs the real credit deduction
- the economy plugin listens to `afterTurnAdvance`
- on turns divisible by 4, it calculates monthly expenses from:
  - active ship mortgage, using the same ship type mortgage data as the existing API
  - active ship crew monthly salaries
- it proposes a balanced `economy.ledger.post` effect
- the economy resolver validates the ledger post
- the resolver returns a follow-up log action
- the workflow dispatches that action after tracing the resolution
- the Economy Ledger HUD displays the accepted/rejected/unresolved ledger request log
- the Economy Ledger HUD also displays comparison, funding, projected balance, policy, and policy outcome metadata when present

This means the economy plugin is currently an audit/comparison system, not the source of truth for credit mutation.

The workflow now supports a small legacy comparison bridge for monthly expenses:

```text
legacy monthly-cost handler commits the current deduction
  -> handler returns structured monthly expense metadata
  -> workflow keeps that observation
  -> economy plugin proposes and resolves its ledger post
  -> workflow asks the economy plugin to record the legacy observation
  -> economy plugin marks the ledger request as match, mismatch, or pending
```

This keeps the old deduction path from importing or knowing about the economy plugin. The legacy code only reports what happened. The economy plugin owns the comparison state and the Ledger HUD display.

The next economy step is to continue comparing logged requests against the old deduction path until the ledger output is trusted. After that, the economy plugin can become the commit authority for these expenses.

## Economy-Owned Funding Policy

Debt policy now belongs to the economy resolver, not to the scenario harness.

The `economy.ledger.post` payload may include funding metadata:

```ts
{
  type: "economy.ledger.post",
  source: "core.somePlugin",
  payload: {
    memo: "Fuel purchase",
    entries: [
      { accountId: "character:owner:credits", change: -1000 },
      { accountId: "sink:fuel", change: 1000 }
    ],
    funding: {
      availableCredits: 500,
      policy: "allowDebt" | "blockPayment"
    }
  }
}
```

The economy resolver calculates:

- `fundingStatus`: `solvent` or `debt`
- `projectedBalance`
- selected `policy`
- `policyOutcome`: `accepted` or `blocked`

If projected balance is negative and policy is `blockPayment`, the economy resolver rejects the ledger post with the reason `Ledger post blocked by debt policy`.

If projected balance is negative and policy is `allowDebt`, the ledger post can still be accepted. The accepted ledger request records debt metadata so the HUD and later commit phase can treat it appropriately.

This is an important boundary:

```text
scenario/navigation/fuel plugin supplies controlled funding inputs
  -> economy resolver owns financial validation and policy
  -> workflow decides what a rejected/blocked financial result means for the current workflow
```

## Expense Scenario Test Harness

The `core.expenseScenario` plugin is an internal test harness and reference implementation.

It owns:

- Expense Scenario HUD
- private plugin state
- mortgage amount input
- crew salary total input
- expected total input
- owner credits input
- debt policy selector
- run action that submits a controlled `economy.ledger.post`

The scenario plugin does not own ledger validation or debt blocking. It passes controlled inputs to economy and lets the economy resolver decide.

Results appear in the Economy Ledger HUD. This confirms the pattern:

```text
test harness plugin supplies controlled inputs
  -> domain plugin resolver owns behavior
  -> domain plugin HUD displays results
```

The current scenario harness has been manually verified for:

- matching expected total
- mismatching expected total
- solvent projected balance
- debt projected balance
- debt allowed
- debt blocked

## Ledger Lifecycle Design

We agreed that validation and commit should be modeled separately.

Current proposed shape:

```ts
validationStatus: "accepted" | "rejected";
commitStatus: "notRequired" | "pending" | "committed" | "failed" | "blocked";
```

Reasoning:

- a ledger post can be financially valid but not yet persisted
- scenario/test posts may not require persistence
- real monthly expenses should become pending commits
- commit failures should not be confused with validation rejection
- blocked workflow effects should not be confused with failed persistence

The current implementation still has the older `status` field for accepted/rejected/unresolved display. The next implementation pass should introduce the clearer validation/commit fields while preserving compatibility during migration.

## Transaction Pattern

The preferred long-term model is:

```text
plugin proposes ledger post
  -> economy validates
  -> accepted post is recorded as pending
  -> workflow reaches commit phase
  -> economy applies pending posts atomically
  -> result is recorded as committed, failed, or blocked
```

This supports:

- review/debug before commit
- multiple plugins contributing ledger posts in one workflow
- all-or-nothing commits
- rollback/failure handling
- workflow suspension before money moves
- a clear audit trail of proposed, accepted, rejected, blocked, pending, committed, and failed states

## Workflow Blocking And Fuel

Financial rejection should not automatically mean the whole workflow stops.

The consequence must be explicit and workflow-specific.

Fuel is the clearest upcoming test case because it is likely a jump gate:

```text
player attempts jump
  -> navigation/fuel plugin proposes fuel ledger post
  -> economy validates funding policy
  -> if fuel payment is blocked:
       workflow receives an explicit block/suspend result
       jump does not proceed
  -> if fuel payment is accepted:
       jump workflow continues
       ledger post enters commit flow
```

Monthly expenses are different: debt may advance the turn while marking delinquency or unpaid wages. Fuel may block jump before the workflow commits.

This suggests a future workflow effect such as:

```ts
{
  type: "workflow.block",
  source: "core.economy",
  reason: "Fuel purchase blocked by debt policy"
}
```

Economy owns financial validation. The workflow or requesting plugin owns the gameplay consequence of that financial result.

## Open Economy Questions

Remaining concerns:

- how accepted ledger posts become pending commits
- how economy commits to persisted character credits
- whether commits are all-or-nothing across multiple ledger posts
- how partial payments work
- how crew wage debt creates crew consequences
- how fuel, docking, mortgage, and salary policies differ
- how player confirmation works for allowed debt
- how workflow block/suspend effects are represented
- how audit logs distinguish validation, policy, and persistence outcomes

## Workflow Debug Trace

The stay-in-location plugin now includes the first workflow debugging surface.

This is intentionally trace-only. It does not pause, step, veto, or alter execution yet.

The plugin owns:

- a debug enabled flag
- recent workflow debug runs
- the active debug run id
- checkpoint records emitted by the workflow
- a HUD section for toggling debug mode, clearing traces, and inspecting the latest checkpoint list

The core turn workflow remains generic. It does not import the stay-in-location plugin. Instead, the plugin passes a serializable debug target:

```ts
debug: {
  enabled: true,
  checkpointActionType: recordStayInLocationWorkflowCheckpoint.type,
  workflowRunId,
}
```

When debug is enabled, the workflow dispatches serializable checkpoint actions at named points such as:

- `workflowRequested`
- `contextBuilt`
- `beforeTurnAdvance`
- `pluginHandlersDiscovered`
- `pluginHandlerStarted`
- `pluginHandlerCompleted`
- `pluginHandlerStoppedWorkflow`
- `turnCommitted`
- `legacyLifecycleComplete`
- `afterTurnAdvance`
- `refreshComplete`
- `workflowComplete`

This gives plugin authors and engine developers a concrete example of how a plugin can expose debugging tools without reaching into core workflow internals. The next debugging step would be a pause/step controller, but that should wait until workflow phases and handler effects are more stable.
