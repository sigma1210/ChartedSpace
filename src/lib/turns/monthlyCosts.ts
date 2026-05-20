import { onEndTurn } from "./handlers";
import shipTypes from "@/data/classic/ships.json";

onEndTurn(async (ctx) => {
  if (ctx.currentTurn % 2 !== 0) return null;

  const owner = ctx.ship.crew.find(c => c.isOwnerOperator);
  if (!owner?.characterId || !ctx.ownerCharacter) return null;

  const typeData = (shipTypes as Array<{ type: string; monthlyMortgage?: number }>)
    .find(s => s.type === ctx.ship.type);

  const mortgage = ctx.ship.isMortgaged ? (typeData?.monthlyMortgage ?? 0) : 0;
  const salaries = ctx.ship.crew.reduce((sum, c) => sum + c.monthlySalary, 0);
  const total    = mortgage + salaries;

  if (total === 0) return null;

  const newCredits = Math.max(0, ctx.ownerCharacter.credits - total);

  await fetch(`/api/characters/${owner.characterId}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ credits: newCredits }),
  });

  const parts: string[] = [];
  if (mortgage > 0) parts.push(`mortgage Cr${mortgage.toLocaleString()}`);
  if (salaries > 0) parts.push(`crew salaries Cr${salaries.toLocaleString()}`);

  return {
    type: "world_event",
    description: `Monthly costs deducted: Cr${total.toLocaleString()} (${parts.join(", ")})`,
  };
});
