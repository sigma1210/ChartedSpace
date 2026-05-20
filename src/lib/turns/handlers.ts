import type { ShipSummary } from "@/store/slices/shipSlice";
import type { CharacterSummary } from "@/store/slices/characterSlice";

export interface TurnEventContext {
  currentTurn: number;
  previousStatus: "docked" | "in_jump";
  ship: ShipSummary;
  ownerCharacter: CharacterSummary | null;
}

export interface TurnEventResult {
  type: "world_event" | "space_event";
  description: string;
}

export type TurnEventHandler = (ctx: TurnEventContext) => Promise<TurnEventResult | null>;

const endTurnHandlers:       TurnEventHandler[] = [];
const startTurnHandlers:     TurnEventHandler[] = [];
const startJumpTurnHandlers: TurnEventHandler[] = [];

export const onEndTurn       = (h: TurnEventHandler) => { endTurnHandlers.push(h); };
export const onStartTurn     = (h: TurnEventHandler) => { startTurnHandlers.push(h); };
export const onStartJumpTurn = (h: TurnEventHandler) => { startJumpTurnHandlers.push(h); };

const fire = async (handlers: TurnEventHandler[], ctx: TurnEventContext): Promise<TurnEventResult[]> => {
  const results: TurnEventResult[] = [];
  for (const h of handlers) {
    const r = await h(ctx);
    if (r) results.push(r);
  }
  return results;
};

export const fireEndTurn       = (ctx: TurnEventContext) => fire(endTurnHandlers, ctx);
export const fireStartTurn     = (ctx: TurnEventContext) => fire(startTurnHandlers, ctx);
export const fireStartJumpTurn = (ctx: TurnEventContext) => fire(startJumpTurnHandlers, ctx);

// ─── Placeholder handlers ────────────────────────────────────────────────────

onStartTurn(async () => ({
  type: "world_event",
  description: "Nothing happens. The world continues its routine.",
}));

onStartJumpTurn(async () => ({
  type: "space_event",
  description: "The jump drive hums quietly. Space is uneventful.",
}));

onEndTurn(async (ctx) => {
  if (ctx.previousStatus !== "in_jump") return null;
  return {
    type: "space_event",
    description: "Nothing happens in the black.",
  };
});
