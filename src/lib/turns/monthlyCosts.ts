import { onEndTurn } from "./handlers";

onEndTurn(async (ctx) => {
  if (ctx.currentTurn % 2 !== 0) return null;

  const owner = ctx.ship.crew.find(c => c.isOwnerOperator);
  if (!owner?.characterId) return null;

  const res = await fetch("/api/ship/crew/settle-wages", { method: "POST" });
  if (!res.ok) return null;

  const data = await res.json() as {
    total:       number;
    newCredits:  number;
    quit:        string[];
    unpaidCrew:  string[];
  };

  if (data.total === 0) return null;

  const lines: string[] = [
    `Monthly costs: Cr${data.total.toLocaleString()} deducted.`,
  ];

  if (data.quit.length > 0) {
    lines.push(`Crew quit (unpaid): ${data.quit.join(", ")}.`);
  }

  if (data.unpaidCrew.length > 0) {
    lines.push(`Still owed wages: ${data.unpaidCrew.join(", ")}.`);
  }

  if (data.newCredits < 0) {
    lines.push(`Running debt: Cr${Math.abs(data.newCredits).toLocaleString()}.`);
  }

  return {
    type: "world_event",
    description: lines.join(" "),
  };
});
