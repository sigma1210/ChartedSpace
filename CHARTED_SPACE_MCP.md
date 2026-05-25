# ChartedSpace MCP Server — Build & Usage Instructions

This document is a complete specification for building a Model Context Protocol (MCP) server
that lets a Claude agent play ChartedSpace autonomously. It covers every API endpoint, all
required tool definitions, auth setup, the agent system prompt, and configuration for both
Claude Desktop and Claude Code.

---

## What This Enables

An agent running via this MCP server can:
- Observe ship state, credits, cargo manifest, crew roster, and turn number
- Buy and sell cargo to make profit between worlds
- Hire and fire NPC crew to keep required roles filled
- Navigate between star systems (remain on world or jump)
- Survive financially across turns (pay mortgage + crew wages every 2 turns)

---

## Prerequisites

The ChartedSpace Next.js application must be running locally before the MCP server is used.

```bash
# In the ChartedSpace repo
DEV_MODE=true npm run dev
# App runs at http://localhost:3000
```

`DEV_MODE=true` bypasses Clerk authentication entirely. Every request is treated as the
single dev user (`clerkId: "dev_user_local"`). This is the correct auth approach for
MCP agent play — no session cookies or tokens needed.

---

## MCP Server Project Structure

Create a new directory alongside the ChartedSpace repo (or anywhere convenient):

```
charted-space-mcp/
├── package.json
├── tsconfig.json
└── src/
    ├── server.ts          ← main MCP server
    ├── client.ts          ← fetch wrapper for the ChartedSpace API
    ├── tools/
    │   ├── state.ts       ← get_ship, get_turn, get_characters, get_market
    │   ├── cargo.ts       ← buy_cargo, sell_cargo
    │   ├── crew.ts        ← get_available_crew, hire_crew, fire_crew
    │   └── navigation.ts  ← remain_on_world, jump_to, proceed_from_jump
    └── resources/
        └── gameState.ts   ← MCP resources (readable game state)
```

---

## Dependencies

```json
{
  "name": "charted-space-mcp",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx src/server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

---

## API Client (`src/client.ts`)

This wrapper adds `DEV_MODE` awareness. Because the ChartedSpace app runs with
`DEV_MODE=true`, no auth header is needed — all requests are accepted as the dev user.

```typescript
// src/client.ts
const BASE = process.env.CHARTED_SPACE_URL ?? "http://localhost:3000";

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
  },
  post: async (path: string, body?: unknown) => {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
  },
  delete: async (path: string) => {
    const res = await fetch(`${BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
  },
};
```

---

## Tool Definitions

### State tools (`src/tools/state.ts`)

#### `get_ship`
Fetches the full ship summary including crew and cargo.

**Endpoint:** `GET /api/ship`

**Response shape:**
```typescript
{
  ship: {
    id: string
    name: string
    type: string                      // "free_trader"
    jumpRating: number                // 1 (parsecs)
    status: "docked" | "in_jump"
    isMortgaged: boolean
    currentWorldId: string | null
    destinationWorldId: string | null // non-null while in jump
    jumpArrivesTurn: number | null    // turn number when jump completes
    worldName: string | null          // current world name
    sectorAbbr: string | null         // e.g. "Spin"
    hex: string | null                // e.g. "1910"
    cargoCapacity: number             // 82 tons for Free Trader
    crew: Array<{
      id: string
      role: "pilot" | "navigator" | "engineer" | "steward" | "gunner" | "medic"
      isOwnerOperator: boolean
      monthlySalary: number
      characterId: string | null      // null for NPCs
      characterName: string | null    // captain's character name
      npcName: string | null          // NPC hired hand name
      keySkillName: string | null     // e.g. "Navigation"
      keySkillLevel: number
    }>
    cargo: Array<{
      id: string
      commodity: string
      tons: number
      purchasePrice: number           // total paid (not per-ton)
      originWorldName: string | null
    }>
  } | null
}
```

**Implementation:**
```typescript
server.tool("get_ship", "Get the current ship state including crew and cargo", {}, async () => {
  const data = await api.get("/api/ship");
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});
```

---

#### `get_turn`
Returns the current turn number. Each turn = 2 weeks. Monthly costs fire at the end of every even-numbered turn.

**Endpoint:** `GET /api/turn`

**Response:** `{ currentTurn: number }`

---

#### `get_characters`
Returns all saved characters for the dev user.

**Endpoint:** `GET /api/characters`

**Response shape:**
```typescript
{
  items: Array<{
    id: string
    name: string
    upp: string                 // hex string e.g. "77A986"
    strength: number
    dexterity: number
    endurance: number
    intelligence: number
    education: number
    socialStanding: number
    credits: number             // can be negative (debt)
    skills: Array<{ name: string; level: number }>
    worldName: string | null
    sectorAbbr: string | null
    hex: string | null
  }>
}
```

---

#### `get_market`
Returns commodity prices at the ship's current world. Only works when ship is docked.

**Endpoint:** `GET /api/ship/market`

**Response shape:**
```typescript
{
  worldName: string
  tradeCodes: string[]          // e.g. ["Ag", "Ni"]
  basePricePerTon: number       // before skill modifier
  skillModifier: number         // multiplier from crew trade skills (currently always 1.0)
  pricePerTon: number           // final purchase price per ton
  tradeSkills: {
    broker: number; streetwise: number; admin: number; steward: number
  }
  remainingCapacity: number     // tons available in hold
}
```

The trade codes on the market response are the **origin** codes — they describe what this
world produces and therefore what will sell well elsewhere. Buy here if the codes indicate
surplus production (Ag, In, etc.). To estimate sale price at a destination, you need the
destination world's trade codes (load them from the public sector JSON files).

---

### Cargo tools (`src/tools/cargo.ts`)

#### `buy_cargo`

**Endpoint:** `POST /api/ship/cargo`

**Request body:**
```typescript
{ commodity: string; tons: number }
```

- `commodity` must be a non-empty string — use the trade code from the current world (e.g. `"Ag"`, `"In"`) or `"General"` for unspecified goods.
- `tons` must be a positive integer ≤ remaining hold capacity.
- The owner's credits are debited atomically. The purchase will fail if credits are insufficient.

**Response:**
```typescript
{
  cargoLot: { id: string; commodity: string; tons: number; purchasePrice: number }
  newCredits: number
}
```

Note: `purchasePrice` in the response is the **total** cost paid (tons × pricePerTon).
The `id` returned here is the `lotId` needed to sell later.

**Errors:**
- `400 "Ship must be docked to buy cargo"` — must be docked.
- `400 "Only Nt remaining in hold"` — not enough space.
- `400 "Insufficient credits"` — owner cannot afford it.

---

#### `sell_cargo`

**Endpoint:** `POST /api/ship/cargo/{lotId}/sell`

No body required. Ship must be docked.

**Response:**
```typescript
{
  saleProceeds: number      // credits added to owner
  salePricePerTon: number   // price per ton at this world
  profitLoss: number        // saleProceeds minus purchasePrice
}
```

The sale price is calculated from the **origin world's trade codes** vs the **current world's
trade codes** using the MARKET_DEMAND_TABLE. This is automatic — just call the endpoint.
A positive `profitLoss` means you made money. A negative value means you sold at a loss.

---

### Crew tools (`src/tools/crew.ts`)

The ChartedSpace app generates the available crew pool client-side from a 2,500-entry library
(`crewLibrary.json`). The MCP server does not have access to this pool. The agent should
provide reasonable NPC details directly when hiring.

**Required crew roles for a Free Trader:**
- `pilot` — requires Pilot skill (key: `"Pilot"`)
- `navigator` — requires Navigation skill (key: `"Navigation"`)
- `engineer` — requires Engineering skill (key: `"Engineering"`)
- `steward` — requires Steward skill (key: `"Steward"`)

**Salary formula:** base salary + (Cr1,000 × skill level)

| Role | Base salary |
|------|-------------|
| pilot | Cr6,000 |
| navigator | Cr5,000 |
| engineer | Cr4,000 |
| steward | Cr3,000 |
| gunner | Cr2,000 |
| medic | Cr2,000 |

---

#### `hire_crew`

**Endpoint:** `POST /api/ship/crew`

**Request body:**
```typescript
{
  role: string           // "pilot" | "navigator" | "engineer" | "steward" | "gunner" | "medic"
  npcName: string        // any name string
  keySkillLevel: number  // 0, 1, 2, or 3 — affects salary; 0 = minimum qualified
  replaceCrewId?: string // if provided, fires this NPC before hiring the new one
}
```

**Response:** `{ ok: true }`

**Recommended agent strategy:** hire at skill level 1 for balance of cost and competence.
Skill level 0 is the minimum to fill a role but makes navigation/jump rolls harder.

---

#### `fire_crew`

**Endpoint:** `DELETE /api/ship/crew/{crewId}`

Cannot fire the owner-operator (the player's character). Only NPC crew can be fired.

**Response:** `{ ok: true }`

---

### Navigation tools (`src/tools/navigation.ts`)

The ChartedSpace TurnCard performs dice rolls client-side to simulate navigation and jump
drive checks before calling `POST /api/turn/advance`. The MCP server has two options:

**Option A — Simulate the dice rolls (recommended for realistic play):**
Roll 2D6 + navigator DM for the course plot (target varies by attempt: 4, 6, 8).
Roll 2D6 + engineer DM for the jump drive check (target 4).
Only call `jump_to` if both checks succeed. On failure, call `remain_on_world` instead.

The DMs are derived from crew skills:
```
navDM = (navigator.skills["Navigation"]?.level ?? 0) + statDM(navigator.intelligence)
engDM = (engineer.skills["Engineering"]?.level ?? 0) + statDM(engineer.education)

statDM table:
  1-2  → -2
  3-5  → -1
  6-8  →  0
  9-11 → +1
  12-14 → +2
  15   → +3
```
Course plot: up to 3 attempts at targets [4, 6, 8]. First roll uses target 4, second uses 6,
third uses 8. If all three fail, the jump is aborted and the turn is spent docked.
Jump drive check: roll 2D6 + engDM, need ≥ 4. Failure = misjump (stays docked for that turn).

**Option B — Skip dice, go straight to the API (simpler but unrealistic):**
Just call the endpoints directly. The server does not enforce the navigation/drive checks.

---

#### `remain_on_world`

Advances the turn while staying at the current world.

**Endpoint:** `POST /api/turn/advance`

**Request body:**
```typescript
{
  shipUpdate: {
    status: "docked",
    currentWorldId: string   // the ship's currentWorldId from get_ship
  }
}
```

**Response:** `{ currentTurn: number }`

After calling this, check if `currentTurn % 2 === 0`. If so, call `settle_wages` to pay
mortgage and crew (the turn event handler does this automatically in the browser app, but
the MCP server must call it explicitly).

---

#### `jump_to`

Initiates a jump to another world within jump range.

**Precondition:** Ship is docked. Credits ≥ Cr10,000 (fuel cost). All required crew slots
filled. Navigation and drive checks passed (if using Option A dice simulation).

**Endpoint:** `POST /api/turn/advance`

**Request body:**
```typescript
{
  shipUpdate: {
    status: "in_jump",
    destinationWorldHex: string          // e.g. "1811"
    destinationWorldSectorAbbr: string   // e.g. "Spin"
    jumpArrivesTurn: number              // currentTurn + 1
  }
}
```

The server resolves the destination hex + sectorAbbr to a database World ID automatically.
The server also deducts the Cr10,000 fuel cost atomically from the owner's credits.

**Response:** `{ currentTurn: number }`

The fuel deduction happens inside this endpoint — do not deduct it separately.
After a jump, the ship status becomes `"in_jump"` and the agent must wait and call
`proceed_from_jump` on the next turn action.

---

#### `proceed_from_jump`

Completes the jump — the ship arrives at the destination world.

**Precondition:** Ship is `"in_jump"`. This is the only valid action while in jump.

**Endpoint:** `POST /api/turn/advance`

**Request body:**
```typescript
{
  shipUpdate: {
    status: "docked",
    currentWorldId: string   // ship's destinationWorldId from get_ship
    jumpArrivesTurn: null
  }
}
```

Note: you must pass `currentWorldId` = the ship's current `destinationWorldId`. Fetch ship
state first to get this value.

**Response:** `{ currentTurn: number }`

After arrival, call `settle_wages` if `currentTurn % 2 === 0`, then sell cargo if profitable.

---

#### `settle_wages`

Pays the monthly mortgage and all NPC crew salaries. Must be called by the agent every time
the turn number becomes even (i.e., after any turn advance where `currentTurn % 2 === 0`).

In the browser app this happens automatically via the turn event handler system. The MCP
server does not have that system, so the agent must call this endpoint manually.

**Endpoint:** `POST /api/ship/crew/settle-wages`

**Response:**
```typescript
{
  total: number           // total Cr deducted (mortgage + all salaries)
  newCredits: number      // owner's new credit balance (may be negative)
  quit: string[]          // names of NPC crew who quit due to non-payment
  unpaidCrew: string[]    // names of NPC crew who stayed despite non-payment
}
```

**Quit probability:** If the owner cannot pay, each NPC crew member rolls 2D6. If the roll ≤
(`unpaidTurns + 2`), they quit. First missed payment: ~2.8% chance of quitting. Fifth missed
payment: ~58% chance. Seventh: ~72%. Crew who quit disappear immediately — the ship may lose
required roles, making jump impossible until replacements are hired.

---

## Resources

MCP resources are read-only data sources the agent can `read` without using a tool.
Implement them for convenience so the agent can reference game rules without calling tools.

```typescript
// Implement as MCP resources with these URIs:
"charted-space://rules/traveller"       // summary of Traveller mechanics relevant to play
"charted-space://rules/trade"           // trade code demand table and pricing formula
"charted-space://rules/salary-table"    // crew roles, required skills, base salaries
"charted-space://rules/turn-loop"       // turn sequence, monthly costs, jump flow
```

The content of these resources is the "Game Rules for the Agent" section below.

---

## Main Server (`src/server.ts`)

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { api } from "./client.js";

const server = new Server(
  { name: "charted-space", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

// ─── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  { name: "get_ship",            description: "Get current ship state, crew, and cargo manifest" },
  { name: "get_turn",            description: "Get the current turn number" },
  { name: "get_characters",      description: "Get all saved characters and their credit balance" },
  { name: "get_market",          description: "Get commodity prices at the current docked world" },
  { name: "buy_cargo",           description: "Buy cargo at the current world (ship must be docked)",
    inputSchema: {
      type: "object",
      properties: {
        commodity: { type: "string", description: "Trade code or commodity name e.g. 'Ag', 'General'" },
        tons:      { type: "number", description: "Number of tons to buy (positive integer)" },
      },
      required: ["commodity", "tons"],
    },
  },
  { name: "sell_cargo",          description: "Sell a cargo lot at the current world (ship must be docked)",
    inputSchema: {
      type: "object",
      properties: {
        lotId: { type: "string", description: "The cargo lot ID from the ship's cargo array" },
      },
      required: ["lotId"],
    },
  },
  { name: "hire_crew",           description: "Hire an NPC crew member",
    inputSchema: {
      type: "object",
      properties: {
        role:          { type: "string", enum: ["pilot","navigator","engineer","steward","gunner","medic"] },
        npcName:       { type: "string", description: "Name for the NPC" },
        keySkillLevel: { type: "number", description: "Skill level 0-3 (affects salary)" },
        replaceCrewId: { type: "string", description: "Optional: ID of existing NPC to fire first" },
      },
      required: ["role", "npcName", "keySkillLevel"],
    },
  },
  { name: "fire_crew",           description: "Fire an NPC crew member",
    inputSchema: {
      type: "object",
      properties: {
        crewId: { type: "string", description: "The crew member ID from the ship's crew array" },
      },
      required: ["crewId"],
    },
  },
  { name: "remain_on_world",     description: "Advance the turn while staying at the current world" },
  { name: "jump_to",             description: "Jump to another world (advances turn, deducts Cr10,000 fuel)",
    inputSchema: {
      type: "object",
      properties: {
        destinationWorldHex:        { type: "string", description: "4-digit hex code e.g. '1811'" },
        destinationWorldSectorAbbr: { type: "string", description: "Sector abbreviation e.g. 'Spin'" },
      },
      required: ["destinationWorldHex", "destinationWorldSectorAbbr"],
    },
  },
  { name: "proceed_from_jump",   description: "Arrive at the destination world (only valid while in jump)" },
  { name: "settle_wages",        description: "Pay monthly mortgage and crew wages (call when turn becomes even)" },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const name   = req.params.name;
  const args   = req.params.arguments ?? {};
  let result: unknown;

  try {
    switch (name) {
      case "get_ship":
        result = await api.get("/api/ship");
        break;
      case "get_turn":
        result = await api.get("/api/turn");
        break;
      case "get_characters":
        result = await api.get("/api/characters");
        break;
      case "get_market":
        result = await api.get("/api/ship/market");
        break;
      case "buy_cargo":
        result = await api.post("/api/ship/cargo", { commodity: args.commodity, tons: args.tons });
        break;
      case "sell_cargo":
        result = await api.post(`/api/ship/cargo/${args.lotId}/sell`);
        break;
      case "hire_crew":
        result = await api.post("/api/ship/crew", {
          role:          args.role,
          npcName:       args.npcName,
          keySkillLevel: args.keySkillLevel,
          replaceCrewId: args.replaceCrewId,
        });
        break;
      case "fire_crew":
        result = await api.delete(`/api/ship/crew/${args.crewId}`);
        break;
      case "remain_on_world": {
        const { ship } = await api.get("/api/ship");
        result = await api.post("/api/turn/advance", {
          shipUpdate: { status: "docked", currentWorldId: ship.currentWorldId },
        });
        break;
      }
      case "jump_to": {
        const { currentTurn } = await api.get("/api/turn");
        result = await api.post("/api/turn/advance", {
          shipUpdate: {
            status:                     "in_jump",
            destinationWorldHex:        args.destinationWorldHex,
            destinationWorldSectorAbbr: args.destinationWorldSectorAbbr,
            jumpArrivesTurn:            currentTurn + 1,
          },
        });
        break;
      }
      case "proceed_from_jump": {
        const { ship } = await api.get("/api/ship");
        result = await api.post("/api/turn/advance", {
          shipUpdate: {
            status:         "docked",
            currentWorldId: ship.destinationWorldId,
            jumpArrivesTurn: null,
          },
        });
        break;
      }
      case "settle_wages":
        result = await api.post("/api/ship/crew/settle-wages");
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }

  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

// ─── Resources ───────────────────────────────────────────────────────────────

const RULE_RESOURCES = [
  { uri: "charted-space://rules/traveller",   name: "Traveller Rules",    mimeType: "text/plain" },
  { uri: "charted-space://rules/trade",       name: "Trade Rules",        mimeType: "text/plain" },
  { uri: "charted-space://rules/salary-table",name: "Crew Salary Table",  mimeType: "text/plain" },
  { uri: "charted-space://rules/turn-loop",   name: "Turn Loop",          mimeType: "text/plain" },
];

server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: RULE_RESOURCES }));

server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
  const uri = req.params.uri;
  const text = RESOURCE_CONTENT[uri] ?? "Resource not found.";
  return { contents: [{ uri, mimeType: "text/plain", text }] };
});

// Resource content is defined in the "Game Rules for the Agent" section below.
// Paste it into RESOURCE_CONTENT as a Record<string, string>.
const RESOURCE_CONTENT: Record<string, string> = {
  "charted-space://rules/traveller": TRAVELLER_RULES,
  "charted-space://rules/trade":     TRADE_RULES,
  "charted-space://rules/salary-table": SALARY_TABLE,
  "charted-space://rules/turn-loop": TURN_LOOP_RULES,
};

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Game Rules for the Agent

These strings go in the `RESOURCE_CONTENT` map and also form the agent's system prompt.

### TRAVELLER_RULES

```
You are playing Classic Traveller, a science-fiction RPG set in the Third Imperium.
You control a Free Trader (Type A) and its captain. Your goal is to make profit by
trading cargo between star systems while keeping your ship operational.

SHIP STATS (Free Trader Type A):
- Jump Rating: 1 parsec per jump
- Cargo Capacity: 82 tons
- Monthly Mortgage: Cr150,920 (if mortgaged, which it is by default)
- Fuel Cost Per Jump: Cr10,000

TURN STRUCTURE:
- Each turn = 2 weeks of in-game time
- Every 2 turns = 1 month (monthly costs apply at the end of each even turn)
- While docked: choose to remain on world or jump to another world
- While in jump: you must proceed (arrive) on your next action

CREDITS:
- The captain's credits can go negative (debt is allowed)
- Negative credits mean you are in debt — prioritise selling cargo or staying docked
- Monthly costs (mortgage + crew wages) fire at end of every even-numbered turn

JUMP READINESS:
Before jumping, verify:
1. Ship is docked
2. Owner credits ≥ Cr10,000 (fuel cost — deducted automatically by the API)
3. All required crew roles are filled: pilot, navigator, engineer, steward

NAVIGATION DICE (optional simulation):
Course plot — roll 2D6 + navDM, up to 3 attempts at targets 4, 6, 8
Drive check — roll 2D6 + engDM, need ≥ 4
If navigation fails all 3 attempts or drive fails: stay docked this turn
navDM = navigator's Navigation skill level + statDM(navigator's intelligence)
engDM = engineer's Engineering skill level + statDM(engineer's education)
statDM: 1-2→-2, 3-5→-1, 6-8→0, 9-11→+1, 12-14→+2, 15→+3
```

### TRADE_RULES

```
TRADE CODE DEMAND:
Different world types produce surpluses that sell well to worlds with different profiles.
The demand table below shows relative demand multipliers. Higher numbers = better profit.

Key trade code combinations that generate good profit:
- Ag (Agricultural) → In (Industrial): food and raw materials to factories
- In (Industrial) → Ag (Agricultural): manufactured goods to farming worlds
- Ri (Rich) → Po (Poor): luxury goods to struggling worlds  
- Hi (High Population) → Lo (Low Population): manufactured goods outward
- Ht (High Technology) → Lt (Low Technology): advanced tech to lower-tech worlds

SALE PRICE FORMULA:
salePricePerTon = max(0, (demandSum × 1000 + 5000) × (1 + techDelta))
where:
  demandSum = sum of DEMAND[sourceCode][targetCode] for all source/target code pairs
  techDelta = (originTL - currentWorldTL) × 0.1
  (positive techDelta = origin was higher tech = higher sale price here)

To find good trade routes:
1. Note the trade codes at the current world (from get_market's tradeCodes field)
2. Look at neighbouring worlds within 1 parsec (the ship's jump rating)
3. Choose a destination whose trade codes create high demand for the current world's codes
4. The exact sale price is calculated automatically when you call sell_cargo

WORLD DATA:
Full sector world data including hex coordinates and trade codes is available in the
ChartedSpace app's public files at: /data/galaxy/sectors/{ABBR}.json
These JSON files contain every world's hex, UWP, and trade codes (remarks field).
Sector abbreviations: Spin = Spinward Marches, Solo = Solomani Rim, Dene = Deneb, etc.

PURCHASE PRICING:
pricePerTon comes from get_market. It reflects the current world's trade codes and starport class.
Higher starport classes (A, B) and industrial worlds tend to charge more.
Agricultural worlds with lower TL tend to be cheaper to buy from.
```

### SALARY_TABLE

```
REQUIRED CREW FOR FREE TRADER:
All four roles must be filled to jump. Owner-operator fills one role (usually pilot).

Role       Required Skill   Base Salary   Salary at Skill-1   Salary at Skill-2
--------   ---------------  -----------   -----------------   -----------------
pilot      Pilot            Cr6,000       Cr7,000             Cr8,000
navigator  Navigation       Cr5,000       Cr6,000             Cr7,000
engineer   Engineering      Cr4,000       Cr5,000             Cr6,000
steward    Steward          Cr3,000       Cr4,000             Cr5,000

Optional roles (not required for jump):
gunner     Gunnery          Cr2,000       Cr3,000             Cr4,000
medic      Medical          Cr2,000       Cr3,000             Cr4,000

Total minimum monthly crew cost (all NPCs at skill-0): Cr18,000
Add mortgage: Cr150,920
Minimum monthly break-even: ~Cr168,920

CREW QUIT RISK:
If wages cannot be paid, each NPC rolls 2D6 each payment cycle.
- They quit if roll ≤ (unpaidTurns + 2)
- 0 missed payments: ~3% quit chance  (roll ≤ 2)
- 3 missed payments: ~28% quit chance (roll ≤ 5)
- 5 missed payments: ~58% quit chance (roll ≤ 7)
- 7 missed payments: ~72% quit chance (roll ≤ 9)
Quitting crew lose their role slot — the ship can no longer jump until replaced.
```

### TURN_LOOP_RULES

```
EACH TURN, EXECUTE IN THIS ORDER:

1. Call get_ship to observe current state
2. Call get_turn to know the turn number
3. Call get_characters to check captain's credits

IF STATUS = "in_jump":
  4. Call proceed_from_jump  (arrive at destination)
  5. If new currentTurn is even → call settle_wages
  6. Sell cargo if profitable (call sell_cargo for each lot)
  7. Assess next action

IF STATUS = "docked":
  4. Call get_market to see prices
  5. Decide: buy cargo? sell cargo? hire/fire crew? jump? remain?
  6. If jumping: choose destination, call jump_to
     If remaining: call remain_on_world
  7. If new currentTurn is even → call settle_wages

SETTLE_WAGES response handling:
- If quit[] is non-empty: crew left — hire replacements before next jump
- If unpaidCrew[] is non-empty: risk of crew leaving next cycle — prioritise profit
- If newCredits is negative: you are in debt — aggressive trading needed

STRATEGIC PRIORITIES:
1. Keep all 4 required roles filled (jump blocked otherwise)
2. Maintain credits ≥ Cr20,000 buffer (one monthly cost + one fuel)
3. Maximise cargo value per jump (buy low, sell to high-demand worlds)
4. Prefer jumping to worlds with complementary trade codes
5. If broke and docked: sell all cargo immediately even at a loss, then stay docked
   to avoid fuel cost while rebuilding credits
```

---

## Agent System Prompt

Use this as the system prompt when running a Claude agent against this MCP server:

```
You are the captain of a Free Trader spacecraft in the Classic Traveller universe.
You are playing ChartedSpace, a turn-based trading and navigation game.

Your goal is to survive and profit as a tramp freighter captain:
- Buy cargo cheaply at worlds that produce surplus goods
- Sell cargo at worlds that have high demand for those goods
- Pay your crew and mortgage every 2 turns or face crew desertion
- Keep all required crew roles filled (pilot, navigator, engineer, steward)
- Jump between star systems to find profitable trade routes

RULES OF PLAY:
- You can see the full game state via your tools
- Each action (remain or jump) advances the turn by 1
- Monthly costs (Cr150,920 mortgage + crew wages) deduct every even turn
- Jumping costs Cr10,000 in fuel, deducted automatically
- Cargo bought at one world sells for a price determined by trade code compatibility
- Your credits can go negative — this is dangerous, not fatal
- If you cannot jump (missing crew, no credits for fuel), stay docked and trade locally

TOOL USAGE SEQUENCE each turn:
1. get_ship → understand your situation
2. get_turn → know what turn it is
3. get_characters → check your credit balance
4. get_market (if docked) → see buy prices
5. Make a decision and act
6. settle_wages after any turn where the new turn number is even

Think step by step. State your reasoning before each action. Track your profit/loss.
Try to stay solvent. The game is lost if you have no ship (resign) — so avoid that.
```

---

## Configuration

### Claude Desktop (`claude_desktop_config.json`)

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "charted-space": {
      "command": "node",
      "args": ["/absolute/path/to/charted-space-mcp/dist/server.js"],
      "env": {
        "CHARTED_SPACE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or for development without building first, using `tsx`:
```json
{
  "mcpServers": {
    "charted-space": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/charted-space-mcp/src/server.ts"],
      "env": {
        "CHARTED_SPACE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Restart Claude Desktop after editing this file.

### Claude Code (`.mcp.json`)

Create `.mcp.json` in the root of any project where you want to use this server:

```json
{
  "mcpServers": {
    "charted-space": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/charted-space-mcp/src/server.ts"],
      "env": {
        "CHARTED_SPACE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or with a built server:
```json
{
  "mcpServers": {
    "charted-space": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/charted-space-mcp/dist/server.js"],
      "env": {
        "CHARTED_SPACE_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

## Verifying the Server Works

After configuring and restarting Claude:

1. Ask Claude: `"Use get_turn to check what turn we're on."`  
   Expected: returns `{ currentTurn: number }`

2. Ask Claude: `"Use get_ship to check the ship state."`  
   Expected: returns the full ship object with crew and cargo arrays.

3. Ask Claude: `"Use get_market to check prices at the current world."`  
   Expected: returns commodity price, trade codes, remaining capacity.
   (Will error if ship is in jump — that's correct.)

4. Ask Claude to run a full turn loop:  
   `"Play one full turn of ChartedSpace. Check the game state, decide what to do, and act."`

---

## Known Limitations

**Crew pool:** The browser app generates NPC crew from a 2,500-entry library (`crewLibrary.json`)
with randomised names. The MCP server bypasses this — the agent invents crew names and skill
levels directly. This is fine for autonomous play. If you want realistic names, copy the name
lists from `availableCrewSlice.ts` into the server and use them when calling hire_crew.

**Navigation dice:** The browser TurnCard performs navigation and jump drive checks with dice
before calling the API. The API does NOT enforce these checks — it accepts any jump request
as long as credits and crew are sufficient. For faithful Traveller rules, implement the dice
rolls in the MCP server before calling `jump_to`. See the TRAVELLER_RULES resource for formulas.

**World data:** The agent needs sector JSON files to find valid destinations within jump range.
These are at `public/data/galaxy/sectors/{ABBR}.json` in the ChartedSpace repo (or served at
`http://localhost:3000/data/galaxy/sectors/{ABBR}.json`). The server can fetch these via HTTP
to build a jump-range tool, or the agent can ask the user for destination hex and sector.

**Single player:** The game is single-player. DEV_MODE means all requests share one user
account. Do not run two agents simultaneously or they will corrupt each other's game state.
