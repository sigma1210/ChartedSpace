# Resource Pack Overview

This document captures future-facing ideas discussed while designing the avatar asset system. These ideas are not required for the first avatar implementation, but they describe a broader direction for customizable presentation across the game.

## Core Principle

Game data should remain semantic. Presentation should be resolved through a selected style or resource pack.

The app should store durable game meaning:

```text
avatar: human, female, athletic, scout clothing, black hair, green eyes, variant 04
terrain: mountain
feature: starport
ship: scout-courier, 100 tons, streamlined, turret 1
```

A resource pack decides how those meanings are rendered:

```text
classic avatar portrait
anime avatar portrait
Traveller-style mountain symbol
custom starport icon
classic scout-courier 3D model
```

This lets different users or campaigns see the same underlying game state through different visual styles.

## Avatar Packs

The avatar system is the first concrete use of this pattern.

The character stores semantic attributes and a variant number. The selected style resolves those attributes into an image path:

```text
/avatars/{style}/{species}/{attributeSlug}/{variant}.jpg
```

Example:

```text
/avatars/classic/human/female-athletic-scout-blackhair-greeneyes/04.jpg
/avatars/anime/human/female-athletic-scout-blackhair-greeneyes/04.jpg
```

This enables:

- Built-in default avatar packs.
- Developer-art placeholder packs.
- Artist-produced replacement packs.
- User-created custom avatar packs.
- Campaign-selected visual styles.
- Style changes without changing character identity.
- Future generated or CDN-hosted images served through the same path contract.

The app does not need to care how the images were produced, only that the assets satisfy the semantic path contract.

## Minecraft Resource Pack Analogy

This idea is similar to Minecraft resource packs, where the underlying game object remains the same but the visual representation changes.

The additional layer here is that resource packs can alter player and NPC avatar presentation while preserving the character's semantic identity.

For example, the same Traveller character could be displayed as:

```text
classic painted portrait
anime portrait
pixel art
lego-like figure
retro terminal icon
```

The character data remains unchanged.

## Map Presentation Packs

The world map system can eventually use the same pattern.

The generated map already has semantic terrain and feature data:

```text
terrain: ocean
terrain: mountain
feature: starport
feature: city
feature: crater
```

A map resource pack could define how those are drawn:

- Terrain colors.
- Ocean, land, ice, desert, lava, and exotic palettes.
- Feature symbol assets.
- Drawing rules for procedural symbols.
- Line colors and weights.
- Grid and outline styling.
- City, town, starport, and resource marker styling.
- Globe texture palette.
- Atmosphere, cloud, or haze treatment.
- Fallback symbols for unsupported features.

This would allow one user to view a classic Traveller-style map while another user views a richer illustrated, high-contrast, anime, pixel-art, or other custom style.

## 3D Globe Presentation

The current map texture and 3D globe work could also be style-pack driven.

Future resource packs might control:

- Globe terrain colors.
- Terrain texture overlays.
- Cloud texture behavior.
- Atmosphere color and opacity.
- City lights or settlement markers.
- Feature symbols projected onto the globe.
- 2D-map-specific and 3D-globe-specific overrides.

The world data remains semantic. The active visual style determines how it becomes a rendered globe.

## Starship Presentation

Starship views are another likely future use.

The ship's rules identity should remain semantic:

```text
hull: scout-courier
tonnage: 100
configuration: streamlined
turrets: 1
drive: maneuver-2
condition: worn
```

A resource pack could provide visual assets:

```text
classic/scout-courier/model.glb
anime/scout-courier/model.glb
hard-sci-fi/scout-courier/model.glb
lego/scout-courier/model.glb
```

Future starship resource packs could support:

- Custom 3D ship models.
- Custom textures and materials.
- Faction liveries.
- Damage overlays.
- Interior or cockpit styles.
- Deckplan skins.
- Map icons or silhouettes.
- Fallback models when a specific hull is unavailable.

This would let players or campaigns customize the visual feel of ships without changing the underlying rules data.

## Broader Feature Possibilities

A mature resource-pack system could eventually support:

- Avatar portraits.
- NPC portraits.
- World map colors and symbols.
- 3D planet textures.
- Starship models.
- Starship textures.
- Deckplans and interior visuals.
- Icons and UI symbols.
- Faction visual identity.
- Accessibility-focused visual packs.
- Campaign-specific art direction.
- User-installed custom style packs.
- Community or curated visual packs.

These are future ideas, not immediate requirements.

## Implementation Guidance

The first implementation should stay narrow and practical.

For avatars, use a deterministic path builder and pre-generated static assets. Do not build a broad resource-pack framework yet.

The useful architectural habit is to keep semantic data separate from presentation paths. If that boundary is preserved, the broader resource-pack system can be introduced later without rewriting core game data.

## Current Status

This is a future architecture note.

The immediate work remains:

- Generate first avatar image batches.
- Validate folder and filename conventions.
- Build avatar UI around semantic attributes and variant selection.
- Defer broader resource-pack support until the avatar pattern has been proven.

