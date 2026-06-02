# System Rendering — Implementation Summary

How the 3D system view builds and renders a star system from world data.

---

## Entry point

**Button:** "Updated System" in the `/map` header (next to the existing "System" button).  
**Component:** `UpdatedSystemDetailModal` → `StarSystemView`  
**Selector:** `selectActiveWorldSystem` in `src/store/selectors/system.selectors.ts`

The selector derives a complete `SystemData` object from the Redux galaxy state (sector JSON world record). No external JSON files are loaded — everything is computed from UWP, PBG, stellar, and bases fields using the p2 and gg roll tables with a seeded RNG, then positioned using Imperial calendar orbital mechanics.

---

## Data files used

| File | Location | Purpose |
|---|---|---|
| `p2.json` | `Galaxy/systems/` | Orbit placement table — offsets for GG/Belt (relative to HZ), absolute orbit IDs for worlds |
| `gg.json` | `Galaxy/systems/` | Gas giant roll table — SizeCode, Type (SGG/LGG), Diameter (miles), Gravity |
| `orbits.json` | `Galaxy/systems/` | Orbit ID → AU distance mapping (IDs 0–20) |

---

## Seeded RNG

Seed: `world.hex + world.name`  
Function: `seededRng` from `src/lib/orbitData.ts`

The same world always produces the same system layout. Roll order is fixed:

1. Parent gas giant gg.json roll (if satellite)
2. Remaining gas giants in order — gg.json roll + p2.json roll each
3. Belts in order — p2.json roll each
4. Rocky worlds in order — p2.json roll each

---

## Placement rules implemented

### 1. Main world

| Condition | Placement |
|---|---|
| `uwp.size === 0` | Asteroid belt at HZ orbit, direct |
| `pbg.gasGiants > 0` | Gas giant at HZ orbit; main world in `moons[]` as satellite |
| `pbg.gasGiants === 0` | Main world at HZ orbit, direct |

HZ orbit is looked up from `STAR_HZ` table in `src/lib/orbitData.ts` using the primary star's spectral class.

> **Bigworld case** (gasGiants === 0, world is a satellite of a rocky parent) is not yet implemented — falls back to direct orbit.

### 2. Gas giants

- Rolled on `gg.json` (2D6) → SizeCode, Type (SGG/LGG), Diameter (miles), Gravity
- Every 2nd SGG in the global sequence is converted to IG (Ice Giant)
- Orbit position rolled on `p2.json` (2D6) → offset relative to the host star's HZ; column chosen by type (LGG/SGG/IG)
- **Alternating rule:** GG 1 → primary, GG 2 → far companion, GG 3 → primary, …
- Parent gas giant (main world satellite) is always GG 1 → primary, placed at HZ (no p2 roll needed)

### 3. Belts

- Orbit position from `p2.json` Belt column → offset relative to host star's HZ
- Alternating rule applies

### 4. Rocky worlds

- Orbit from `p2.json` World1 column (absolute orbit ID) for all except the last, which uses World2
- Alternating rule applies
- Rocky worlds do NOT count natural satellites of worlds in their tally

### Reserved orbits

Before any rolls, the following are added to the primary system's used-orbit set:
- HZ orbit ID (occupied by main world or parent gas giant)
- Close companion star's orbit ID (orbit 0, 0.2 AU) — no body can land on the companion star

### Conflict resolution

If a rolled orbit ID is already occupied, the nearest free orbit is used (tries +1, −1, +2, −2, … up to ±10).

### Body count

```
otherRockyWorlds = worldsInSystem − 1 (main world) − pbg.gasGiants − pbg.belts
```

`worldsInSystem` counts all significant bodies in the system (main world, gas giants, belts, and other rocky worlds). It does **not** include stars or natural satellites.

---

## Star layout

Built by `buildLayoutFromSystemData` in `src/lib/stellarSystem.ts`.

| Star count | Layout |
|---|---|
| 1 | Single — primary at scene origin |
| 2 | Binary — primary + companion orbiting barycenter |
| 3 | Trinary — inner binary (primary + close companion) + far companion orbiting the pair |

**Inner binary separation** uses `orbitToScene(close.orbitId)` so the close companion sits at the correct visual scale relative to planet orbits.  
**Far companion separation** uses a fixed visual constant (`OUTER_SEP = 12` scene units) — the actual AU (e.g. 4900 AU) is not literally scaleable.

Star visual size is derived from `radiusScale` in `SystemData.stars[]`, normalised to `[MIN_VR, MAX_VR]`.

BD (brown dwarf) spectral handling: `parseStar("BD")` returns correct reddish-brown colours and 0.05 M☉ mass.

---

## Orbital mechanics — Imperial calendar snapshot

Source: `src/lib/orbitalMechanics.ts`

```
Epoch:           Imperial year 1000, day 1
Game start:      Imperial year 1106, day 1 = 38,690 elapsed days
Days per turn:   14 (2 turns per month)
elapsed days  =  38,690 + (currentTurn − 1) × 14

periodDays    =  AU^1.5 × 365 / √(stellarMass)
angle0        =  (2π × elapsed / period)  mod  2π
```

Stellar mass is looked up from spectral class via `spectralMass()` in `orbitalMechanics.ts`.

**Every orbiting body** has its `angle0` computed individually using its own AU distance:
- Primary system bodies use the primary star's mass
- Companion system bodies use the far companion's mass
- Companion stars themselves use combined system mass for their orbital period

The system view is a **static snapshot** — all bodies are frozen at their epoch-calculated position. Only planet axial spin continues to animate. No orbital motion occurs while the view is open.

---

## Rendering architecture

```
StarSystemView
├── SystemScene              — stars, frozen at epoch orbital angles
│   ├── BinaryScene          — groupRef frozen at epochAngles.outer
│   └── TrinaryScene         — outerRef frozen at epochAngles.outer
│                              innerRef frozen at epochAngles.inner
│   └── companionChildren    — companion system bodies, rendered INSIDE
│                              the companion's orbital group
└── WorldSystem              — primary system bodies
    └── orbits[]             — all bodies placed via p2/gg rolls,
                               each frozen at orbit.angle0
```

`systemData.orbits[]` — primary star system bodies (placed)  
`systemData.companionOrbits[]` — far companion system bodies (placed)  
`systemData.unplaced[]` — always `[]`; all bodies now have orbit IDs

---

## Scene scale

`orbitToScene(orbitId) = max(1.2, 1.5 + orbitId × 1.3)` scene units

Linear in orbit number (not AU) so inner and outer orbits are both visible.

| OrbitId | AU | Scene units |
|---|---|---|
| 0 | 0.2 | 1.5 |
| 3 | 1.0 | 5.4 |
| 4 | 1.6 | 6.7 |
| 6 | 5.2 | 9.3 |
| 8 | 20.0 | 11.9 |
| 11 | 154 | 15.8 |

---

## What is not yet implemented

| Rule | Status |
|---|---|
| Bigworld parent (gasGiants === 0, satellite world) | Not implemented — direct orbit used |
| Gas giant visual size from `sizeCode`/`diameterMiles` | Data stored in `SystemData` but renderer uses orbit position for visual size |
| T5 DM sources for p2/gg rolls | Not implemented — plain 2D6 with no modifiers |
| World identification / labels in 3D view | Not implemented |
