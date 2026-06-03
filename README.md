# Charted Space

Traveller RPG companion app for exploring Charted Space, tracking worlds, systems, characters, ships, trade, and travel.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

This repo uses Next.js 16. Before changing Next.js app/router/framework code, read the relevant docs in `node_modules/next/dist/docs/` as noted in `AGENTS.md`.

## World Maps

The world map system is centered in:

- `src/lib/worldMap.ts` — Traveller Worlds-inspired geometry, terrain generation, feature placement, and display-priority helpers.
- `src/components/world/WorldMap.tsx` — crisp 2D interrupted world map.
- `src/components/world/PlanetGlobe.tsx` — equirectangular texture generation for 3D globes.
- `src/components/world/StarSystemView.tsx` — system-detail 3D view; main world uses the same globe texture path.

The 2D map and globe share deterministic terrain data. Display decluttering is handled by `visibleFeatures(hex)`, which preserves generated feature data but renders only the highest-priority visible symbol per hex.

Focused map tests:

```bash
pnpm test -- --runInBand src/lib/__tests__/worldMap.test.ts
```

## Project Notes

See `PROJECT_CONTEXT.md` for the living project context, implemented systems, map terrain vocabulary, and deferred follow-up work.

## Known Issue

`pnpm exec tsc --noEmit --pretty false` currently reports a pre-existing `NotificationsModal.tsx:69` `never` type error unrelated to the world map work.
