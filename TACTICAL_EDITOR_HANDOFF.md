# Tactical Editor Handoff

Workspace: `/Users/robertgillis/development/ChartedSpace`

The worktree contains substantial uncommitted editor work. Preserve it and do not reset unrelated changes.

## Agreed interaction model

Method Draw is the reference:

- A circle always remains a circle.
- A rectangle always remains rectangular.
- Only Pen-created paths expose nodes and curve handles.
- Geometric-shape-to-path conversion is not wanted.
- Surface fill, half-level elevation, boundary, and deployment use are independent properties.
- Do not infer additional features or make unrelated UI changes.
- Make one bounded, testable change at a time and distinguish automated checks from visual confirmation.

## Current implementation

- Pen supports straight and curved closed paths, post-close node editing, point insertion/deletion, and curve handles.
- Rectangle uses constrained movement and corner resizing.
- Circle uses constrained center and radius handles.
- Node Edit affects Pen paths only.
- Areas support surface, half-level elevation, boundary, and crew-deployment settings.
- Rectangle, Circle, and Pen interiors can all supply crew deployment cells through the existing deployment resolver.
- The legacy Deployment Zone 9x9 remains load-compatible for existing scenarios but is not offered by the editor.
- Nested areas support higher regions and depressions.
- Sand terrain and z-fighting corrections are implemented.
- CAD-style Layers and a horizontal tool HUD are implemented.
- Layer visibility, locking, ordering, and selection are implemented.
- Existing enemies are selectable and editable.
- Save As selection synchronization was fixed.
- Doors and iris valves work on straight walls, legacy circle walls, and Rectangle/Circle/Pen area-boundary walls.
- Consoles, Control Rooms, and Interactive Humans are available from the Interactions HUD group.
- The former Terrain Palette/Object Catalog and its launcher have been removed.
- A Drawing Settings button in the Tools HUD toggles a hidden-by-default section containing drawing precision, map width, and map height; opening another tool group closes it.
- Map dimensions have been removed from the left Properties sidebar.
- Legacy-circle compatibility controls now appear in a dedicated conditional Legacy Circle Properties HUD.
- The duplicate terrain and natural-terrain inventory has been removed from the left Properties sidebar; Layers is the single inventory and selection surface.
- The left Selected Placement card has been removed. Selecting a terrain placement reveals a contextual Rotate action in the Tools HUD, with `R` as its shortcut; movement remains direct manipulation and deletion uses Delete/Backspace.
- Existing liquid-hydrogen placements retain a conditional Filled toggle in the Tools HUD rather than the left sidebar.
- Header-menu migration phase 1 adds File → Open Scenario… with a modal scenario list, Default/Saved/Current badges, loading/empty/error states, keyboard dismissal, and the existing unsaved-change confirmation. The duplicate sidebar controls remain temporarily for review.
- Open Scenario search filters the fetched list locally by title or file ID, case-insensitively, with clear/no-match states and Arrow/Enter keyboard operation.
- Opening the scenario dialog keeps the cached list visible during its background refresh; the loading state is shown only when no cached scenarios are available.
- File → Save now updates an existing saved scenario, while File → Save As… opens a focused naming dialog and retains the existing non-overwrite behavior.
- File → New Scenario… confirms before discarding an unsaved draft, then creates and saves a genuinely empty scenario using the current map dimensions while preserving the viewport's current drawing precision. Empty console-victory operation lists are now valid for persistence and loading; such scenarios remain blocked from playtesting until a victory task is added.
- File → Delete Scenario… uses the existing permanent-deletion confirmation, returns to the immutable default, and refreshes the scenario list. All file lifecycle actions now live in the header File menu, and the duplicate Scenario files card has been removed from Properties.
- The header Scenario menu now owns Playtest Draft and Discard Draft Changes…. Discard requires confirmation before reverting to the loaded/saved baseline, and the duplicate global-action buttons have been removed from Properties; validation guidance remains in Properties.
- Scenario → Scenario Properties… now stages Title, Briefing, Objective, and crew deployment edges in an Apply/Cancel dialog. Apply validates deployment availability and enemy overlap before changing the draft; those global fields have been removed from Properties, leaving it for contextual selection details and validation guidance.
- The left Properties sidebar has now been removed entirely and the map/editor surface uses the full available width. Natural-terrain radius and legacy liquid-hydrogen fill remain available in a contextual Object Properties HUD; placement, validation, and missing-victory feedback now appears through a compact header Issues indicator and detail panel. Other selected objects retain Layers selection, direct manipulation, contextual HUDs where applicable, and Delete/Backspace removal.
- The full-width editor uses a constrained flex height chain (`flex`, `h-full`, and `min-h-0`) so Fit Map keeps the bottom edge inside the visible frame instead of allowing the canvas to grow beneath the clipped viewport.
- Terrain-heavy enemy phases now use indexed blocked cells and movement edges, a priority-queue pathfinder with parent-linked routes, and one reusable navigation index per uninterrupted phase. The index rebuilds only when door state changes.
- Defensive-reaction resumption no longer reruns enemy-phase initialization, morale recovery, covering-fire entry resolution, or the phase-start visibility snapshot.
- Prepared visibility checks reuse terrain, lighting, and spatial wall data. In local synthetic measurements, a 1,032-wall enemy route dropped from about 262 ms to 4 ms, and a 14-combatant visibility snapshot dropped from about 110 ms to 13 ms.
- Panic flight is bounded to legal destinations within the unit's current 6 AP allowance. It chooses the cheapest reachable complete-cover square, otherwise moves to the reachable square exposed to the fewest hostiles and farthest from the nearest hostile; the unit remains panicked when complete cover was not reached. This replaces the former full-map cover scan.
- Retained covering-fire snap prompts are now queued only when the shooter has a legal ranged target; an all-grey/no-target state advances directly to the next turn instead of presenting an unusable reaction HUD.

## Circle compatibility

- New ordinary circles use constrained area geometry.
- Existing non-portal circles migrate to constrained circles.
- Existing circle walls containing doors or iris valves remain in the legacy primitive model to avoid data loss.
- Legacy-circle controls are hidden during ordinary editing and appear only when the compatibility tool or a legacy circle is selected.
- Selecting the legacy-circle HUD tool or an existing legacy circle automatically opens the compatibility controls.

## HUD consolidation inventory

Ordinary placement is owned by the horizontal HUD:

- Boundaries: Wall, Curved wall, Door, Wall iris valve, Legacy circle wall.
- Areas: Rectangle area, Circle area, Pen.
- Nature & effects: Tree, Bush, Rock, Fire.
- Elevation: Stairs, Ladder, Ramp.
- Interactions: Control Room, Console 1x1, Interactive Human.

The Enemy Palette remains separate because enemy types are not ordinary terrain/drawing tools.

## Main files

- `src/app/system/tactical/editor/TacticalScenarioEditorClient.tsx`
- `src/app/system/tactical/editor/__tests__/TacticalScenarioEditorClient.test.tsx`
- `src/plugins/characterCombat/tacticalScenarioDefinitions.ts`
- `src/plugins/characterCombat/geometry.ts`
- `src/plugins/characterCombat/tacticalEnemyMovement.ts`
- `src/plugins/characterCombat/tacticalEnemyPhaseReducers.ts`
- `src/plugins/characterCombat/tacticalObservation.ts`
- `src/app/system/tactical/editor/tacticalEditorLayers.ts`
- `src/app/system/tactical/editor/TacticalEditorLayersPanel.tsx`

## Verification status

Latest completed checks:

- 872 tests passed across 91 suites.
- The focused editor component suite passed all 56 tests.
- ESLint passed for the changed tactical files.
- The production build passed.

Visual browser automation is unavailable in the current session. Distinguish automated coverage from the user's visual testing.
