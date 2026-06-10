import type { ShipSummary } from "@/store/slices/shipSlice";
import type { CharacterSummary } from "@/store/slices/characterSlice";

export interface TurnEventContext {
  currentTurn: number;
  previousStatus: "docked" | "in_jump";
  ship: ShipSummary;
  ownerCharacter: CharacterSummary | null;
}

export interface LegacyMonthlyExpenseObservation {
  turn: number;
  total: number;
  newCredits: number;
  source: "legacy.monthlyCosts";
}

export interface TurnEventResultMetadata {
  legacyMonthlyExpenses?: LegacyMonthlyExpenseObservation;
}

export interface TurnEventResult {
  type: "world_event" | "space_event";
  description: string;
  metadata?: TurnEventResultMetadata;
}

export type TurnEventHandler = (ctx: TurnEventContext) => Promise<TurnEventResult | null>;

const endTurnHandlers:       Array<{ key?: string; handler: TurnEventHandler }> = [];
const startTurnHandlers:     Array<{ key?: string; handler: TurnEventHandler }> = [];
const startJumpTurnHandlers: Array<{ key?: string; handler: TurnEventHandler }> = [];

const register = (
  handlers: Array<{ key?: string; handler: TurnEventHandler }>,
  handler: TurnEventHandler,
  key?: string,
) => {
  if (key) {
    const index = handlers.findIndex((entry) => entry.key === key);
    if (index >= 0) {
      handlers[index] = { key, handler };
      return;
    }
  }
  handlers.push({ key, handler });
};

export const onEndTurn = (h: TurnEventHandler, key?: string) => {
  register(endTurnHandlers, h, key);
};
export const onStartTurn = (h: TurnEventHandler, key?: string) => {
  register(startTurnHandlers, h, key);
};
export const onStartJumpTurn = (h: TurnEventHandler, key?: string) => {
  register(startJumpTurnHandlers, h, key);
};

const fire = async (
  handlers: Array<{ handler: TurnEventHandler }>,
  ctx: TurnEventContext,
): Promise<TurnEventResult[]> => {
  const results: TurnEventResult[] = [];
  for (const { handler } of handlers) {
    const r = await handler(ctx);
    if (r) results.push(r);
  }
  return results;
};

export const fireEndTurn       = (ctx: TurnEventContext) => fire(endTurnHandlers, ctx);
export const fireStartTurn     = (ctx: TurnEventContext) => fire(startTurnHandlers, ctx);
export const fireStartJumpTurn = (ctx: TurnEventContext) => fire(startJumpTurnHandlers, ctx);

// ─── Placeholder handlers ────────────────────────────────────────────────────

onStartTurn(
  async () => ({
    type: "world_event",
    description: "Nothing happens. The world continues its routine.",
  }),
  "default:start-turn",
);

onStartJumpTurn(
  async () => ({
    type: "space_event",
    description: "The jump drive hums quietly. Space is uneventful.",
  }),
  "default:start-jump-turn",
);

onEndTurn(
  async (ctx) => {
    if (ctx.previousStatus !== "in_jump") return null;
    return {
      type: "space_event",
      description: "Nothing happens in the black.",
    };
  },
  "default:end-jump-turn",
);
