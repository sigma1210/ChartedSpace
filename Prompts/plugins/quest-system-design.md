# Quest System Plugin Design

## Status

This document records decisions made during the initial quest-system design discussion. It is a checkpoint for resuming the discussion later, not a complete implementation specification.

Last updated: 2026-08-09

## Prototype Implementation

- The quest system is implemented as the `core.quest` plugin.
- The prototype editor is available at `/system/quest/editor`, a sibling route to `/system/tactical`.
- Redux is the authoritative source for the quest document, loaded scenario occurrences, graph nodes and positions, flow connections, skill chains, tasks, selection, and active editor interactions.
- The prototype can load existing Tactical scenarios, discover their consoles and interactive humanoids, reuse a source scenario multiple times, manually position abstract graph nodes, add quest-specific skill chains, edit ordered skill checks and existing difficulty levels, create success links, and add victory endpoints.
- The editor now provides two Redux-backed graph views: `Quest Flow` and `Scenario Interactions`.
- `Quest Flow` contains one Quest Start node, scenario-instance nodes, and any number of Quest Victory nodes. Quest Start connects to the first scenario start. Each scenario victory connects to another scenario start or to a Quest Victory.
- `Scenario Interactions` remains the per-scenario graph of scenario start, console and interactive-humanoid interactions, skill-chain success links, and scenario victory nodes.
- Scenario victory names and descriptions are edited in Scenario Interactions and automatically appear as output connectors on the corresponding Quest Flow scenario node.
- Tactical navigation provides a link to the Quest editor, and the Quest editor links back to the Tactical map and Scenario editor.

## Scope

The event and questing system will be defined as its own plugin.

The plugin will include an editor that displays quest nodes and the flow between them. It must support branching quest structures, concurrent paths, dead ends, alternate routes to victory, quest items, and task chains.

Patron-specific behavior is deferred until a later design pass. The initial design work will focus on consoles and interactive humanoids.

## Editor Structure

- The editor has a `Quest Flow` graph showing complete scenario instances, their different victory endings, the links to subsequent scenario starts, one Quest Start node, and multiple possible Quest Victory nodes.
- The Quest Start node identifies the first scenario in the quest by connecting to that scenario's start.
- A scenario victory may connect to another scenario's start or to a Quest Victory node.
- A quest may contain several Quest Victory nodes representing different complete-quest endings.
- Scenarios are created independently in the scenario editor and exist before they are added to a quest.
- The quest editor can load preexisting scenarios created with the scenario editor.
- The same preexisting scenario may be used more than once within one quest line.
- Each use may define a different set of quest-specific skill chains for the scenario's entities.
- Each use tracks its node-completion state independently from every other use of that scenario.
- Each use also tracks its node and task-chain unlock state independently.
- After loading a scenario, the quest editor identifies the preexisting consoles and interactive humanoids defined by that scenario and makes them available as quest nodes.
- Each scenario has a graph editor showing its console and interactive-humanoid nodes and the flow between them. Patron nodes are deferred.
- For the initial version, this is an abstract node graph rather than a quest-flow overlay on the scenario map.
- Designers manually position nodes in the abstract graph, and the editor saves those graph coordinates.
- Each task chain has one success connector on the main scenario graph.
- Both success and critical-success chain results follow that same connector.
- Flow connections are success paths associated with a specific task chain rather than with the quest node as a whole.
- Failure and critical-failure outcomes do not have graph connectors.
- Each scenario victory endpoint appears as its own connectable node in the graph.
- Each scenario graph has a dedicated start node. Its outgoing connections define which quest nodes are initially unlocked.
- Selecting a node opens a separate editor for that node's ordered task chains.
- A quest overrides the existing skill/task-chain collection belonging to a scenario's console or interactive humanoid without changing the base scenario definition.
- The quest-defined chain collection replaces the entity's entire base collection in the quest context. It does not selectively merge, add, replace, or disable individual base chains.
- Base scenario skill chains are used only when the map is being playtested outside a quest.
- During quest gameplay, an entity uses its quest-defined skill chains and never falls back to its base scenario chains.
- A scenario console or interactive humanoid without a quest-defined skill-chain collection is unavailable for activation during quest gameplay.
- An unavailable entity appears as an ordinary environment object and displays no interaction prompt or disabled/locked quest indicator.
- A quest-configured entity whose node or task chains have not yet been unlocked follows the same rule: it appears ordinary and displays no interaction prompt until usable quest content becomes available.
- Once a node is unlocked, its entity displays an interaction prompt even if the current character cannot use any of its task chains.
- Attempting that interaction displays a customizable message explaining why a task chain is unavailable to the character.
- Unavailable messages are configured separately for each blocked task chain and its quest-item requirement rather than once for the entire node.
- If several task chains are blocked, the interaction displays all applicable unavailable messages.
- Blocked-chain messages are also displayed when one or more other task chains at the node are usable.
- When several task chains are usable, the player explicitly selects which chain to attempt; the system does not choose automatically.
- Before spending 6 AP, the player can inspect each available chain's complete ordered list of skill checks and their difficulty levels.
- Before selecting a chain, the player can also inspect exactly when each required quest item may be consumed, including consumption on attempt or on a configured outcome.
- Possible quest-item rewards and downstream node unlocks remain hidden until the task-chain outcome occurs.
- Other story effects, including interactive-humanoid relationship changes, also remain hidden until the outcome occurs.
- When the chain resolves, the result view explicitly shows the outcome level, quest items gained or consumed, newly unlocked objectives, and relationship changes.
- The quest designer may optionally provide a custom player-facing result message for each chain's critical-success, success, failure, and critical-failure outcome.
- If an outcome has no custom message, the system generates a fallback result message automatically.
- Whether custom outcome text appears alongside or replaces the explicit effect summary is deferred.

## Quest Graph

- A quest is represented as a graph of connected quest nodes.
- A quest node represents one of the following interactive entities:
  - a console
  - an interactive humanoid
  - a patron in a later version
- Console and interactive-humanoid nodes use the same task-chain and quest-flow mechanics. Patron behavior will be defined later.
- Interactive humanoids additionally retain the ability to become enemies or allies.
- Each task-chain outcome may configure an interactive humanoid's relationship to become `ally`, become `enemy`, or remain unchanged.
- An interactive humanoid's ally or enemy relationship applies to the whole party, not to individual characters.
- Becoming an ally or enemy is a permanent relationship change. Later task-chain outcomes cannot replace that state.
- That permanent relationship persists if the humanoid's scenario is used again later in the same quest line.
- Becoming an enemy does not directly start combat through the quest plugin. The normal encounter system handles combat behavior after the relationship changes.
- If the humanoid is killed or otherwise removed, later quest nodes linked to that humanoid are unavailable.
- The initial editor does not need to enforce an alternate victory route for every potentially unavailable humanoid. Avoiding an unintentionally unwinnable scenario is the scenario designer's responsibility.
- The editor must display these nodes and allow their connections and flow to be defined.
- A quest may provide many different paths to final victory.
- A quest may define several different victory endpoints; it does not require one dedicated final node.
- A successful task chain may unlock multiple downstream quest nodes through its single success connector.
- Players may pursue and complete multiple unlocked nodes concurrently.
- Some paths may lead to dead ends. Players can return to other available paths and try them instead.
- When a node has multiple incoming connections, its unlock rule is configurable rather than always using fixed `ANY` or `ALL` behavior.
- For now, quest nodes are unlocked by completion of other quest nodes.

## Quest Scenarios And Endings

- In the first version, a quest line may be started by an interactive humanoid. Patron-based quest starts will be defined later.
- Starting quests from random events during the turn lifecycle is planned for later and is outside the first-version scope.
- A quest scenario may have several victory endpoints.
- Different victory endpoints may produce different endings for the current scenario.
- A scenario ending may open a new path through additional quest scenarios, allowing several scenarios to form a larger quest line.
- For now, each scenario ending may link to at most one next scenario. It does not unlock several later scenarios concurrently.
- For now, only a victory ending may transition to the next scenario. Failure and critical-failure outcomes do not end the current scenario or link to another scenario.
- Victory unlocks the linked next scenario but does not immediately start it.
- When the next scenario is unlocked, the player is shown information about it.
- An unlocked scenario may require the party to move to another game location before it becomes available to start.
- Scenario activation is configurable. An unlocked scenario may:
  - become a selectable interaction that the player starts when ready
  - activate automatically in response to a configured game event
- Initial automatic trigger examples include jumping into a system and changing turns while at a location.
- For now, each scenario has exactly one configured activation trigger rather than several alternative triggers.

## Quest Conversations

- An interactive humanoid offers the initial quest through a conversation. Patron conversations will be defined later.
- In the first version, the conversation describes the first task and lets the player accept or decline the quest.
- Declining is not permanent. The player may return to the quest giver and accept the quest later.
- A more detailed conversation workflow may later determine whether a quest is offered or started based on how the conversation proceeds.

## Quest Log

- The quest log is a narrative history and must preserve enough information to describe the party's story through the quest.
- It records story-significant results rather than every individual skill-check roll. Significant results include task-chain outcomes, newly unlocked paths, quest-item events, relationship changes, and scenario endings.
- The system automatically generates quest-log entries from those significant results; the quest designer does not write a separate log entry for every result.
- Significant quest history should be retained as structured data so it may later support generated stories or comics about the party's adventures. Story and comic generation are outside the current scope.
- Only quests accepted by the player appear in the quest log.
- Declined quest offers are not added to the quest log.
- The whole party shares one quest log, matching the party's shared quest progression.
- The quest log displays only known and unlocked objectives. Future and undiscovered branches remain hidden.
- Completed objectives remain visible in the quest log as quest history.
- Discovered dead ends and failed objectives also remain visible and are marked with their outcomes.
- The quest log does not automatically record that an objective became unavailable because its linked humanoid was killed or removed.

## Player-Facing Content

- For the initial version, the quest designer provides player-facing names and descriptions for scenarios, nodes, task chains, tasks, and quest items.
- The automatic quest log uses this authored metadata when describing significant events.

## Nodes And Task Chains

- A node contains a collection of task chains.
- A node may offer several alternative task chains, providing several ways to complete it.
- Completing any one of the node's valid completion chains completes the node.
- A task chain is an ordered sequence of tasks.
- A complete task-chain attempt costs 6 AP.
- Individual tasks within the chain do not have separate AP costs.
- Once started, the entire task chain must be completed within the same turn.
- One character pays the 6 AP and performs every skill check in that attempt. Characters do not collaborate on checks within a single attempt.
- A different character may make a separate attempt later.
- Players may revisit task chains.
- A node may configure certain task chains to remain permanently unlocked after the relevant chain has been completed.
- A completed task chain may be repeated.
- Whether rewards and downstream unlock effects run again is configurable separately for each reward or effect.
- Once a task chain is unlocked, any party character may make a complete attempt. The chain is not permanently bound to the character who unlocked it.
- Losing or transferring the item that unlocked a chain does not interrupt a chain already in progress.

### Tasks

- Each task chain contains a preset, ordered list of skill checks.
- Each task may specify any skill available in the game's skill system.
- Each task has its own configured difficulty, selected from the game's existing skill-check difficulty levels. The quest plugin does not introduce a separate numerical difficulty scale.
- Apart from the chain-level AP cost, resource consumption is limited to configured quest items. Individual tasks do not directly consume other resource types.
- A task does not offer alternative skills. Different skill-based approaches are represented by alternative task chains within the node.

## Task-Chain Outcomes

For quest progression, the level of success is determined only when the complete task chain is resolved. The final result is calculated from the accumulated results of every task in the ordered chain; no individual task independently determines the quest outcome.

Tasks resolve in order according to these rules:

- A successful task advances the chain to its next task.
- A critically successful task advances the chain normally and grants a fixed +2 DM only to the immediately following task.
- A normal task failure immediately ends the task chain with a failure outcome.
- A critical task failure does not immediately end the chain. It advances to the next task and applies a fixed -2 DM only to that immediately following task.
- After a critical task failure, the chain can no longer produce a successful outcome.
- The negative DM makes a critical failure on the next task more likely. Carry-over DMs do not persist throughout the rest of the chain or accumulate across several tasks.
- If the chain reaches its end without entering a failed state, the final task's roll determines whether the chain outcome is success or critical success.
- If an earlier critical failure has made success impossible, the final task's roll determines whether the chain outcome is failure or critical failure. A carried -2 DM on that final roll makes critical failure more likely.

The four standard outcome states are:

- critical success
- success
- failure
- critical failure

Graph progression is intentionally success-focused. A task chain's single success connector may complete the current node and unlock one or more downstream nodes. Failure and critical-failure outcomes do not define graph transitions.

## Quest Items

- Quest items unlock task chains, not quest nodes.
- A node may offer a more difficult task chain when the character lacks an item and a different or easier chain when the character possesses the appropriate item.
- Completing a quest node may award one or more quest items for use later in the quest.
- The character interacting with the node must personally possess the item needed to unlock a task chain.
- Another character must receive the item before that character can use it to unlock the chain.
- Multiple copies of the same quest-item type may exist.
- Every copy is tracked as an individual item instance rather than as part of a quantity stack.

### Item Consumption

Item consumption is configured for each task-chain use within a node rather than globally on the quest-item definition.

The configuration may consume an item:

- when access is unlocked
- on each attempt
- on success
- on failure
- on critical failure

An item may also remain persistent and never be consumed, such as a key that can open several task chains.

### Item Ownership And Transfers

- Quest progress is shared by the party, but quest items are held by individual characters.
- Quest items may be transferred between characters during gameplay.
- Every transfer action moves one quest-item instance.
- Active character to active character:
  - the characters must be adjacent or occupy the same square
  - the receiving character spends 3 AP
- Inactive or incapacitated character to active character:
  - the characters must be adjacent or occupy the same square
  - the active receiving character spends 6 AP

### Item Skills And Dice Modifiers

- A quest item may require a skill to use effectively.
- A character without the required skill may use the item with negative dice modifiers (DMs).

## Shared Quest State

The following quest progression is shared by the party:

- unlocked nodes
- completed nodes and task chains
- quest effects and downstream unlocks

Each task-chain attempt is performed by one character in one turn, while its result becomes shared party progression. Quest-item custody remains character-specific even though quest progression is party-shared.

## Questions Still Open

The next editor question has not yet been selected.

Areas not yet fully defined include:

- the precise expression format for configurable node prerequisites
- advanced conversation workflows
- detailed editor interactions and validation
- whether custom outcome text accompanies or replaces the explicit effect summary
- the complete set of scenario activation triggers
- saving, loading, versioning, and debugging quest state
- the plugin's runtime and core-engine contracts

## Quest Editor Prototype

The first editor prototype is owned by the quest plugin and is available on the sibling route `/system/quest/editor`.

- Redux is the authoritative state for the quest document, selections, graph interactions, file workflow, open menus and dialogs, and HUD layouts.
- The editor uses the same shared 64-pixel editor header and the same floating, draggable, pinnable, closable HUD system as the Scenario Editor.
- The header provides consistent File, Quest, and View menus.
- The File menu supports New Quest, Open Quest, Save, Save As, and Delete Quest operations backed by versioned JSON quest definitions.
- The View menu can show or hide each HUD and reset the HUD layout. HUD positions and visibility are restored from browser storage into Redux.
- The graph canvas remains beneath the HUDs and provides two views:
  - Quest Flow: one Quest Start node, scenario-instance nodes, and any number of Quest Victory nodes.
  - Scenario Interactions: consoles, interactive humanoids, scenario start, and scenario victory nodes for one loaded scenario instance.
- Quest Flow links connect Quest Start to a scenario start, or a specific scenario victory to another scenario start or a Quest Victory.
- Each scenario victory has one outgoing connector in the quest graph. Creating a replacement link replaces its prior destination.
- The Quest Editor loads existing Scenario Editor definitions, discovers their placed consoles and interactive humanoids, and creates quest-specific skill chains. Original scenario chains remain playtest-only.
- The editor exposes separate HUDs for tools, the source scenario library, quest scenario instances, the inspector, graph links, and navigation back to the Scenario Editor or Tactical play.
- A compact Quest Items HUD owns the quest-level item catalog and only lists selectable item summaries. A separate Quest Item Editor HUD edits the selected definition. Selection is held in Redux. Each definition has a stable ID, player-facing name, description, icon reference, optional required skill, and unskilled-use DM.
- A selected task chain can require one or more individually tracked copies of a defined quest item. Each requirement independently configures consumption on unlock, attempt, success, failure, and critical failure; selecting no triggers makes the item persistent.
- A successful task chain can bestow a configurable number of copies, configure whether the reward repeats, and assign the copies to the performer, a player-selected recipient, or a specified character ID.
- Interaction graph chain rows display compact indicators for item requirements and success rewards.
- Deleting a referenced item requires confirmation and removes its requirement and reward references. Persistence validation rejects duplicate item IDs and dangling item references.

## Quest Playtesting

- The Quest Editor offers Playtest Quest and Playtest Scenario commands.
- A full-quest playtest enters at the scenario connected to Quest Start. A selected-scenario playtest enters at the selected scenario occurrence. Both modes use the same Redux quest runtime after entry.
- The playtest runs on the existing Tactical surface and loads each scenario's original map while replacing its console and interactive-human operations with the quest-authored task chains.
- During Tactical deployment, the tester may assign any number of individually tracked copies of any defined quest item to each participating character alongside ordinary equipment.
- Item requirements are checked against the character attempting the chain. Item skill requirements contribute their configured negative DM when that character lacks the required skill.
- A quest task chain costs six AP in total, remains with one character, and must finish in that activation. Critical-success and critical-failure carry modifiers only to the next task, and a critical failure makes success impossible for that attempt.
- Runtime item consumption and success rewards update Redux custody. Player-choice rewards remain pending until the tester assigns them to a participating character.
- A scenario victory follows its specific Quest Flow connector, loads the next scenario, or records Quest Victory. The playtest remains active until the tester explicitly returns to the Quest Editor.
