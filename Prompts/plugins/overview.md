# Plugin And Workflow Architecture Overview

## Purpose

The plugin system is becoming part of the game engine, not just a folder structure for optional feature code.

The goal is to move from hardcoded feature workflows toward flexible game workflows that internal and future external plugins can observe, modify, suspend, block, or extend through clear contracts.

Jump navigation motivated the discussion, but the architecture is not jump-specific. The same model should support:

- stay-in-location / next-turn actions
- navigation and misjump workflows
- fuel purchase gates
- monthly expenses
- trade and cargo settlement
- docking and berthing fees
- maintenance and repairs
- customs inspections
- encounters, news, and social systems

## Core Responsibilities

Core owns stable engine responsibilities:

- time authority
- canonical location authority
- player/session context
- workflow runtime
- plugin registry
- deterministic event ordering
- commit authority
- persistence boundaries
- stable plugin bridge

Core should not own every domain rule. Credits, fuel, maintenance, trading, crew wages, news, and navigation behavior should be modeled as plugin-owned domains unless they become true engine primitives.

## Plugin Responsibilities

Plugins may own:

- private plugin state
- HUD registrations and HUD renderers
- player actions
- workflow event handlers
- effect proposals
- effect resolvers for their own domain
- debug/test harnesses for their own behavior

Internal plugins must also serve as reference implementations. They should use the same public plugin bridge and best practices expected of future plugin authors.

## Implemented Foundation

The current implementation includes:

- plugin manifest catalog
- plugin reducer registration under `state.plugins`
- plugin HUD layout registration
- plugin HUD renderer registration
- plugin action registration
- plugin workflow handlers
- plugin effect proposals
- plugin effect resolvers
- workflow debug checkpoints
- a bridge that lets the turn workflow invoke plugin handlers without importing plugin registries directly

The turn workflow currently supports these handler phases:

- `beforeTurnAdvance`
- `turnAdvance`
- `afterTurnAdvance`

Handlers can return:

```ts
{
  disposition: "continue" | "stop";
  reason?: string;
  effects?: PluginWorkflowEffect[];
}
```

The workflow collects effects, routes them through registered resolvers, records accepted/rejected/unresolved resolutions, and dispatches resolver-provided actions.

## Implemented Internal Plugins

### Stay In Location

The stay-in-location plugin is the first simple workflow plugin.

It owns:

- Next Turn HUD
- private plugin state for use counts and debug trace
- action that requests a turn-advance workflow
- debug-only before-turn handler that can block the workflow before commit

This proves:

- plugin-owned HUD/action/state shape
- plugin-private debug controls
- workflow invocation through a bridge
- stop-before-commit behavior
- serializable workflow trace checkpoints

### Economy

The economy plugin is the first resource-domain plugin.

It owns:

- Economy Ledger HUD
- ledger request log in private plugin state
- `economy.ledger.post` effect resolver
- monthly expense proposal handler
- comparison against the old monthly-cost deduction path

The ledger post resolver validates balanced ledger entries:

- at least two entries
- non-empty account ids
- finite nonzero changes
- sum of changes equals zero

The resolver can also evaluate funding metadata:

```ts
funding: {
  availableCredits: number;
  policy: "allowDebt" | "blockPayment";
}
```

Economy calculates:

- `fundingStatus`: `solvent` or `debt`
- `projectedBalance`
- selected `policy`
- `policyOutcome`: `accepted` or `blocked`

Debt policy is now economy-owned. A plugin may supply controlled inputs and a selected policy, but the economy resolver decides whether the ledger post is accepted or rejected.

### Expense Scenario

The expense scenario plugin is an internal test harness.

It owns:

- Expense Scenario HUD
- private scenario state
- controlled inputs:
  - mortgage amount
  - crew salary total
  - expected total
  - owner credits
  - debt policy
- action that sends a controlled `economy.ledger.post` request through the economy resolver

Results are displayed in the Economy Ledger HUD, not in a separate result panel.

This proves a useful test pattern:

```text
test harness plugin supplies controlled inputs
  -> domain plugin resolver owns validation/policy
  -> domain HUD shows result
```

## Implemented Economy Commit Bridge

The legacy monthly-cost path no longer performs the real credit deduction during the active turn lifecycle.

The economy plugin now owns the first real monthly expense commit path.

The bridge works like this:

```text
economy proposes monthly expense ledger post
  -> economy resolver validates the balanced ledger
  -> accepted production monthly post is recorded as pending
  -> Economy Ledger HUD exposes Commit Expense
  -> commit bridge patches owner character credits
  -> characters refresh
  -> ledger request becomes committed or failed
```

The first commit trigger is still manual so we can test one pending expense at a time. The mutation is real: it debits the owner-credit ledger entry from persisted character credits.

## Design Decisions In Discussion

### Ledger Lifecycle

We agreed that ledger validation and ledger commit should be separate concepts.

The ledger log now records explicit lifecycle fields:

```ts
validationStatus: "accepted" | "rejected" | "unresolved";
commitStatus: "notRequired" | "pending" | "committed" | "failed" | "blocked";
```

Why:

- a ledger post can be valid but not yet committed
- scenario/test posts may not require persistence
- real monthly expenses should eventually become pending commits
- commit failure should not be confused with validation rejection

The older `status` field is still retained for compatibility and summary display. Scenario/test ledger posts use `commitStatus: "notRequired"` because they are not meant to persist money movement. Production monthly expense ledger posts now declare a pending commit intent and appear as `commitStatus: "pending"`. Rejected ledger posts use `commitStatus: "blocked"`.

The economy ledger HUD includes the first real commit bridge. Pending requests can be manually committed, and the ledger records the owner-credit before/after note. Failed commits become `commitStatus: "failed"` with the error message.

### Transaction Pattern

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
- a real audit trail

### Workflow Blocking

Financial rejection should not automatically mean workflow stopped.

The workflow consequence must be explicit.

Examples:

- fuel payment rejected by debt policy may block a jump
- monthly mortgage debt may advance the turn but mark delinquency
- crew salary debt may create unpaid crew consequences
- docking fees might block departure or create port debt

This suggests a separate workflow intervention effect such as:

```ts
{
  type: "workflow.block";
  source: "core.economy";
  reason: "Fuel purchase blocked by debt policy";
}
```

Economy owns financial policy. The workflow or requesting plugin owns what that financial result means for the current workflow.

### Fuel As A Workflow Gate

Fuel expense is the clearest upcoming test for workflow blocking.

Possible flow:

```text
player attempts jump
  -> navigation/fuel plugin proposes fuel ledger post
  -> economy validates funding policy
  -> if fuel payment is blocked:
       workflow receives explicit block/suspend result
       jump does not proceed
  -> if fuel payment is accepted:
       jump workflow continues
       ledger post enters commit flow
```

This is different from monthly expenses because fuel may be a before-commit gate rather than after-turn settlement.

## Open Concerns

Important issues still to resolve:

- how to model workflow block/suspend effects
- how accepted ledger posts become pending commits
- how economy commits to persisted character credits
- how to handle partial payments
- how crew wage debt creates crew consequences
- how fuel, docking, mortgage, and salary policies differ
- how player confirmation works for allowed debt
- how multiple plugins contributing expenses in one workflow commit atomically
- how audit logs distinguish proposed, accepted, rejected, blocked, pending, committed, and failed states

## Guiding Principle

Core runs the workflow and owns final commit boundaries.

Plugins define domain behavior inside workflow windows.

Internal plugins must keep using the same bridge expected of future plugins so first-party systems do not become hidden special cases.
