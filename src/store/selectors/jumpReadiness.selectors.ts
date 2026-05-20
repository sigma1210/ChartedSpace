import type { RootState } from "../index";
import shipTypes from "@/data/classic/ships.json";

export interface JumpReadiness {
  canJump: boolean;
  reasons: string[];
  fuelCost: number;
}

export const selectJumpReadiness = (state: RootState): JumpReadiness => {
  const ship       = state.ship.ship;
  const characters = state.characters.items;

  if (!ship || ship.status === "in_jump") {
    return { canJump: false, fuelCost: 0, reasons: [] };
  }

  const typeData     = (shipTypes as Array<{ type: string; fuelCostPerJump?: number; requiredCrew?: string[] }>)
    .find(s => s.type === ship.type);
  const fuelCost     = typeData?.fuelCostPerJump ?? 0;
  const requiredCrew = typeData?.requiredCrew ?? [];

  const reasons: string[] = [];

  // Required crew slots must all be filled
  for (const role of requiredCrew) {
    if (!ship.crew.find(c => c.role === role)) {
      const label = role.charAt(0).toUpperCase() + role.slice(1);
      reasons.push(`No ${label} assigned`);
    }
  }

  // Owner must be able to pay for fuel
  const owner     = ship.crew.find(c => c.isOwnerOperator);
  const ownerChar = owner?.characterId
    ? characters.find(c => c.id === owner.characterId)
    : null;

  if (fuelCost > 0) {
    const credits = ownerChar?.credits ?? 0;
    if (credits < fuelCost) {
      reasons.push(
        `Fuel costs Cr${fuelCost.toLocaleString()} (have Cr${credits.toLocaleString()})`,
      );
    }
  }

  return { canJump: reasons.length === 0, fuelCost, reasons };
};
