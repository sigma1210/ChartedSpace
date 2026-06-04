# World generation caching
    The operations of creating both the world map and assigning world data to construct a solar system are expensive operations and we should take steps to cache this infomation

## systemdata caching 
    When a world is used the system.selector.ts as a redux selector -- 

    It was a mistake to embed the generation logic in the selector - the logic that creates the system map should exist within a thunk getSystemData

    getSystemData will be used to fill the system slice in the store 
    a system slice is a Record  Sector hex coordiate of the world as a key and the system data as the data. 
       the thunk should first query the DB through an api endpoint if there exist a pregenerated systemData for the world - if so use it to populate the system record for the world if it does not exist generate the data using the same method as the system.selectors.ts - this could occur on the server - with the need of the extra round trips 

## world data caching
    generating the world map is also expensive and a similar method as to cache the map if we could create a similar a server side tool to inspect the DB for an existing map - if so return it - if not generate store and retirn it 

lets discus this plan and how we can improve ot and execute on it    



## codex questions to REG 

Where should cached data live?

Do you want systemData and worldMapData stored directly as JSON columns on World, or in separate tables like WorldSystemCache and WorldMapCache keyed by worldId?

### separate tables keyby world id - let dis cus the merits of also keying by stle

Should generated cache be immutable per world, or versioned?
### yes immutable by world 

The map/system generators will keep improving. Should cache records include a generatorVersion, so old cached data can be regenerated when the algorithm changes?
### yes that will bust caches when needed 

Should system data and map data be cached separately?

### yes - 

My instinct is yes. A system orbit cache and a surface map cache have different shapes, costs, and invalidation needs.


Should the API generate on cache miss, or should it only read existing cache?
### generate on cache miss

The prompt suggests API generates on miss. That’s easiest for now. Longer term, we may want a background pre-generation tool.
### yes - we can also consider pregenertion events that could be fired when a world is targeted or set active - but before the data is request - let discus

Do we want server-side generation only?
### yes - if we need to we could move the expensive partsto rust and have it execute very quickly - a discussion for the futire

I think yes. Move expensive generation out of Redux selectors. The client asks /api/worlds/{sector}/{hex}/system or similar, and the server returns cached/generated JSON.

What should the cache key be?
You mention sector + hex. Since the DB has stable world.id, I’d probably use worldId internally and expose sector/hex externally if useful.

### that make sense but the ui will always need to identify a world by its sector hex coordinate

How should this interact with style/resource packs?
### yes - a least the map part. -discuss

For map cache, I think we should cache semantic map data, not rendered images or style colors. Then resource packs can render it differently later.
### yes

Do you want to cache rendered map textures too, or only the generated terrain/features?
### yes - but we may want to have a discussion of the possibility of using webGpu shaders 

My recommendation: cache semantic hex/terrain/feature data first. Rendered 2D SVG/canvas/globe textures can remain presentation-layer output.

Should cache generation be deterministic from world data?
It seems yes. If the same world + generator version is used, the result should be stable.

What is the first implementation target?
I’d start with systemData, because the selector is already doing too much and StarSystemView already consumes SystemData.
### yes I agree

My proposed execution shape:

Extract system generation from system.selectors.ts into a pure lib function.
Add systemData Json? plus systemDataVersion Int? to World, or create a separate cache table.
Add API endpoint that returns cached system data or generates/stores/returns it.
Add systemSlice with records: Record<string, SystemData>.
Add getSystemData(worldKey) thunk.
Update StarSystemView to read from systemSlice instead of generating via selector.
Repeat the same pattern for semantic world-map data later.

### I agree but ask question 



## codex questions to REG round 2

Cache table shape:
Do you want one generic cache table, like WorldGenerationCache, with kind: "system" | "map"?
Or two explicit tables: WorldSystemCache and WorldMapCache?
My preference: two explicit tables. The data shapes and versioning will probably diverge.
## 2 expicit tables


Style keying:
For systemData, I do not think style belongs in the cache key. It is semantic.
For worldMapData, I also think style should not be part of the first semantic cache key. Style should affect rendering, not terrain generation.
Question: are you imagining style-keyed cache only for rendered outputs, like map image/texture caches? ### i need clarification about this sentence

World lookup API:
Should the endpoint use:
/api/worlds/{sectorAbbr}/{hex}/system
### yes use this form - the ui does not know nir need to know worldid

or:

/api/worlds/{worldId}/system
I think the UI can call by sector+hex, and the server resolves worldId internally.


Redux key:
Should the systemSlice.records key be:
Spin:1910
or the DB world.id?
### ui alway uses Sector hex coordinates
Given your note, I’d use sectorAbbr:hex for the UI-facing Redux key.

Cache immutability wording:
When you say “immutable by world,” I think you mean: once generated for worldId + generatorVersion, it should not change.
But when generatorVersion changes, a new cache record can replace or supersede the old one. Correct?
### yes that is what i mean

Version handling:
When generator version changes, should the API:

ignore old cache and create a new row, keeping old rows, or
overwrite/delete old cache for that world?
My preference: keep only the current version unless we need debugging history.
### yes - there is no need for history


Generation on active/target world:
Should we add prefetch later only after the basic endpoint/thunk works?
### yes this is something we can wait on

My preference: yes. First make explicit load reliable, then add prefetch when activeWorld or targetWorld changes.


System selector migration:

Do you want to fully delete selectActiveWorldSystem after migration, or leave a compatibility selector that reads from systemSlice?

### I want selectActiveWorldSystem to derive its data from the systemSlice. 



I’d leave a selector with the same name if possible, but make it read cached Redux state instead of generating.
### agreed

Server-side generator location:
Should we extract the pure generator into something like:
src/lib/systemGeneration.ts
### yes -- the selctor is used by steelarSystem in the same directory
and have both the API and tests call that?

Database migration timing:
Are you ready for Prisma schema changes now, or do you want to first extract the generator and Redux slice before touching DB?
My recommended first phase is: extract pure system generator + tests, then add DB/API/thunk.

### agree on first phase - there should be no need to alter existing code - would that be your accessnent


## codex remaining questions for reg

My remaining questions before phase 1:

Should phase 1 be purely extraction?
Meaning: create src/lib/systemGeneration.ts, move generation helpers there, and keep selectActiveWorldSystem returning generated data exactly as it does today.
### yes - let make sure it works befor we replace a work - albeit slow process


Should SystemData types move too?
Right now the types live in system.selectors.ts. I think they should move to src/lib/systemGeneration.ts or maybe src/lib/systemTypes.ts, so API/slice/components can import them without importing a Redux selector file.
### yes 

Should we preserve the function name shape?
I’d suggest:

buildSystemData(world: World): SystemData
Does that name feel right?
### thats sound right - the hardest part of programing is naming variables

Do you want tests for the extracted generator in phase 1?
My preference: yes, a small regression test that verifies known worlds produce stable counts/orbits/stars.
### yes


Should phase 1 include deleting generation helper code from the selector file?
I think yes. The selector should become thin:
### yes the selector was bloated - it only job is to provide the write data -


export const selectActiveWorldSystem = (state) => {
  const world = selectActiveWorld(state);
  return world ? buildSystemData(world) : null;
};
Then phase 2 changes that same selector to read systemSlice.

Which known world should we use for a regression test?
Regina / Spin 1910 seems ideal if it is already present and meaningful.

### unsure O dont know if the local regina dat is correct - i know when i look at the system in 3d the view is correct- but i dont know if the view is using the data we have



## more question of codex to REG

I’m good on the direction. Only a few final questions before implementation:

Regression test source:
Instead of relying on Regina being “canonically correct,” should the test only verify stability/invariants?
Example: build system data for Regina or another Spin world and assert:
id, sector, hex, stars.length, orbits.length, counts, and that the main world exists.
That proves extraction did not change behavior without claiming the generated system is canon-perfect.

Test fixture choice:
Should I use the current active-looking known example Spin 1910 because it has a 3D view you trust visually, even if we only test stability?
My preference: yes.

### agreed

Type file split:
Do you prefer:

src/lib/systemGeneration.ts contains both types and builder, or:
src/lib/systemTypes.ts for types and src/lib/systemGeneration.ts for logic?

My preference: split them. StarSystemView can import types without dragging generator logic along.
### agreed

Phase 1 scope:
Should I stop after extraction + tests, or also update Prompts/WorldGenerationCache.md with the phase 1 plan/decision summary?

### update the This document as well


## Phase 1 decisions

Phase 1 should be a pure extraction/refactor step. It should not add database cache tables, API endpoints, or a Redux system slice yet.

The goal is to preserve the current working behavior while moving expensive system generation out of the selector file.

Implementation shape:

- Move `SystemData` and related system body/star/orbit types into `src/lib/systemTypes.ts`.
- Move the current system generation logic into `src/lib/systemGeneration.ts`.
- Expose the generator as `buildSystemData(world, options)`.
- Keep `selectActiveWorldSystem` in `src/store/selectors/system.selectors.ts`, but make it thin.
- The selector should locate the active world from Redux and call `buildSystemData`.
- Add regression/invariant tests using Spin 1910 / Regina.
- Tests should verify stability and basic structure, not claim canonical Traveller correctness.

The selector remains intentionally compatible during phase 1. Phase 2 can replace its implementation so it reads from a future `systemSlice` instead of generating directly.

No cache persistence is introduced in phase 1.


## Phase 2 decisions

Phase 2 adds a Redux system cache without adding database persistence yet.

Implementation shape:

- Add a `systemSlice`.
- Store generated system data in `records`.
- Use UI-facing cache keys in the form `{sectorAbbr}:{hex}`, such as `Spin:1910`.
- Add `getSystemData({ sectorAbbr, hex })`.
- In phase 2, the thunk still generates locally by calling `buildSystemData`.
- The thunk reads the world from already-loaded `galaxy.sectorData`.
- `selectActiveWorldSystem` now reads from `systemSlice` instead of generating.
- `StarSystemView` dispatches `getSystemData` when the active world changes and no current cache record exists.
- The existing procedural system rendering remains as the fallback while cached data is loading.

Important note:

Current `SystemData` includes turn-dependent orbital angles. To avoid freezing those angles after the first cache fill, the client cache records which turn generated each entry. A cache record can be reused within the same turn, but should refresh when `currentTurn` changes.

Phase 2 still does not add database tables or API endpoints. Phase 3 should replace local thunk generation with an API call that reads or writes the persistent server-side cache.


## Phase 3 decisions

Phase 3 adds server-side persistence for system generation.

Implementation shape:

- Add a `WorldSystemCache` Prisma table.
- Cache records are keyed by `worldId + generatorVersion`.
- The UI still requests system data by sector abbreviation and hex.
- Add `/api/worlds/{sectorAbbr}/{hex}/system`.
- The API resolves the world internally, checks the current-version cache, and returns cached data on hit.
- On cache miss, the API calls `buildSystemData`, stores the stable result, and returns it.
- `getSystemData` no longer generates locally. It fetches from the API and stores the returned data in `systemSlice`.

Turn handling:

Current system data includes orbital `angle0` values. The persistent cache should remain immutable for `worldId + generatorVersion`, so the database stores a stable epoch version. The API can rehydrate the cached data for the requested turn before returning it to the client.

This keeps the persistent cache independent of player turn state while still allowing the rendered system view to receive turn-aware orbital angles.

Cache invalidation:

- Increment the system generator version when generation rules change.
- The API ignores old-version rows and writes a current-version row on miss.
- Historical cache rows are not required by design.
- Version `2` is the first source-parity version that generates from sector JSON instead of reduced DB rows.

Phase 3 does not yet add map cache persistence. The same pattern can be repeated later for semantic world map data.

Known data-model follow-up:

The current `World` database table does not store every parsed sector JSON field. In particular, `bases` are not currently persisted. The system generator uses bases only for `system.infrastructure`, so the 3D layout is not affected, but server-generated cached `infrastructure` flags may be incomplete until either bases are added to the database schema or the server generator loads its source world data from the sector JSON/catalog layer.

Phase 3 source-data note:

Initial Phase 3 API wiring caused incorrect system layouts because server generation from the database world shape was not behaviorally identical to generation from the loaded sector JSON world shape.

The corrected Phase 3 API generates from the local sector JSON catalog, not from the reduced database world row. The server loads `Galaxy/sectors/{sectorAbbr}.json`, finds the world by hex, and passes that exact world shape to `buildSystemData`. The database row is still useful for resolving the stable `worldId` used by `WorldSystemCache`.
