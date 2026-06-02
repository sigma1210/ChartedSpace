# System and Orbits

This document is the source of truth for how world data is used to populate and render a star system in 3D. Supporting files are in `Galaxy/systems/`.

---

## What We Can Derive from World Data

| Field | Derives |
|---|---|
| `stellar[]` | Number of stars, spectral class of each, system type (solitary/binary/trinary) |
| `STAR_HZ` lookup | Primary star's habitable zone orbit id |
| `uwp.size` | Main world diameter (size × 1,600 km); size 0 = asteroid belt |
| `uwp.atmosphere` | Atmosphere type for rendering |
| `uwp.hydrographics` | Surface type (ocean/land ratio) for procedural texture |
| `remarks` | Trade codes — refine surface palette and world archetype |
| `pbg.gasGiants` | Count of gas giants in the system |
| `pbg.belts` | Count of asteroid belts in the system |
| `worldsInSystem` | Total body count; subtract main world + gas giants + belts = other rocky worlds |
| `bases` | Naval / Scout / Way station infrastructure |

---

## What We Cannot Derive — Remaining Gaps

| Missing Data | Why We Need It |
|---|---|
| Orbital positions (AU) | Gas giants, belts, other rocky worlds — counts known, slots unknown until rolled |
| Companion star orbital separation | Spectral class is derivable; how far they orbit the primary is not |
| Other world sizes/types | worldsInSystem − 1 bodies exist but have no UWP |
| Moon/satellite systems | Count, size, position — nothing in the data |
| Axial tilt | Visual orientation of poles and rings |
| Rotation period | Day/night animation speed |
| Canonical overrides | Terra's real map, Sol's real planet layout |

---

## System Types

Derived from `stellar[]` entry count.

| Type | Stars | Layout |
|---|---|---|
| Solitary | 1 | Primary only |
| Binary | 2 | Primary + far secondary |
| Trinary | 3 | Primary + close dwarf companion + far secondary |

---

## Star Placement

- **Primary** (index 0) — always at center, no orbit
- **Close companion** (index 1, trinary only) — `proximity: "close"`, orbitId 0 (0.2 AU) by convention. Forms combined gravitational center with primary. No bodies orbit it independently.
- **Far companion** (index 1 binary / index 2 trinary) — `proximity: "far"`, high orbitId (orbit 16+). Bodies rotate between primary and far companion only.

---

## Main World Placement

Main world always has a direct relationship with the primary — either it orbits the primary directly, or its parent body does. Maximum one level of nesting.

| Case | Rule |
|---|---|
| Direct orbit | World placed at HZ orbit id from `STAR_HZ` lookup |
| Satellite + GG present | Gas giant placed at HZ orbit; main world in GG's `moons[]` |
| Satellite + no GG | Bigworld (`isParent: true`) placed at HZ orbit; main world in Bigworld's `moons[]` |
| Asteroid belt (`size = 0`) | Belt placed at its orbit without regard to HZ |

**Bigworld** — T5 Book 3 term for a large rocky body placed solely to host the main world as a satellite.

---

## T5 Book 3 Chart P1 — Placement Sequence

1. Place main world (rules above)
2. Place gas giants — rotate between primary and far companion
3. Place planetoid belts — rotate between primary and far companion
4. Place other worlds — rotate between primary and far companion

**Rotate Placement** — strictly alternating. Body 1 → primary, body 2 → far companion, body 3 → primary, etc. Close companion is excluded.

---

## Gas Giant Sizing (T5 Book 3 gg table — `gg.json`)

Roll 2D6 per gas giant. Result gives size code, diameter (miles), type, and gravity.

- Rolls 1–4 → SGG (Small Gas Giant)
- Rolls 5–12+ → LGG (Large Gas Giant)
- Every 2nd SGG in sequence → converted to IG (Ice Giant), same size

Gas giant type (SGG/LGG/IG) determines which column of the p2 table is used for orbit placement.

All brown dwarfs (BD) are size Y (250,000 miles diameter).

---

## Orbit Placement (T5 Book 3 p2 table — `p2.json`)

Roll 2D6 (DM sources pending). Result gives orbit slot for each body.

| Column | Relative to HZ? | Used for |
|---|---|---|
| LGG | Yes — add to HZ orbitId | Large gas giant |
| SGG | Yes — add to HZ orbitId | Small gas giant |
| IG | Yes — add to HZ orbitId | Ice giant |
| Belt | Yes — add to HZ orbitId | Planetoid belt |
| World1 | No — absolute orbitId | All other worlds except the last |
| World2 | No — absolute orbitId | The last other world placed |

Negative GG/Belt results → adjust to nearest valid orbit. Duplicate orbits → adjust to nearest available adjacent orbit.

---

## Orbital Animation

**Epoch** — Imperial year 1000, day 1.
**Game start** — Imperial year 1106, day 1 (38,690 days from epoch).

**Position formula:**
```
elapsedDays = (imperialYear - 1000) * 365 + imperialDay
periodDays  = AU^1.5 * 365   (adjust by stellarMass for non-Sol-type stars)
angle       = (360 / periodDays) * elapsedDays   mod 360
```

Orbital periods and stellar mass are never stored — derived at render time from `au` + spectral class.
Stellar mass lookup: add `STELLAR_MASS` table to `orbitData.ts` (same pattern as `STAR_HZ`).

**Two rendering modes:**
- **Distant system** — animated. Bodies move using elapsed Imperial time.
- **Current system** — static snapshot. Bodies positioned at current date, no celestial-scale animation.

---

## Data Source Vocabulary

| Value | Meaning |
|---|---|
| `"derived"` | Calculated from world UWP / PBG / stellar data |
| `"rolled"` | Generated by T5 Book 3 / CT Book 6 rules |
| `"canonical"` | Real-world or published Traveller data — overrides derived or rolled |

**Canonical override** — when a system has known published data (e.g. Sol, Terra), that data replaces any derived or rolled value. Every field in the schema supports override via `dataSource: "canonical"`.

---

## Supporting Files

| File | Purpose |
|---|---|
| `Galaxy/systems/orbits.json` | 20 orbit slots with fixed AU distances |
| `Galaxy/systems/gg.json` | Gas giant size/type table (2D6 roll) |
| `Galaxy/systems/p2.json` | Body orbit placement table (2D6 roll) |
| `Galaxy/systems/system-format.json` | Full schema with Terra as worked example |
| `Galaxy/systems/Regina_Spin_1910.json` | Canonical example — trinary system |
| `Galaxy/systems/placement-rules.md` | Detailed placement rules reference |
