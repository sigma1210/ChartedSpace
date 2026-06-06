# HUD Style Contract

This document defines the first shared visual and interaction contract for ship HUDs in the system view. The goal is to make every HUD feel like part of the same ship interface instead of separate HTML panels placed into a Three.js scene.

## Intent

HUDs are diegetic ship-interface surfaces. They belong to the ship, not to the external scene. They should remain visually stable across normal system view, jump space, blank transitions, and future event scenes unless a specific scene disables or degrades their function.

HUDs should feel compact, technical, and interactive. They should avoid looking like generic web cards or browser form controls.

## Shared HUD Shell

Every HUD panel should use the same outer shell treatment:

- Dark translucent background with subtle blur.
- Thin luminous border using the active HUD accent color.
- Square or minimally rounded corners.
- Small controlled glow, never a large decorative aura.
- Compact padding.
- Monospace or technical display type.
- Uppercase labels only where they improve scanning.
- No nested card styling inside HUD panels.

The shell should support:

- Normal state.
- Focus or hover state.
- Disabled or no-signal state.
- Warning state.
- Critical state.

## Shared Header

Every movable HUD should use the same header pattern.

Header contents should be:

- Drag handle icon.
- Optional compact title or symbolic icon.
- Pin or unpin control.
- Close or hide control.

Header rules:

- Controls should be icon buttons where possible.
- Text labels should be avoided unless the HUD needs a human-readable title.
- Header height should be consistent across HUDs.
- Header should be the drag target when the HUD is unpinned.
- Dragging should never select text.

## Shared Controls

HUD controls should use a shared visual language:

- Icon buttons for pin, close, move, map, navigation, and tool toggles.
- Primary action buttons may use text when the action needs a clear command, such as a selected destination becoming the jump action.
- Disabled controls should remain visible but clearly inactive.
- Hover states should brighten border/text, not change layout.
- Active or selected states should use the accent color consistently.
- Dangerous or failed states should use a warning color, not the default accent.

Buttons should have stable dimensions so labels, icons, hover states, and state changes do not resize the HUD.

## Content Rules

HUD content should be dense but readable:

- Small type scale.
- Consistent row height.
- Consistent divider style.
- Consistent status indicators.
- Minimal explanatory text.
- No large headings inside compact HUDs.
- No browser-default inputs, buttons, or select elements without HUD styling.

The HUD should expose information through layout, icons, color, and concise labels rather than prose.

## Interaction Rules

All HUDs should share the same movement behavior:

- Pinned HUDs remain fixed relative to the user's view.
- Unpinned HUDs can be dragged by their header.
- Pinning stores the HUD at the current screen-relative position.
- Closing or hiding a HUD should be reversible through an existing HUD control.
- Text selection should be disabled during HUD interaction.

For the first implementation pass, HUD position can remain session-local. Later passes may persist layout preferences.

## Scene Rules

HUDs should remain visible across:

- Normal system view.
- Jump tunnel.
- Blank transition between jump and destination render.
- Destination system view.

Some HUDs may enter a degraded state while in jump space:

- Navigation can show plotted or unavailable state.
- Communications can show no-signal state.
- Mini map can remain visible but should not imply the ship has arrived at the destination.

Scene transitions should not recreate HUDs unless unavoidable. HUDs should feel like stable cockpit instruments while the outside scene changes.

## Reusable Components To Build

The next implementation pass should introduce shared HUD components before restyling individual HUDs:

- `HudPanel`: shared shell, sizing, state colors, and no-selection behavior.
- `HudHeader`: shared drag, pin, close, and optional title/icon layout.
- `HudIconButton`: shared icon button styling and accessibility labels.
- `HudActionButton`: shared primary/secondary text action button.
- `CameraPinnedHud`: shared camera-facing placement and drag/pin behavior.
- `HudDivider`: shared internal divider.
- `HudStatus`: compact status indicator for normal, disabled, warning, and critical states.

After these exist, migrate current HUDs in this order:

1. System controls HUD.
2. Navigation HUD.
3. Subsector mini map HUD.
4. Future jump/event HUDs.

## First Implementation Goal

The first code pass should not redesign every HUD's content. It should create the common shell, header, and controls, then migrate the existing HUDs without changing their feature behavior.

Once the HUDs share the same structure, visual refinement can happen globally instead of one panel at a time.
